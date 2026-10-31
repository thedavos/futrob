import { generateFixturePlan, type FixturePlan } from "@futrob/scheduling";
import {
  asCompetitionId,
  asOrganizationId,
  asTeamId,
  type CompetitionId,
} from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import { FixturePlayoffSpotsReader } from "./fixture-playoff-spots-reader.ts";

const organizationId = asOrganizationId("organization-1");
const competitionId = asCompetitionId("competition-1");
const seed = ["a", "b", "c", "d", "e", "f"].map((id) => asTeamId(`team-${id}`));

function plan(
  format: FixturePlan["format"],
  extra: { readonly playoffs?: { teamCount: number }; readonly generationVersion?: number } = {},
): FixturePlan {
  return generateFixturePlan({
    organizationId,
    competitionId,
    generationVersion: extra.generationVersion ?? 1,
    rulesVersion: 1,
    format,
    timeZone: "America/Lima",
    startsAt: new Date("2026-09-01T01:00:00.000Z"),
    roundIntervalDays: 7,
    officialMatchCounts: { regular: 1, knockout: 1 },
    resolutionModes: { regular: "independent_matches", knockout: "independent_matches" },
    seed,
    homeAndAway: false,
    ...(format === "groups-knockout" ? { groups: { count: 2, qualifiersPerGroup: 2 } } : {}),
    ...(extra.playoffs ? { playoffs: extra.playoffs } : {}),
  });
}

function reader(plans: readonly FixturePlan[]) {
  return new FixturePlayoffSpotsReader({
    async listActive(org, competition: CompetitionId) {
      return plans.filter(
        (stored) => stored.organizationId === org && stored.competitionId === competition,
      );
    },
  });
}

describe("FixturePlayoffSpotsReader", () => {
  it("reads the playoff size of a league-playoffs plan", async () => {
    await expect(
      reader([plan("league-playoffs", { playoffs: { teamCount: 4 } })]).find(
        organizationId,
        competitionId,
      ),
    ).resolves.toBe(4);
  });

  it("counts seeds that get a bye in an uneven playoff bracket", async () => {
    await expect(
      reader([plan("league-playoffs", { playoffs: { teamCount: 3 } })]).find(
        organizationId,
        competitionId,
      ),
    ).resolves.toBe(3);
  });

  it("keeps the playoff size once ranked Teams have advanced into the bracket", async () => {
    const generated = plan("league-playoffs", { playoffs: { teamCount: 4 } });
    const advanced: FixturePlan = {
      ...generated,
      stages: generated.stages.map((stage) => ({
        ...stage,
        rounds: stage.rounds.map((round) => ({
          ...round,
          encounters: round.encounters.map((encounter) => ({
            ...encounter,
            home:
              encounter.home.kind === "stage-rank"
                ? { kind: "team", teamId: seed[0]!, advancedFrom: encounter.home }
                : encounter.home,
          })),
        })),
      })),
    };

    await expect(reader([advanced]).find(organizationId, competitionId)).resolves.toBe(4);
  });

  it("uses the latest active generation", async () => {
    await expect(
      reader([
        plan("league-playoffs", { playoffs: { teamCount: 4 }, generationVersion: 1 }),
        plan("league-playoffs", { playoffs: { teamCount: 2 }, generationVersion: 2 }),
      ]).find(organizationId, competitionId),
    ).resolves.toBe(2);
  });

  it.each(["league", "knockout", "groups-knockout"] as const)(
    "has no playoff cut for a %s plan",
    async (format) => {
      await expect(reader([plan(format)]).find(organizationId, competitionId)).resolves.toBeNull();
    },
  );

  it("has no playoff cut before a fixture exists", async () => {
    await expect(reader([]).find(organizationId, competitionId)).resolves.toBeNull();
  });
});
