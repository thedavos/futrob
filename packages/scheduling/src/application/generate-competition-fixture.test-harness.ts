import {
  asActorId,
  asCompetitionId,
  asOrganizationId,
  asTeamId,
  type AuthorizationPort,
  type DomainEvent,
  type EncounterId,
} from "@futrob/shared-kernel";
import type { EncounterScheduleSnapshot } from "../domain/entities/encounter-schedule-snapshot.ts";
import type { FixturePlan } from "../domain/entities/fixture-plan.ts";
import type { OfficialMatch } from "../domain/entities/official-match.ts";
import type { EncounterScheduleRepository } from "../domain/ports/encounter-schedule.repository.ts";
import type {
  CompetitionFixtureSourcePort,
  CompetitionFixtureSourceSnapshot,
  FixturePlanRepository,
} from "../domain/ports/fixture-plan.repository.ts";
import type { OfficialMatchRepository } from "../domain/ports/official-match.repository.ts";
import { GenerateCompetitionFixtureUseCase } from "./generate-competition-fixture.use-case.ts";

export const sourceSnapshot: CompetitionFixtureSourceSnapshot = {
  organizationId: asOrganizationId("org-1"),
  competitionId: asCompetitionId("competition-1"),
  status: "published",
  format: "league",
  timeZone: "America/Lima",
  rulesVersion: 2,
  officialMatchCounts: { regular: 1, knockout: 2 },
  resolutionModes: {
    regular: "independent_matches",
    knockout: "aggregate_score",
  },
  approvedParticipants: [asTeamId("team-a"), asTeamId("team-b")],
};

export class FixturePlans implements FixturePlanRepository {
  readonly rows = new Map<string, FixturePlan>();
  saves = 0;

  async findById(organizationId: string, competitionId: string, fixturePlanId: string) {
    const plan = this.rows.get(fixturePlanId) ?? null;
    return plan?.organizationId === organizationId && plan.competitionId === competitionId
      ? plan
      : null;
  }

  async findByGenerationVersion(
    organizationId: string,
    competitionId: string,
    generationVersion: number,
  ) {
    return (
      [...this.rows.values()].find(
        (plan) =>
          plan.organizationId === organizationId &&
          plan.competitionId === competitionId &&
          plan.generationVersion === generationVersion,
      ) ?? null
    );
  }

  async listActive(organizationId: string, competitionId: string) {
    return [...this.rows.values()].filter(
      (plan) =>
        plan.organizationId === organizationId &&
        plan.competitionId === competitionId &&
        plan.status === "active",
    );
  }

  async save(plan: FixturePlan) {
    const existing = await this.findByGenerationVersion(
      plan.organizationId,
      plan.competitionId,
      plan.generationVersion,
    );
    if (existing) return { plan: existing, created: false } as const;
    this.rows.set(plan.id, plan);
    this.saves += 1;
    return { plan, created: true } as const;
  }

  async updateEncounter() {
    return null;
  }

  async markSuperseded(organizationId: string, competitionId: string, exceptPlanId: string) {
    for (const [id, plan] of this.rows) {
      if (
        plan.organizationId === organizationId &&
        plan.competitionId === competitionId &&
        plan.id !== exceptPlanId &&
        plan.status === "active"
      ) {
        this.rows.set(id, { ...plan, status: "superseded" });
      }
    }
  }

  async containsEncounter() {
    return false;
  }
}

export class Snapshots implements EncounterScheduleRepository {
  readonly rows = new Map<EncounterId, EncounterScheduleSnapshot>();
  async findById(encounterId: EncounterId) {
    return this.rows.get(encounterId) ?? null;
  }
  async upsert(snapshot: EncounterScheduleSnapshot) {
    this.rows.set(snapshot.encounterId, snapshot);
    return snapshot;
  }
  async deleteByEncounterIds(encounterIds: readonly EncounterId[]) {
    for (const encounterId of encounterIds) this.rows.delete(encounterId);
  }
  async findNextUpcomingByTeamIds() {
    return null;
  }
}

export class Matches implements OfficialMatchRepository {
  readonly rows: OfficialMatch[] = [];
  async listByEncounter(encounterId: EncounterId) {
    return this.rows.filter((match) => match.encounterId === encounterId);
  }
  async upsertMany(matches: readonly OfficialMatch[]) {
    this.rows.push(...matches);
  }
  async voidByEncounterIds(encounterIds: readonly EncounterId[]) {
    const ids = new Set(encounterIds);
    for (const [index, match] of this.rows.entries()) {
      if (ids.has(match.encounterId)) this.rows[index] = { ...match, status: "voided" };
    }
  }
}

export function source(
  overrides: Partial<CompetitionFixtureSourceSnapshot> = {},
): CompetitionFixtureSourcePort {
  return { load: async () => ({ ...sourceSnapshot, ...overrides }) };
}

export function authorization(allowed: boolean): AuthorizationPort {
  return {
    decide: async (request) => ({ ...request, allowed, reason: allowed ? "allowed" : "denied" }),
    getEffectiveAccess: async (input) => ({ ...input, roles: [], permissions: [] }),
  };
}

export function input() {
  return {
    actorId: asActorId("staff-1"),
    organizationId: sourceSnapshot.organizationId,
    competitionId: sourceSnapshot.competitionId,
    generationVersion: 1,
    startsAt: new Date("2026-09-01T01:00:00.000Z"),
    roundIntervalDays: 7,
    homeAndAway: false,
    requestId: "request-1",
  };
}

export function useCase(options?: {
  readonly fixtures?: FixturePlans;
  readonly occupancy?: boolean;
  readonly source?: CompetitionFixtureSourcePort;
  readonly authorization?: AuthorizationPort;
  readonly events?: DomainEvent[];
  readonly snapshots?: Snapshots;
  readonly matches?: Matches;
  readonly publishMany?: () => Promise<void>;
}) {
  const fixtures = options?.fixtures ?? new FixturePlans();
  const events = options?.events ?? [];
  const snapshots = options?.snapshots ?? new Snapshots();
  const matches = options?.matches ?? new Matches();
  return {
    fixtures,
    snapshots,
    matches,
    events,
    useCase: new GenerateCompetitionFixtureUseCase({
      authorization: options?.authorization ?? authorization(true),
      clock: { now: () => new Date("2026-08-11T22:00:00.000Z") },
      encounters: snapshots,
      eventPublisher: {
        publish: async (event) => {
          events.push(event);
        },
        publishMany: async (batch) => {
          if (options?.publishMany) return options.publishMany();
          events.push(...batch);
        },
      },
      fixtures,
      matches,
      occupancy: { hasApprovedOfficialResult: async () => options?.occupancy ?? false },
      source: options?.source ?? source(),
      transaction: {
        runInTransaction: async (operation) => {
          const snapshot = new Map(fixtures.rows);
          const saves = fixtures.saves;
          try {
            return await operation();
          } catch (error) {
            fixtures.rows.clear();
            for (const [key, value] of snapshot) fixtures.rows.set(key, value);
            fixtures.saves = saves;
            throw error;
          }
        },
      },
    }),
  };
}
