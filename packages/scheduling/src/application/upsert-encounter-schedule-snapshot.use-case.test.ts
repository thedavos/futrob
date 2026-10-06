import {
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOfficialMatchSlotId,
  asOrganizationId,
  asTeamId,
  type AuthorizationPort,
} from "@futrob/shared-kernel";
import { unwrapErr } from "@futrob/test-support";
import { describe, expect, it } from "vite-plus/test";
import { asFixtureStageId } from "../domain/entities/fixture-plan.ts";
import type { EncounterScheduleSnapshot } from "../domain/entities/encounter-schedule-snapshot.ts";
import type { OfficialMatch } from "../domain/entities/official-match.ts";
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
  async findNextUpcomingByTeamIds() {
    return null;
  }
}

const snapshot: EncounterScheduleSnapshot = {
  encounterId: asEncounterId("encounter-1"),
  organizationId: asOrganizationId("org-1"),
  competitionId: asCompetitionId("competition-1"),
  stageId: asFixtureStageId("stage-1"),
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

function slotDeps(matches: OfficialMatch[] = []) {
  return {
    matches: {
      listByEncounter: async () => matches,
      saveSchedules: async (saved: readonly OfficialMatch[]) => {
        for (const match of saved) {
          const index = matches.findIndex((row) => row.slot === match.slot);
          if (index !== -1) matches[index] = match;
        }
      },
    },
    transaction: { runInTransaction: <T>(run: () => Promise<T>) => run() },
  };
}

describe("UpsertEncounterScheduleSnapshotUseCase", () => {
  it("persists the projection used by authorization and results", async () => {
    const encounters = new Encounters();
    const result = await new UpsertEncounterScheduleSnapshotUseCase({
      ...slotDeps(),
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
      ...slotDeps(),
      encounters: new Encounters(),
      fixtureOwnership: independentEncounter,
      authorization: authorization(false),
      participants: participants(),
    }).execute({ actorId: asActorId("player-1"), snapshot });

    expect(unwrapErr(result).code).toBe("authorization.forbidden");
  });

  it("does not reparent an existing encounter to another tenant", async () => {
    const encounters = new Encounters();
    await encounters.upsert(snapshot);
    const result = await new UpsertEncounterScheduleSnapshotUseCase({
      ...slotDeps(),
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
      ...slotDeps(),
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
      ...slotDeps(),
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
      ...slotDeps(),
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

  it("moves stored slots by the same delta when an existing Encounter start changes", async () => {
    const encounters = new Encounters();
    await encounters.upsert(snapshot);
    const slot = (number: 1 | 2, at: string): OfficialMatch => ({
      id: asOfficialMatchSlotId(`encounter-1:official-match:${number}`),
      encounterId: snapshot.encounterId,
      organizationId: snapshot.organizationId,
      competitionId: snapshot.competitionId,
      slot: number,
      status: "scheduled",
      scheduledStartAt: new Date(at),
      createdAt: new Date("2026-08-01T00:00:00.000Z"),
    });
    const matches = [slot(1, "2026-08-10T20:00:00.000Z"), slot(2, "2026-08-10T21:00:00.000Z")];

    const result = await new UpsertEncounterScheduleSnapshotUseCase({
      ...slotDeps(matches),
      encounters,
      fixtureOwnership: independentEncounter,
      authorization: authorization(true),
      participants: participants(),
    }).execute({
      actorId: asActorId("staff-1"),
      snapshot: { ...snapshot, scheduledStartAt: new Date("2026-08-11T20:00:00.000Z") },
    });

    expect(result.isOk()).toBe(true);
    expect(matches.map((row) => [row.slot, row.scheduledStartAt.toISOString()])).toEqual([
      [1, "2026-08-11T20:00:00.000Z"],
      [2, "2026-08-11T21:00:00.000Z"],
    ]);
  });
});
