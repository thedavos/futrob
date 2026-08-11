import {
  asActorId,
  asCompetitionId,
  asOrganizationId,
  asTeamId,
  type AuthorizationPort,
  type DomainEvent,
} from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import type { FixturePlan } from "../domain/entities/fixture-plan.ts";
import { generateFixturePlan } from "../domain/policies/generate-fixture-plan.ts";
import { EditFixtureEncounterUseCase } from "./edit-fixture-encounter.use-case.ts";

const organizationId = asOrganizationId("org-1");
const competitionId = asCompetitionId("competition-1");
const seed = [asTeamId("team-a"), asTeamId("team-b")];
const original = generateFixturePlan({
  organizationId,
  competitionId,
  generationVersion: 1,
  rulesVersion: 1,
  format: "league",
  timeZone: "America/Lima",
  startsAt: new Date("2026-09-01T01:00:00.000Z"),
  roundIntervalDays: 7,
  officialMatchCounts: { regular: 1, knockout: 2 },
  seed,
  homeAndAway: false,
});

function authorization(allowed = true): AuthorizationPort {
  return {
    decide: async (request) => ({ ...request, allowed, reason: allowed ? "allowed" : "denied" }),
    getEffectiveAccess: async (input) => ({ ...input, roles: [], permissions: [] }),
  };
}

describe("EditFixtureEncounterUseCase", () => {
  it("reschedules a pending encounter and records one audit entry", async () => {
    let stored = original;
    const audits: unknown[] = [];
    const events: DomainEvent[] = [];
    const encounter = original.stages[0]?.rounds[0]?.encounters[0];
    expect(encounter).toBeDefined();
    if (!encounter) return;
    const useCase = new EditFixtureEncounterUseCase({
      authorization: authorization(),
      audit: { append: async (entry) => void audits.push(entry) },
      clock: { now: () => new Date("2026-08-11T22:00:00.000Z") },
      editGuard: { canEdit: async () => true },
      eventPublisher: {
        publish: async (event) => void events.push(event),
        publishMany: async (batch) => void events.push(...batch),
      },
      fixtures: {
        findById: async () => stored,
        update: async (plan) => {
          stored = plan;
          return plan;
        },
      },
      source: {
        load: async () => ({
          organizationId,
          competitionId,
          status: "published",
          format: "league",
          timeZone: "America/Lima",
          rulesVersion: 1,
          officialMatchCounts: { regular: 1, knockout: 2 },
          approvedParticipants: seed,
        }),
      },
      transaction: { runInTransaction: async (operation) => operation() },
    });

    const changed = await useCase.execute({
      actorId: asActorId("staff-1"),
      organizationId,
      competitionId,
      fixturePlanId: original.id,
      encounterId: encounter.id,
      scheduledStartAt: new Date("2026-09-02T01:00:00.000Z"),
      reason: "Broadcast window",
      requestId: "request-1",
    });
    const replay = await useCase.execute({
      actorId: asActorId("staff-1"),
      organizationId,
      competitionId,
      fixturePlanId: original.id,
      encounterId: encounter.id,
      scheduledStartAt: new Date("2026-09-02T01:00:00.000Z"),
      reason: "Broadcast window",
      requestId: "request-1",
    });

    expect(changed.isOk()).toBe(true);
    expect(replay.isOk()).toBe(true);
    expect(audits).toHaveLength(1);
    expect(events.map((event) => event.eventName)).toEqual(["scheduling.encounter-rescheduled"]);
  });

  it("rejects an encounter with official results", async () => {
    const encounter = original.stages[0]?.rounds[0]?.encounters[0];
    expect(encounter).toBeDefined();
    if (!encounter) return;
    const result = await new EditFixtureEncounterUseCase({
      authorization: authorization(),
      audit: { append: async () => {} },
      clock: { now: () => new Date("2026-08-11T22:00:00.000Z") },
      editGuard: { canEdit: async () => false },
      eventPublisher: { publish: async () => {}, publishMany: async () => {} },
      fixtures: { findById: async () => original, update: async () => original },
      source: { load: async () => null },
      transaction: { runInTransaction: async (operation) => operation() },
    }).execute({
      actorId: asActorId("staff-1"),
      organizationId,
      competitionId,
      fixturePlanId: original.id,
      encounterId: encounter.id,
      scheduledStartAt: new Date("2026-09-02T01:00:00.000Z"),
      reason: "Too late",
      requestId: "request-2",
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) return;
    expect(result.error.code).toBe("scheduling.fixture_encounter_not_editable");
  });
});
