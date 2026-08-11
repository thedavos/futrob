import {
  asActorId,
  asCompetitionId,
  asOrganizationId,
  asTeamId,
  type AuthorizationPort,
  type DomainEvent,
} from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import type { FixtureAuditEntry } from "../domain/ports/fixture-editing.ports.ts";
import { generateFixturePlan } from "../domain/policies/generate-fixture-plan.ts";
import { EditFixtureEncounterUseCase } from "./edit-fixture-encounter.use-case.ts";

const organizationId = asOrganizationId("org-1");
const competitionId = asCompetitionId("competition-1");
const seed = [asTeamId("team-a"), asTeamId("team-b"), asTeamId("team-c")];
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

function createUseCase(input: {
  readonly plan?: FixturePlan;
  readonly audits?: FixtureAuditEntry[];
  readonly events?: DomainEvent[];
  readonly canEdit?: boolean;
}) {
  let stored = input.plan ?? original;
  const audits = input.audits ?? [];
  const events = input.events ?? [];
  return {
    get stored() {
      return stored;
    },
    audits,
    events,
    useCase: new EditFixtureEncounterUseCase({
      authorization: authorization(),
      audit: {
        findByRequestId: async (_organizationId, _competitionId, requestId) =>
          audits.find((entry) => entry.requestId === requestId) ?? null,
        append: async (entry) => void audits.push(entry),
      },
      clock: { now: () => new Date("2026-08-11T22:00:00.000Z") },
      editGuard: { canEdit: async () => input.canEdit ?? true },
      eventPublisher: {
        publish: async (event) => void events.push(event),
        publishMany: async (batch) => void events.push(...batch),
      },
      fixtures: {
        findById: async () => stored,
        update: async (plan) => {
          if (plan.revision !== stored.revision + 1) return null;
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
    }),
  };
}

describe("EditFixtureEncounterUseCase", () => {
  it("reschedules a pending encounter, bumps revision, and records one audit entry", async () => {
    const encounter = original.stages[0]?.rounds[0]?.encounters[0];
    expect(encounter).toBeDefined();
    if (!encounter) return;
    const harness = createUseCase({});

    const changed = await harness.useCase.execute({
      actorId: asActorId("staff-1"),
      organizationId,
      competitionId,
      fixturePlanId: original.id,
      encounterId: encounter.id,
      scheduledStartAt: new Date("2026-09-02T01:00:00.000Z"),
      reason: "Broadcast window",
      requestId: "request-1",
    });
    const replay = await harness.useCase.execute({
      actorId: asActorId("staff-1"),
      organizationId,
      competitionId,
      fixturePlanId: original.id,
      encounterId: encounter.id,
      scheduledStartAt: new Date("2026-09-03T01:00:00.000Z"),
      reason: "Conflicting retry payload",
      requestId: "request-1",
    });

    expect(changed.isOk()).toBe(true);
    expect(replay.isOk()).toBe(true);
    expect(replay.isOk() && replay.value.scheduledStartAt.toISOString()).toBe(
      "2026-09-02T01:00:00.000Z",
    );
    expect(harness.audits).toHaveLength(1);
    expect(harness.stored.revision).toBe(2);
    expect(harness.events.map((event) => event.eventName)).toEqual([
      "scheduling.encounter-rescheduled",
    ]);
  });

  it("rejects team-vs-bye reschedules that collide with another encounter", async () => {
    const firstRound = original.stages[0]?.rounds[0];
    const secondRound = original.stages[0]?.rounds[1];
    const byeEncounter = firstRound?.encounters.find(
      (encounter) => encounter.home.kind === "bye" || encounter.away.kind === "bye",
    );
    expect(byeEncounter).toBeDefined();
    expect(secondRound).toBeDefined();
    if (!byeEncounter || !secondRound) return;
    const byeTeamId =
      byeEncounter.home.kind === "team"
        ? byeEncounter.home.teamId
        : byeEncounter.away.kind === "team"
          ? byeEncounter.away.teamId
          : null;
    expect(byeTeamId).toBeTruthy();
    const laterWithSameTeam = secondRound.encounters.find(
      (encounter) =>
        (encounter.home.kind === "team" && encounter.home.teamId === byeTeamId) ||
        (encounter.away.kind === "team" && encounter.away.teamId === byeTeamId),
    );
    expect(laterWithSameTeam).toBeDefined();
    if (!laterWithSameTeam) return;
    const harness = createUseCase({});

    const result = await harness.useCase.execute({
      actorId: asActorId("staff-1"),
      organizationId,
      competitionId,
      fixturePlanId: original.id,
      encounterId: byeEncounter.id,
      scheduledStartAt: laterWithSameTeam.scheduledStartAt,
      reason: "Overlap",
      requestId: "request-bye-collision",
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) return;
    expect(result.error.code).toBe("scheduling.invalid_fixture_configuration");
    expect(harness.audits).toHaveLength(0);
  });

  it("rejects pairing edits that replace placeholder slots", async () => {
    const knockout = generateFixturePlan({
      organizationId,
      competitionId,
      generationVersion: 1,
      rulesVersion: 1,
      format: "knockout",
      timeZone: "America/Lima",
      startsAt: new Date("2026-09-01T01:00:00.000Z"),
      roundIntervalDays: 7,
      officialMatchCounts: { regular: 1, knockout: 2 },
      seed: [asTeamId("team-a"), asTeamId("team-b"), asTeamId("team-c")],
      homeAndAway: false,
    });
    const placeholder = knockout.stages[0]?.rounds[0]?.encounters.find(
      (encounter) => encounter.home.kind === "bye" || encounter.away.kind === "bye",
    );
    expect(placeholder).toBeDefined();
    if (!placeholder) return;
    const harness = createUseCase({ plan: knockout });

    const result = await harness.useCase.execute({
      actorId: asActorId("staff-1"),
      organizationId,
      competitionId,
      fixturePlanId: knockout.id,
      encounterId: placeholder.id,
      homeTeamId: asTeamId("team-a"),
      awayTeamId: asTeamId("team-b"),
      reason: "Manual pairing",
      requestId: "request-placeholder",
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) return;
    expect(result.error.code).toBe("scheduling.invalid_fixture_configuration");
  });

  it("rejects an encounter with official results", async () => {
    const encounter = original.stages[0]?.rounds[0]?.encounters[0];
    expect(encounter).toBeDefined();
    if (!encounter) return;
    const harness = createUseCase({ canEdit: false });
    const result = await harness.useCase.execute({
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
