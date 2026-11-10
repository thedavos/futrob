import { describe, expect, it } from "vite-plus/test";
import type {
  PublicBracketReaderPort,
  PublicBracketSource,
  PublicBracketSourceEncounter,
} from "../../domain/ports/public-bracket-reader.port.ts";
import { GetPublicBracketUseCase } from "./get-public-bracket.use-case.ts";
import {
  BARRANCO,
  COMPETITION_ID,
  MIRAFLORES,
  ORGANIZATION_ID,
  SURQUILLO,
  TEAM_NAMES,
  competitionSource,
  PUBLIC_KEY,
  publishedReader,
  teamDirectory,
} from "../public-portal.test-helper.ts";
import { asTeamId } from "@futrob/shared-kernel";

const NOW = new Date("2026-11-10T12:00:00.000Z");
const clock = { now: () => NOW };

function bracketReader(source: PublicBracketSource | null): PublicBracketReaderPort & {
  readonly calls: number;
} {
  const state = { calls: 0 };
  return {
    get calls() {
      return state.calls;
    },
    async read() {
      state.calls += 1;
      return source;
    },
  };
}

function encounter(overrides: Partial<PublicBracketSourceEncounter>): PublicBracketSourceEncounter {
  return {
    order: 1,
    scheduledStartAt: new Date("2026-11-20T20:00:00.000Z"),
    officialMatchCount: 1,
    home: { kind: "team", teamId: BARRANCO },
    away: { kind: "team", teamId: SURQUILLO },
    closedWithoutResult: false,
    officialScore: null,
    ...overrides,
  };
}

const run = (source: PublicBracketSource | null, status = "published" as const) =>
  new GetPublicBracketUseCase({
    competitions: publishedReader(competitionSource({ status, format: "knockout" })),
    bracket: bracketReader(source),
    teams: teamDirectory(TEAM_NAMES),
    clock,
  }).execute({ key: PUBLIC_KEY });

