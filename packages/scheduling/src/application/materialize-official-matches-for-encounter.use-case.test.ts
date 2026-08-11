import {
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  asTeamId,
  type AuthorizationPort,
  type EncounterId,
} from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import type { EncounterScheduleSnapshot } from "../domain/entities/encounter-schedule-snapshot.ts";
import type { OfficialMatch } from "../domain/entities/official-match.ts";
import type { EncounterScheduleRepository } from "../domain/ports/encounter-schedule.repository.ts";
import type { OfficialMatchRepository } from "../domain/ports/official-match.repository.ts";
import { MaterializeOfficialMatchesForEncounterUseCase } from "./materialize-official-matches-for-encounter.use-case.ts";

class EncounterSchedules implements EncounterScheduleRepository {
  constructor(private readonly snapshot: EncounterScheduleSnapshot | null) {}

  async findById(encounterId: EncounterId) {
    return this.snapshot?.encounterId === encounterId ? this.snapshot : null;
  }

  async upsert(snapshot: EncounterScheduleSnapshot) {
    return snapshot;
  }
}

class OfficialMatches implements OfficialMatchRepository {
  readonly rows = new Map<string, OfficialMatch>();

  async listByEncounter(encounterId: EncounterId) {
    return [...this.rows.values()].filter((match) => match.encounterId === encounterId);
  }

  async upsertMany(matches: readonly OfficialMatch[]) {
    for (const match of matches) {
      const key = `${match.encounterId}:${match.slot}`;
      if (!this.rows.has(key)) this.rows.set(key, match);
    }
  }
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

const authorization: AuthorizationPort = {
  decide: async (request) => ({ ...request, allowed: true, reason: "allowed" }),
  getEffectiveAccess: async (input) => ({ ...input, roles: [], permissions: [] }),
};

describe("MaterializeOfficialMatchesForEncounterUseCase", () => {
  it("materializes two stable official matches when the schedule requires two", async () => {
    const matches = new OfficialMatches();
    let sequence = 0;
    const useCase = new MaterializeOfficialMatchesForEncounterUseCase({
      authorization,
      clock: { now: () => new Date("2026-08-11T07:00:00.000Z") },
      encounters: new EncounterSchedules(snapshot),
      ids: { generate: () => `official-match-${++sequence}` },
      matches,
    });

    const first = await useCase.execute({
      actorId: asActorId("staff-1"),
      encounterId: snapshot.encounterId,
      organizationId: snapshot.organizationId,
    });
    const second = await useCase.execute({
      actorId: asActorId("staff-1"),
      encounterId: snapshot.encounterId,
      organizationId: snapshot.organizationId,
    });

    expect(first.isOk()).toBe(true);
    expect(second.isOk()).toBe(true);
    if (first.isErr() || second.isErr()) return;
    expect(first.value).toHaveLength(2);
    expect(first.value.map(({ id, slot }) => ({ id, slot }))).toEqual([
      { id: "official-match-1", slot: 1 },
      { id: "official-match-2", slot: 2 },
    ]);
    expect(second.value.map(({ id, slot }) => ({ id, slot }))).toEqual(
      first.value.map(({ id, slot }) => ({ id, slot })),
    );
    expect(matches.rows.size).toBe(2);
  });

  it("returns a tagged error when the encounter schedule is missing", async () => {
    const matches = new OfficialMatches();
    const result = await new MaterializeOfficialMatchesForEncounterUseCase({
      authorization,
      clock: { now: () => new Date("2026-08-11T07:00:00.000Z") },
      encounters: new EncounterSchedules(null),
      ids: { generate: () => "unused" },
      matches,
    }).execute({
      actorId: asActorId("staff-1"),
      encounterId: snapshot.encounterId,
      organizationId: snapshot.organizationId,
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) return;
    expect(result.error.code).toBe("scheduling.encounter_schedule_not_found");
    expect(matches.rows.size).toBe(0);
  });
});
