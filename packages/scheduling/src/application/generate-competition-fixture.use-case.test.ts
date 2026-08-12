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
import type { EncounterScheduleRepository } from "../domain/ports/encounter-schedule.repository.ts";
import type { FixturePlanRepository } from "../domain/ports/fixture-plan.repository.ts";
import type { OfficialMatchRepository } from "../domain/ports/official-match.repository.ts";
import type { CompetitionFixtureSourcePort } from "../domain/ports/fixture-plan.repository.ts";
import { GenerateCompetitionFixtureUseCase } from "./generate-competition-fixture.use-case.ts";

const sourceSnapshot = {
  organizationId: asOrganizationId("org-1"),
  competitionId: asCompetitionId("competition-1"),
  status: "published" as const,
  format: "league" as const,
  timeZone: "America/Lima",
  rulesVersion: 2,
  officialMatchCounts: { regular: 1 as const, knockout: 2 as const },
  resolutionModes: {
    regular: "independent_matches" as const,
    knockout: "aggregate_score" as const,
  },
  approvedParticipants: [asTeamId("team-a"), asTeamId("team-b")],
};

class FixturePlans implements FixturePlanRepository {
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

class Snapshots implements EncounterScheduleRepository {
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
}

class Matches implements OfficialMatchRepository {
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

function source(overrides = {}): CompetitionFixtureSourcePort {
  return { load: async () => ({ ...sourceSnapshot, ...overrides }) };
}

function authorization(allowed: boolean): AuthorizationPort {
  return {
    decide: async (request) => ({ ...request, allowed, reason: allowed ? "allowed" : "denied" }),
    getEffectiveAccess: async (input) => ({ ...input, roles: [], permissions: [] }),
  };
}

function input() {
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

function useCase(options?: {
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

describe("GenerateCompetitionFixtureUseCase", () => {
  it("persists once and returns the existing fixture on replay", async () => {
    const harness = useCase();
    const first = await harness.useCase.execute(input());
    const replay = await harness.useCase.execute(input());

    expect(first.isOk()).toBe(true);
    expect(replay.isOk()).toBe(true);
    if (first.isErr() || replay.isErr()) return;
    expect(replay.value).toEqual(first.value);
    expect(harness.fixtures.saves).toBe(1);
    expect(harness.events.map((event) => event.eventName)).toEqual([
      "scheduling.encounter-created",
    ]);
    expect(harness.snapshots.rows.size).toBe(1);
    expect(harness.matches.rows).toHaveLength(1);
  });

  it("rejects a corrected spec that reuses the same generation version", async () => {
    const harness = useCase();
    const first = await harness.useCase.execute(input());
    const shifted = await harness.useCase.execute({
      ...input(),
      startsAt: new Date("2026-09-08T01:00:00.000Z"),
      requestId: "request-2",
    });

    expect(first.isOk()).toBe(true);
    expect(shifted.isErr()).toBe(true);
    if (shifted.isOk()) return;
    expect(shifted.error.code).toBe("scheduling.fixture_generation_conflict");
    expect(harness.fixtures.saves).toBe(1);
  });

  it("supersedes the previous version and voids its official occupancy", async () => {
    const harness = useCase();
    const first = await harness.useCase.execute(input());
    const next = await harness.useCase.execute({ ...input(), generationVersion: 2 });

    expect(first.isOk()).toBe(true);
    expect(next.isOk()).toBe(true);
    if (first.isErr() || next.isErr()) return;
    expect(harness.fixtures.rows.get(first.value.id)?.status).toBe("superseded");
    expect(next.value.status).toBe("active");
    expect(
      await harness.snapshots.findById(first.value.stages[0]!.rounds[0]!.encounters[0]!.id),
    ).toBeNull();
    expect(harness.matches.rows.some((match) => match.status === "voided")).toBe(true);
    expect(harness.snapshots.rows.size).toBe(1);
  });

  it("refuses to supersede a fixture that already has approved official results", async () => {
    const harness = useCase({ occupancy: true });
    const first = await harness.useCase.execute(input());
    const next = await harness.useCase.execute({ ...input(), generationVersion: 2 });

    expect(first.isOk()).toBe(true);
    expect(next.isErr()).toBe(true);
    if (next.isOk()) return;
    expect(next.error.code).toBe("scheduling.fixture_supersede_conflict");
    expect(harness.fixtures.saves).toBe(1);
  });

  it("rejects a draft before persistence", async () => {
    const harness = useCase({ source: source({ status: "draft" }) });
    const result = await harness.useCase.execute(input());

    expect(result.isErr()).toBe(true);
    if (result.isOk()) return;
    expect(result.error.code).toBe("scheduling.fixture_source_not_published");
    expect(harness.fixtures.saves).toBe(0);
  });

  it("requires scheduleManage permission", async () => {
    let sourceReads = 0;
    const harness = useCase({
      authorization: authorization(false),
      source: {
        load: async () => {
          sourceReads += 1;
          return sourceSnapshot;
        },
      },
    });
    const result = await harness.useCase.execute(input());

    expect(result.isErr()).toBe(true);
    if (result.isOk()) return;
    expect(result.error.code).toBe("authorization.forbidden");
    expect(harness.fixtures.saves).toBe(0);
    expect(sourceReads).toBe(0);
  });

  it("rolls back fixture persistence when event publication fails", async () => {
    const harness = useCase({
      publishMany: async () => {
        throw new Error("outbox unavailable");
      },
    });

    await expect(harness.useCase.execute(input())).rejects.toThrow("outbox unavailable");
    expect(harness.fixtures.rows.size).toBe(0);
    expect(harness.fixtures.saves).toBe(0);
  });
});
