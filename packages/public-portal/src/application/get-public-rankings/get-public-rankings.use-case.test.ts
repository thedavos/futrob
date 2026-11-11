import type { TeamId } from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import type { PublicRankingKind } from "../../domain/entities/public-competition.ts";
import type {
  PublicPlayerDirectoryPort,
  PublicRankingSource,
  PublicRankingsReaderPort,
} from "../../domain/ports/public-rankings-reader.port.ts";
import { GetPublicRankingsUseCase } from "./get-public-rankings.use-case.ts";
import {
  BARRANCO,
  COMPETITION_ID,
  ORGANIZATION_ID,
  SURQUILLO,
  TEAM_NAMES,
  competitionSource,
  PUBLIC_KEY,
  publishedReader,
  teamDirectory,
} from "../public-portal.test-helper.ts";

const UPDATED_AT = new Date("2026-11-08T20:00:00.000Z");

function rankingsReader(source: PublicRankingSource | null): PublicRankingsReaderPort & {
  readonly kinds: PublicRankingKind[];
} {
  const kinds: PublicRankingKind[] = [];
  return {
    kinds,
    async read(_scope, kind) {
      kinds.push(kind);
      return source;
    },
  };
}

function playerDirectory(names: Readonly<Record<string, string>>): PublicPlayerDirectoryPort & {
  readonly asked: { playerProfileId: string; teamId: TeamId | null }[];
} {
  const asked: { playerProfileId: string; teamId: TeamId | null }[] = [];
  return {
    asked,
    async namesOf(_scope, players) {
      asked.push(...players);
      return new Map(
        players.flatMap(({ playerProfileId }) => {
          const name = names[playerProfileId];
          return name === undefined ? [] : [[playerProfileId, name] as const];
        }),
      );
    },
  };
}

const SOURCE: PublicRankingSource = {
  updatedAt: UPDATED_AT,
  rows: [
    { position: 1, playerProfileId: "profile-ana", teamId: BARRANCO, value: 7, matchesPlayed: 4 },
    { position: 2, playerProfileId: "profile-beto", teamId: SURQUILLO, value: 5, matchesPlayed: 4 },
    { position: 3, playerProfileId: "profile-free", teamId: null, value: 2, matchesPlayed: 3 },
  ],
};

describe("GetPublicRankingsUseCase", () => {
  it("names players by their roster game account and teams by their public name", async () => {
    const players = playerDirectory({
      "profile-ana": "AnaGol_10",
      "profile-beto": "Beto-PSN",
      "profile-free": "LibreXbox",
    });
    const rankings = rankingsReader(SOURCE);
    const result = await new GetPublicRankingsUseCase({
      competitions: publishedReader(competitionSource()),
      rankings,
      players,
      teams: teamDirectory(TEAM_NAMES),
    }).execute({ key: PUBLIC_KEY, kind: "scorer" });

    expect(result.isOk() && result.value).toEqual({
      kind: "scorer",
      updatedAt: UPDATED_AT,
      rows: [
        {
          position: 1,
          playerName: "AnaGol_10",
          teamName: "Barranco FC",
          value: 7,
          matchesPlayed: 4,
        },
        {
          position: 2,
          playerName: "Beto-PSN",
          teamName: "Surquillo United",
          value: 5,
          matchesPlayed: 4,
        },
        { position: 3, playerName: "LibreXbox", teamName: null, value: 2, matchesPlayed: 3 },
      ],
    });
    expect(rankings.kinds).toEqual(["scorer"]);
    expect(players.asked).toEqual([
      { playerProfileId: "profile-ana", teamId: BARRANCO },
      { playerProfileId: "profile-beto", teamId: SURQUILLO },
      { playerProfileId: "profile-free", teamId: null },
    ]);
  });

  it("leaves out a player without a public name instead of showing an id", async () => {
    const result = await new GetPublicRankingsUseCase({
      competitions: publishedReader(competitionSource()),
      rankings: rankingsReader(SOURCE),
      players: playerDirectory({ "profile-beto": "Beto-PSN" }),
      teams: teamDirectory(TEAM_NAMES),
    }).execute({ key: PUBLIC_KEY, kind: "assister" });

    expect(result.isOk() && result.value.rows.map((row) => row.playerName)).toEqual(["Beto-PSN"]);
    const wire = JSON.stringify(result.isOk() && result.value);
    for (const internal of [
      "profile-ana",
      "profile-beto",
      "profile-free",
      BARRANCO,
      SURQUILLO,
      COMPETITION_ID,
      ORGANIZATION_ID,
      "playerProfileId",
      "teamId",
    ]) {
      expect(wire).not.toContain(internal);
    }
  });

  it("answers an empty ranking before any projection", async () => {
    const result = await new GetPublicRankingsUseCase({
      competitions: publishedReader(competitionSource()),
      rankings: rankingsReader(null),
      players: playerDirectory({}),
      teams: teamDirectory(TEAM_NAMES),
    }).execute({ key: PUBLIC_KEY, kind: "mvp" });

    expect(result.isOk() && result.value).toEqual({ kind: "mvp", rows: [], updatedAt: null });
  });

  it("does not read rankings of an unpublished competition", async () => {
    const rankings = rankingsReader(SOURCE);
    const result = await new GetPublicRankingsUseCase({
      competitions: publishedReader(competitionSource({ status: "draft" })),
      rankings,
      players: playerDirectory({}),
      teams: teamDirectory(TEAM_NAMES),
    }).execute({ key: PUBLIC_KEY, kind: "scorer" });

    expect(result.isErr() && result.error.code).toBe("public_portal.competition_not_found");
    expect(rankings.kinds).toEqual([]);
  });
});
