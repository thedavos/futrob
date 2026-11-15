import {
  asActorId,
  asCompetitionId,
  asOrganizationId,
  asTeamId,
  type AuthorizationPort,
} from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import type { FixturePlan } from "../domain/entities/fixture-plan.ts";
import { generateFixturePlan } from "../domain/policies/generate-fixture-plan.ts";
import { GetCurrentCompetitionFixtureUseCase } from "./get-current-competition-fixture.use-case.ts";

const organizationId = asOrganizationId("org-1");
const competitionId = asCompetitionId("competition-1");
const actorId = asActorId("actor-1");

function authorization(allowed: boolean): AuthorizationPort {
  return {
    decide: async (request) => ({ ...request, allowed, reason: allowed ? "allowed" : "denied" }),
    getEffectiveAccess: async (input) => ({ ...input, roles: [], permissions: [] }),
  };
}

function plan(generationVersion: number): FixturePlan {
  return generateFixturePlan({
    organizationId,
    competitionId,
    generationVersion,
    rulesVersion: 1,
    format: "league",
    timeZone: "America/Lima",
    startsAt: new Date("2026-09-01T01:00:00.000Z"),
    roundIntervalDays: 7,
    officialMatchCounts: { regular: 1, knockout: 1 },
    resolutionModes: { regular: "independent_matches", knockout: "independent_matches" },
    seed: ["alpha", "bravo", "charlie", "delta"].map(asTeamId),
    homeAndAway: false,
  });
}

function useCase(allowed: boolean, active: readonly FixturePlan[]) {
  let reads = 0;
  const subject = new GetCurrentCompetitionFixtureUseCase({
    authorization: authorization(allowed),
    fixtures: {
      listActive: async () => {
        reads += 1;
        return [...active];
      },
    },
  });
  return { subject, reads: () => reads };
}

describe("GetCurrentCompetitionFixtureUseCase", () => {
  it("returns the active fixture plan", async () => {
    const active = plan(1);
    const result = await useCase(true, [active]).subject.execute({
      actorId,
      organizationId,
      competitionId,
    });

    expect(result.isOk() && result.value).toEqual(active);
  });

  it("returns null before a fixture is generated", async () => {
    const result = await useCase(true, []).subject.execute({
      actorId,
      organizationId,
      competitionId,
    });

    expect(result.isOk() && result.value).toBeNull();
  });

  it("prefers the latest generation when more than one plan is active", async () => {
    const result = await useCase(true, [plan(2), plan(3), plan(1)]).subject.execute({
      actorId,
      organizationId,
      competitionId,
    });

    expect(result.isOk() && result.value && result.value.generationVersion).toBe(3);
  });

  it("hides the fixture from an unauthorized actor without reading it", async () => {
    const { subject, reads } = useCase(false, [plan(1)]);
    const result = await subject.execute({ actorId, organizationId, competitionId });

    expect(result.isErr() && result.error.code).toBe("scheduling.fixture_plan_not_found");
    expect(reads()).toBe(0);
  });
});
