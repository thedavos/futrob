import {
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  asTeamId,
  type AuthorizationPort,
} from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import type { EncounterScheduleSnapshot } from "../domain/entities/encounter-schedule-snapshot.ts";
import type { EncounterScheduleRepository } from "../domain/ports/encounter-schedule.repository.ts";
import { UpsertEncounterScheduleSnapshotUseCase } from "./upsert-encounter-schedule-snapshot.use-case.ts";

class Encounters implements EncounterScheduleRepository {
  readonly rows = new Map<string, EncounterScheduleSnapshot>();
  async findById(id: ReturnType<typeof asEncounterId>) {
    return this.rows.get(id) ?? null;
  }
  async upsert(snapshot: EncounterScheduleSnapshot) {
    this.rows.set(snapshot.encounterId, snapshot);
    return snapshot;
  }

  async deleteByEncounterIds() {}
}

const snapshot: EncounterScheduleSnapshot = {
  encounterId: asEncounterId("encounter-1"),
  organizationId: asOrganizationId("org-1"),
  competitionId: asCompetitionId("competition-1"),
  homeTeamId: asTeamId("home-1"),
  awayTeamId: asTeamId("away-1"),
  scheduledStartAt: new Date("2026-08-10T20:00:00.000Z"),
  officialMatchCount: 2,
};

function authorization(allowed: boolean): AuthorizationPort {
  return {
    decide: async (request) => ({ ...request, allowed, reason: allowed ? "allowed" : "denied" }),
    getEffectiveAccess: async (input) => ({ ...input, roles: [], permissions: [] }),
  };
}

function participants(approvedTeamIds: readonly string[] = ["home-1", "away-1"]) {
  return {
    isApprovedParticipant: async ({ teamId }: { readonly teamId: string }) =>
      approvedTeamIds.includes(teamId),
  };
}

const independentEncounter = { containsEncounter: async () => false };

describe("UpsertEncounterScheduleSnapshotUseCase", () => {
  it("persists the projection used by authorization and results", async () => {
    const encounters = new Encounters();
    const result = await new UpsertEncounterScheduleSnapshotUseCase({
      encounters,
      fixtureOwnership: independentEncounter,
      authorization: authorization(true),
      participants: participants(),
    }).execute({ actorId: asActorId("staff-1"), snapshot });

    expect(result.isOk()).toBe(true);
    expect(await encounters.findById(snapshot.encounterId)).toEqual(snapshot);
  });

  it("rejects an unauthorized producer", async () => {
    const result = await new UpsertEncounterScheduleSnapshotUseCase({
      encounters: new Encounters(),
      fixtureOwnership: independentEncounter,
      authorization: authorization(false),
      participants: participants(),
    }).execute({ actorId: asActorId("player-1"), snapshot });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error.code).toBe("authorization.forbidden");
  });

  it("does not reparent an existing encounter to another tenant", async () => {
    const encounters = new Encounters();
    await encounters.upsert(snapshot);
    const result = await new UpsertEncounterScheduleSnapshotUseCase({
      encounters,
      fixtureOwnership: independentEncounter,
      authorization: authorization(true),
      participants: participants(),
    }).execute({
      actorId: asActorId("foreign-staff"),
      snapshot: { ...snapshot, organizationId: asOrganizationId("org-2") },
    });

    expect(result.isErr()).toBe(true);
    expect((await encounters.findById(snapshot.encounterId))?.organizationId).toBe(
      snapshot.organizationId,
    );
  });

  it("rejects a Team owned by another tenant", async () => {
    const result = await new UpsertEncounterScheduleSnapshotUseCase({
      encounters: new Encounters(),
      fixtureOwnership: independentEncounter,
      authorization: authorization(true),
      participants: participants(["home-1"]),
    }).execute({ actorId: asActorId("staff-1"), snapshot });

    expect(result.isErr()).toBe(true);
  });

  it("rejects a Team that is not an approved competition participant", async () => {
    const unapproved = { ...snapshot, awayTeamId: asTeamId("pending-team") };
    const result = await new UpsertEncounterScheduleSnapshotUseCase({
      encounters: new Encounters(),
      fixtureOwnership: independentEncounter,
      authorization: authorization(true),
      participants: participants(["home-1"]),
    }).execute({ actorId: asActorId("staff-1"), snapshot: unapproved });

    expect(result.isErr()).toBe(true);
  });

  it("rejects the legacy snapshot writer for a fixture-managed encounter", async () => {
    const encounters = new Encounters();
    const result = await new UpsertEncounterScheduleSnapshotUseCase({
      encounters,
      fixtureOwnership: { containsEncounter: async () => true },
      authorization: authorization(true),
      participants: participants(),
    }).execute({ actorId: asActorId("staff-1"), snapshot });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) return;
    expect(result.error.code).toBe("scheduling.fixture_managed_conflict");
    expect(await encounters.findById(snapshot.encounterId)).toBeNull();
  });
});
