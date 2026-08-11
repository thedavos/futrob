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
import type {
  CompetitionFixtureSourcePort,
  FixturePlanRepository,
} from "../domain/ports/fixture-plan.repository.ts";
import { GenerateCompetitionFixtureUseCase } from "./generate-competition-fixture.use-case.ts";

const sourceSnapshot = {
  organizationId: asOrganizationId("org-1"),
  competitionId: asCompetitionId("competition-1"),
  status: "published" as const,
  format: "league" as const,
  timeZone: "America/Lima",
  rulesVersion: 2,
  officialMatchCounts: { regular: 1 as const, knockout: 2 as const },
  approvedParticipants: [asTeamId("team-a"), asTeamId("team-b")],
};

class FixturePlans implements FixturePlanRepository {
  readonly rows = new Map<string, FixturePlan>();
  saves = 0;

  async findByGenerationKey(organizationId: string, competitionId: string, generationKey: string) {
    const plan = this.rows.get(generationKey) ?? null;
    return plan?.organizationId === organizationId && plan.competitionId === competitionId
      ? plan
      : null;
  }

  async save(plan: FixturePlan) {
    const existing = this.rows.get(plan.generationKey);
    if (existing) return { plan: existing, created: false } as const;
    this.rows.set(plan.generationKey, plan);
    this.saves += 1;
    return { plan, created: true } as const;
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

describe("GenerateCompetitionFixtureUseCase", () => {
  it("persists once and returns the existing fixture on replay", async () => {
    const fixtures = new FixturePlans();
    const events: DomainEvent[] = [];
    const useCase = new GenerateCompetitionFixtureUseCase({
      authorization: authorization(true),
      clock: { now: () => new Date("2026-08-11T22:00:00.000Z") },
      eventPublisher: {
        publish: async (event) => {
          events.push(event);
        },
        publishMany: async (batch) => {
          events.push(...batch);
        },
      },
      fixtures,
      source: source(),
      transaction: { runInTransaction: async (operation) => operation() },
    });

    const first = await useCase.execute(input());
    const replay = await useCase.execute(input());

    expect(first.isOk()).toBe(true);
    expect(replay.isOk()).toBe(true);
    if (first.isErr() || replay.isErr()) return;
    expect(replay.value).toEqual(first.value);
    expect(fixtures.saves).toBe(1);
    expect(events.map((event) => event.eventName)).toEqual(["scheduling.encounter-created"]);
  });

  it("treats corrected schedule inputs as a distinct generation key", async () => {
    const fixtures = new FixturePlans();
    const useCase = new GenerateCompetitionFixtureUseCase({
      authorization: authorization(true),
      clock: { now: () => new Date("2026-08-11T22:00:00.000Z") },
      eventPublisher: { publish: async () => {}, publishMany: async () => {} },
      fixtures,
      source: source(),
      transaction: { runInTransaction: async (operation) => operation() },
    });

    const first = await useCase.execute(input());
    const shifted = await useCase.execute({
      ...input(),
      startsAt: new Date("2026-09-08T01:00:00.000Z"),
      requestId: "request-2",
    });

    expect(first.isOk()).toBe(true);
    expect(shifted.isOk()).toBe(true);
    if (first.isErr() || shifted.isErr()) return;
    expect(shifted.value.generationKey).not.toBe(first.value.generationKey);
    expect(fixtures.saves).toBe(2);
  });

  it("rejects a draft before persistence", async () => {
    const fixtures = new FixturePlans();
    const result = await new GenerateCompetitionFixtureUseCase({
      authorization: authorization(true),
      clock: { now: () => new Date() },
      eventPublisher: { publish: async () => {}, publishMany: async () => {} },
      fixtures,
      source: source({ status: "draft" }),
      transaction: { runInTransaction: async (operation) => operation() },
    }).execute(input());

    expect(result.isErr()).toBe(true);
    if (result.isOk()) return;
    expect(result.error.code).toBe("scheduling.fixture_source_not_published");
    expect(fixtures.saves).toBe(0);
  });

  it("requires scheduleManage permission", async () => {
    const fixtures = new FixturePlans();
    const result = await new GenerateCompetitionFixtureUseCase({
      authorization: authorization(false),
      clock: { now: () => new Date() },
      eventPublisher: { publish: async () => {}, publishMany: async () => {} },
      fixtures,
      source: source(),
      transaction: { runInTransaction: async (operation) => operation() },
    }).execute(input());

    expect(result.isErr()).toBe(true);
    if (result.isOk()) return;
    expect(result.error.code).toBe("authorization.forbidden");
    expect(fixtures.saves).toBe(0);
  });

  it("rolls back fixture persistence when event publication fails", async () => {
    const fixtures = new FixturePlans();
    const useCase = new GenerateCompetitionFixtureUseCase({
      authorization: authorization(true),
      clock: { now: () => new Date("2026-08-11T22:00:00.000Z") },
      eventPublisher: {
        publish: async () => {},
        publishMany: async () => {
          throw new Error("outbox unavailable");
        },
      },
      fixtures,
      source: source(),
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
    });

    await expect(useCase.execute(input())).rejects.toThrow("outbox unavailable");
    expect(fixtures.rows.size).toBe(0);
    expect(fixtures.saves).toBe(0);
  });
});
