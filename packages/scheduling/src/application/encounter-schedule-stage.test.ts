import {
  asActorId,
  asCompetitionId,
  asOrganizationId,
  asTeamId,
  type AuthorizationPort,
  type DomainEvent,
  type EncounterId,
} from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import type { EncounterScheduleSnapshot } from "../domain/entities/encounter-schedule-snapshot.ts";
import type { FixturePlan } from "../domain/entities/fixture-plan.ts";
import type { OfficialMatch } from "../domain/entities/official-match.ts";
import type { EncounterCreatedEvent } from "../domain/events/encounter-created.event.ts";
import type { EncounterScheduleRepository } from "../domain/ports/encounter-schedule.repository.ts";
import type {
  CompetitionFixtureSourcePort,
  FixturePlanRepository,
} from "../domain/ports/fixture-plan.repository.ts";
import type { OfficialMatchRepository } from "../domain/ports/official-match.repository.ts";
import { GenerateCompetitionFixtureUseCase } from "./generate-competition-fixture.use-case.ts";

const organizationId = asOrganizationId("org-1");
const competitionId = asCompetitionId("competition-1");

function sourceSnapshot(format: "league-playoffs" | "knockout") {
  return {
    organizationId,
    competitionId,
    status: "published" as const,
    format,
    timeZone: "America/Lima",
    rulesVersion: 1,
    officialMatchCounts: { regular: 2 as const, knockout: 1 as const },
    resolutionModes: {
      regular: "independent_matches" as const,
      knockout: "aggregate_score" as const,
    },
    approvedParticipants: [
      asTeamId("team-a"),
      asTeamId("team-b"),
      asTeamId("team-c"),
      asTeamId("team-d"),
    ],
  };
}

class FixturePlans implements FixturePlanRepository {
  readonly rows = new Map<string, FixturePlan>();

  async findById() {
    return null;
  }

  async findByGenerationVersion() {
    return null;
  }

  async listActive() {
    return [];
  }

  async save(plan: FixturePlan) {
    this.rows.set(plan.id, plan);
    return { plan, created: true } as const;
  }

  async updateEncounter() {
    return null;
  }

  async markSuperseded() {}

  async containsEncounter() {
    return false;
  }
}

class Snapshots implements EncounterScheduleRepository {
  readonly rows = new Map<EncounterId, EncounterScheduleSnapshot>();
  async findById(encounterId: EncounterId) {
    return this.rows.get(encounterId) ?? null;
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

class Matches implements OfficialMatchRepository {
  async listByEncounter() {
    return [] satisfies OfficialMatch[];
  }
  async upsertMany() {}
  async voidByEncounterIds() {}
}

function authorization(): AuthorizationPort {
  return {
    decide: async (request) => ({ ...request, allowed: true, reason: "allowed" }),
    getEffectiveAccess: async (input) => ({ ...input, roles: [], permissions: [] }),
  };
}

async function generate(format: "league-playoffs" | "knockout") {
  const snapshots = new Snapshots();
  const events: DomainEvent[] = [];
  const fixtures = new FixturePlans();
  const source: CompetitionFixtureSourcePort = {
    load: async () => sourceSnapshot(format),
  };
  const result = await new GenerateCompetitionFixtureUseCase({
    authorization: authorization(),
    clock: { now: () => new Date("2026-08-11T22:00:00.000Z") },
    encounters: snapshots,
    eventPublisher: {
      publish: async (event) => {
        events.push(event);
      },
      publishMany: async (batch) => {
        events.push(...batch);
      },
    },
    fixtures,
    matches: new Matches(),
    occupancy: { hasApprovedOfficialResult: async () => false },
    source,
    transaction: { runInTransaction: async (operation) => operation() },
  }).execute({
    actorId: asActorId("staff-1"),
    organizationId,
    competitionId,
    generationVersion: 1,
    startsAt: new Date("2026-09-01T01:00:00.000Z"),
    roundIntervalDays: 7,
    homeAndAway: true,
    playoffs: format === "league-playoffs" ? { teamCount: 4 } : undefined,
    requestId: "request-stage",
  });
  expect(result.isOk()).toBe(true);
  if (result.isErr()) throw result.error;
  return { plan: result.value, snapshots, events };
}

describe("encounter schedule stage", () => {
  it("stage-regular-playoffs-league-leg", async () => {
    const { plan, snapshots } = await generate("league-playoffs");
    const league = plan.stages.find((stage) => stage.kind === "league");
    expect(league).toBeDefined();
    const leagueEncounter = league?.rounds[0]?.encounters.find(
      (encounter) => encounter.home.kind === "team" && encounter.away.kind === "team",
    );
    expect(leagueEncounter).toBeDefined();
    if (!league || !leagueEncounter) return;
    expect(await snapshots.findById(leagueEncounter.id)).toMatchObject({
      stageId: league.id,
      officialMatchCount: 2,
    });
  });

  it("stage-playoff-encounter", async () => {
    const { plan, snapshots } = await generate("knockout");
    const knockout = plan.stages.find((stage) => stage.kind === "knockout");
    expect(knockout).toBeDefined();
    const playoffEncounter = knockout?.rounds[0]?.encounters.find(
      (encounter) => encounter.home.kind === "team" && encounter.away.kind === "team",
    );
    expect(playoffEncounter).toBeDefined();
    if (!knockout || !playoffEncounter) return;
    expect(await snapshots.findById(playoffEncounter.id)).toMatchObject({
      stageId: knockout.id,
    });
  });

  it("stage-not-only-on-event", async () => {
    const { plan, snapshots, events } = await generate("league-playoffs");
    const created = events.filter(
      (event): event is EncounterCreatedEvent => event.eventName === "scheduling.encounter-created",
    );
    expect(created.length).toBeGreaterThan(0);
    for (const event of created) {
      const encounter = plan.stages
        .flatMap((stage) => stage.rounds.flatMap((round) => round.encounters))
        .find((item) => item.id === event.payload.encounterId);
      expect(encounter).toBeDefined();
      if (!encounter) return;
      const snapshot = await snapshots.findById(encounter.id);
      expect(snapshot?.stageId).toBe(event.payload.stageId);
      expect(snapshot?.stageId).toBeTruthy();
    }
    const leftover = plan.stages
      .flatMap((stage) => stage.rounds.flatMap((round) => round.encounters))
      .find((encounter) => encounter.home.kind === "team" && encounter.away.kind === "team");
    expect(leftover).toBeDefined();
    if (!leftover) return;
    expect((await snapshots.findById(leftover.id))?.stageId).toBe(leftover.stageId);
  });
});