describe("GetPublicBracketUseCase", () => {
  it("draws every side by public name or position, with the official score", async () => {
    const result = await run({
      timeZone: "America/Lima",
      stages: [
        {
          kind: "knockout",
          rounds: [
            {
              number: 2,
              scheduledStartAt: new Date("2026-11-20T20:00:00.000Z"),
              encounters: [
                encounter({
                  home: { kind: "winner", from: { roundNumber: 1, order: 1 } },
                  away: { kind: "winner", from: { roundNumber: 1, order: 2 } },
                }),
              ],
            },
            {
              number: 1,
              scheduledStartAt: new Date("2026-11-01T20:00:00.000Z"),
              encounters: [
                encounter({
                  order: 2,
                  scheduledStartAt: new Date("2026-11-09T20:00:00.000Z"),
                  home: { kind: "team", teamId: MIRAFLORES },
                  away: { kind: "bye" },
                  closedWithoutResult: true,
                }),
                encounter({
                  order: 1,
                  scheduledStartAt: new Date("2026-11-01T20:00:00.000Z"),
                  officialMatchCount: 2,
                  officialScore: [
                    { homeGoals: 1, awayGoals: 0 },
                    { homeGoals: 2, awayGoals: 2 },
                  ],
                }),
              ],
            },
          ],
        },
      ],
    });

    expect(result.isOk() && result.value).toEqual({
      timeZone: "America/Lima",
      stages: [
        {
          kind: "knockout",
          rounds: [
            {
              number: 1,
              scheduledStartAt: new Date("2026-11-01T20:00:00.000Z"),
              encounters: [
                {
                  order: 1,
                  scheduledStartAt: new Date("2026-11-01T20:00:00.000Z"),
                  officialMatchCount: 2,
                  home: { kind: "team", name: "Barranco FC" },
                  away: { kind: "team", name: "Surquillo United" },
                  status: "official",
                  score: [
                    { homeGoals: 1, awayGoals: 0 },
                    { homeGoals: 2, awayGoals: 2 },
                  ],
                },
                {
                  order: 2,
                  scheduledStartAt: new Date("2026-11-09T20:00:00.000Z"),
                  officialMatchCount: 1,
                  home: { kind: "team", name: "Miraflores CF" },
                  away: { kind: "bye" },
                  status: "closed",
                  score: null,
                },
              ],
            },
            {
              number: 2,
              scheduledStartAt: new Date("2026-11-20T20:00:00.000Z"),
              encounters: [
                {
                  order: 1,
                  scheduledStartAt: new Date("2026-11-20T20:00:00.000Z"),
                  officialMatchCount: 1,
                  home: { kind: "winner", roundNumber: 1, order: 1 },
                  away: { kind: "winner", roundNumber: 1, order: 2 },
                  status: "scheduled",
                  score: null,
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it("labels group and stage places, and marks a played encounter without result as awaiting", async () => {
    const result = await run({
      timeZone: "UTC",
      stages: [
        {
          kind: "playoffs",
          rounds: [
            {
              number: 1,
              scheduledStartAt: new Date("2026-11-01T20:00:00.000Z"),
              encounters: [
                encounter({
                  scheduledStartAt: new Date("2026-11-01T20:00:00.000Z"),
                  home: { kind: "group_rank", groupId: "group-2", rank: 1 },
                  away: { kind: "stage_rank", rank: 4 },
                }),
              ],
            },
          ],
        },
      ],
    });

    const only = result.isOk() ? result.value?.stages[0]?.rounds[0]?.encounters[0] : undefined;
    expect(only).toMatchObject({
      home: { kind: "group_rank", group: "B", rank: 1 },
      away: { kind: "stage_rank", rank: 4 },
      status: "awaiting_result",
    });
  });

  it("shows a side it cannot name publicly as pending, never as an id", async () => {
    const stranger = asTeamId("team-internal-stranger");
    const result = await run({
      timeZone: "UTC",
      stages: [
        {
          kind: "knockout",
          rounds: [
            {
              number: 1,
              scheduledStartAt: new Date("2026-11-20T20:00:00.000Z"),
              encounters: [
                encounter({
                  home: { kind: "team", teamId: stranger },
                  away: { kind: "group_rank", groupId: "group-internal-x", rank: 2 },
                }),
                encounter({ order: 2, home: { kind: "winner", from: null } }),
              ],
            },
          ],
        },
      ],
    });

    const encounters = result.isOk() ? result.value?.stages[0]?.rounds[0]?.encounters : undefined;
    expect(encounters?.map((item) => [item.home, item.away])).toEqual([
      [{ kind: "pending" }, { kind: "pending" }],
      [{ kind: "pending" }, { kind: "team", name: "Surquillo United" }],
    ]);
    const wire = JSON.stringify(result.isOk() && result.value);
    for (const internal of [stranger, "group-internal-x", BARRANCO, COMPETITION_ID, ORGANIZATION_ID]) {
      expect(wire).not.toContain(internal);
    }
  });

  it("answers no bracket without a fixture or without elimination stages", async () => {
    const withoutFixture = await run(null);
    const leagueOnly = await run({ timeZone: "UTC", stages: [] });

    expect(withoutFixture.isOk() && withoutFixture.value).toBeNull();
    expect(leagueOnly.isOk() && leagueOnly.value).toBeNull();
  });

  it("does not read the fixture of an unpublished competition", async () => {
    const bracket = bracketReader(null);
    const result = await new GetPublicBracketUseCase({
      competitions: publishedReader(competitionSource({ status: "registration" })),
      bracket,
      teams: teamDirectory(TEAM_NAMES),
      clock,
    }).execute({ key: PUBLIC_KEY });

    expect(result.isErr() && result.error.code).toBe("public_portal.competition_not_found");
    expect(bracket.calls).toBe(0);
  });
});
