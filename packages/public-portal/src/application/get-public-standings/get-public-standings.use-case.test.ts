import { describe, expect, it } from "vite-plus/test";
import { GetPublicStandingsUseCase } from "./get-public-standings.use-case.ts";
import {
  BARRANCO,
  COMPETITION_ID,
  MIRAFLORES,
  ORGANIZATION_ID,
  PUBLIC_KEY,
  SURQUILLO,
  TEAM_NAMES,
  competitionSource,
  countingStandings,
  publishedReader,
  teamDirectory,
} from "../public-portal.test-helper.ts";

const UPDATED_AT = new Date("2026-11-08T20:00:00.000Z");

const row = (position: number, teamId: typeof BARRANCO, points: number) => ({
  position,
  teamId,
  played: 1,
  wins: points === 3 ? 1 : 0,
  draws: 0,
  losses: points === 3 ? 0 : 1,
  goalsFor: points === 3 ? 2 : 0,
  goalsAgainst: points === 3 ? 0 : 2,
  goalDifference: points === 3 ? 2 : -2,
  points,
});

describe("GetPublicStandingsUseCase", () => {
  it("returns the official table in snapshot order with public team names", async () => {
    const standings = countingStandings(async () => ({
      rows: [row(1, BARRANCO, 3), row(2, SURQUILLO, 0)],
      updatedAt: UPDATED_AT,
    }));
    const result = await new GetPublicStandingsUseCase({
      competitions: publishedReader(competitionSource()),
      standings,
      teams: teamDirectory(TEAM_NAMES),
    }).execute({ key: PUBLIC_KEY });

    expect(result.isOk() && result.value).toEqual({
      rows: [
        {
          position: 1,
          teamName: "Barranco FC",
          played: 1,
          wins: 1,
          draws: 0,
          losses: 0,
          goalsFor: 2,
          goalsAgainst: 0,
          goalDifference: 2,
          points: 3,
        },
        {
          position: 2,
          teamName: "Surquillo United",
          played: 1,
          wins: 0,
          draws: 0,
          losses: 1,
          goalsFor: 0,
          goalsAgainst: 2,
          goalDifference: -2,
          points: 0,
        },
      ],
      updatedAt: UPDATED_AT,
    });
    expect(standings.calls).toEqual([COMPETITION_ID]);
  });

  it("exposes no identifier of the snapshot: no team, competition or organization id", async () => {
    const result = await new GetPublicStandingsUseCase({
      competitions: publishedReader(competitionSource()),
      standings: countingStandings(async () => ({
        rows: [{ ...row(1, BARRANCO, 3), organizationId: ORGANIZATION_ID }],
        updatedAt: UPDATED_AT,
      })),
      teams: teamDirectory(TEAM_NAMES),
    }).execute({ key: PUBLIC_KEY });

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(Object.keys(result.value.rows[0] ?? {}).sort()).toEqual([
      "draws",
      "goalDifference",
      "goalsAgainst",
      "goalsFor",
      "losses",
      "played",
      "points",
      "position",
      "teamName",
      "wins",
    ]);
    const wire = JSON.stringify(result.value);
    for (const internal of [BARRANCO, COMPETITION_ID, ORGANIZATION_ID]) {
      expect(wire).not.toContain(internal);
    }
  });

  it("is an empty table, not an error, before any result is projected", async () => {
    const result = await new GetPublicStandingsUseCase({
      competitions: publishedReader(competitionSource()),
      standings: countingStandings(async () => null),
      teams: teamDirectory(TEAM_NAMES),
    }).execute({ key: PUBLIC_KEY });

    expect(result.isOk() && result.value).toEqual({ rows: [], updatedAt: null });
  });

  it("leaves out a row whose team has no public name instead of printing an id", async () => {
    const result = await new GetPublicStandingsUseCase({
      competitions: publishedReader(competitionSource()),
      standings: countingStandings(async () => ({
        rows: [row(1, MIRAFLORES, 3), row(2, BARRANCO, 0)],
        updatedAt: UPDATED_AT,
      })),
      teams: teamDirectory(new Map([[BARRANCO, "Barranco FC"]])),
    }).execute({ key: PUBLIC_KEY });

    expect(result.isOk() && result.value.rows.map((item) => item.teamName)).toEqual([
      "Barranco FC",
    ]);
  });

  it("does not read statistics or teams for an unpublished competition", async () => {
    const standings = countingStandings(async () => null);
    const teams = teamDirectory(TEAM_NAMES);
    const result = await new GetPublicStandingsUseCase({
      competitions: publishedReader(competitionSource({ status: "draft" })),
      standings,
      teams,
    }).execute({ key: PUBLIC_KEY });

    expect(result.isErr() && result.error.code).toBe("public_portal.competition_not_found");
    expect(standings.calls).toEqual([]);
    expect(teams.calls).toBe(0);
  });
});
