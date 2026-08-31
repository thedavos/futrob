import { describe, expect, it } from "vite-plus/test";
import {
  buildPlayerGameProfile,
  type PlayerGameAppearanceSample,
  type PlayerRecentMatchesResult,
  type PlayerRecentProviderMatchResult,
  type ProviderMatch,
  type ProviderPlayerMatchStats,
} from "@futrob/game-data";
import {
  toPlayerGameProfileDto,
  toPlayerRecentMatchDetailDto,
  toPlayerRecentMatchesDto,
} from "./game-data.ts";

describe("toPlayerRecentMatchesDto", () => {
  it("maps a played row with appearance, no roster, and listed-club MVP only", () => {
    const appearance = playerStats({
      displayName: "davos282",
      externalClubId: "10754",
      isMvp: false,
    });
    const mvp = playerStats({ displayName: "Rival Cap", externalClubId: "2", isMvp: true });
    const dto = toPlayerRecentMatchesDto(
      ready([
        {
          kind: "played",
          match: providerMatch({ players: [appearance, mvp] }),
          appearance,
          listedExternalClubId: "10754",
        },
      ]),
    );

    expect(dto).toEqual({
      status: "ready",
      matches: [
        {
          kind: "played",
          match: expect.objectContaining({ id: "ea-clubs:1" }),
          appearance: expect.objectContaining({ displayName: "davos282", externalClubId: "10754" }),
          listedExternalClubId: "10754",
          listedMvpDisplayName: null,
        },
      ],
    });
    expect(dto.status === "ready" ? dto.matches[0]?.match : undefined).not.toHaveProperty(
      "players",
    );
  });

  it("maps a not_played row without copying the opponent appearance or MVP", () => {
    const opponentAppearance = playerStats({
      displayName: "davos282",
      externalClubId: "2",
      goals: 3,
      isMvp: true,
    });
    const dto = toPlayerRecentMatchesDto(
      ready([
        {
          kind: "not_played",
          match: providerMatch({ players: [opponentAppearance] }),
          listedExternalClubId: "10754",
        },
      ]),
    );

    expect(dto).toEqual({
      status: "ready",
      matches: [
        {
          kind: "not_played",
          listedExternalClubId: "10754",
          listedMvpDisplayName: null,
          match: expect.objectContaining({ id: "ea-clubs:1" }),
        },
      ],
    });
    expect(dto.status === "ready" ? dto.matches[0] : undefined).not.toHaveProperty("appearance");
    expect(dto.status === "ready" ? dto.matches[0]?.match : undefined).not.toHaveProperty(
      "players",
    );
  });

  it("names the listed-club MVP from the appearance when that player is MVP", () => {
    const appearance = playerStats({
      displayName: "davos282",
      externalClubId: "10754",
      isMvp: true,
    });
    const dto = toPlayerRecentMatchesDto(
      ready([
        {
          kind: "played",
          match: providerMatch({ players: [appearance] }),
          appearance,
          listedExternalClubId: "10754",
        },
      ]),
    );

    expect(dto.status === "ready" ? dto.matches[0]?.listedMvpDisplayName : undefined).toBe(
      "davos282",
    );
  });
});

describe("toPlayerRecentMatchDetailDto", () => {
  it("keeps the complete roster while the list mapper omits players", () => {
    const appearance = playerStats({
      displayName: "davos282",
      externalClubId: "10754",
      isMvp: false,
    });
    const teammate = playerStats({
      displayName: "Teammate",
      externalClubId: "10754",
      isMvp: false,
    });
    const mvp = playerStats({ displayName: "Rival Cap", externalClubId: "2", isMvp: true });
    const row = {
      kind: "played",
      match: providerMatch({ players: [appearance, teammate, mvp] }),
      appearance,
      listedExternalClubId: "10754",
    } satisfies Extract<PlayerRecentProviderMatchResult, { status: "ready" }>["match"];

    const listDto = toPlayerRecentMatchesDto(ready([row]));
    const detailDto = toPlayerRecentMatchDetailDto({ status: "ready", match: row });

    expect(listDto.status === "ready" ? listDto.matches[0]?.match : undefined).not.toHaveProperty(
      "players",
    );
    expect(listDto.status === "ready" ? listDto.matches[0]?.listedMvpDisplayName : undefined).toBe(
      null,
    );
    expect(detailDto.status === "ready" ? detailDto.match.match.players : []).toEqual([
      expect.objectContaining({ displayName: "davos282" }),
      expect.objectContaining({ displayName: "Teammate" }),
      expect.objectContaining({ displayName: "Rival Cap" }),
    ]);
  });

  it("maps all non-ready detail states without extra fields", () => {
    expect(toPlayerRecentMatchDetailDto({ status: "needs_club" })).toEqual({
      status: "needs_club",
    });
    expect(toPlayerRecentMatchDetailDto({ status: "needs_game_account" })).toEqual({
      status: "needs_game_account",
    });
    expect(toPlayerRecentMatchDetailDto({ status: "not_found" })).toEqual({
      status: "not_found",
    });
  });
});

describe("toPlayerGameProfileDto", () => {
  it("serializes a rating-only profile without ELO fields", () => {
    const appearance = playerStats({ displayName: "davos282", rating: 7.1 });
    const later = { ...playerStats({ displayName: "davos282" }), rating: null };
    const dto = toPlayerGameProfileDto({
      status: "ready",
      profile: buildPlayerGameProfile([
        appearanceSample({
          occurredAt: new Date("2026-08-02T00:00:00.000Z"),
          appearance: later,
          outcome: "draw",
        }),
        appearanceSample({
          occurredAt: new Date("2026-08-01T00:00:00.000Z"),
          appearance,
          outcome: "win",
        }),
      ]),
    });

    expect(dto.status).toBe("ready");
    if (dto.status !== "ready") return;
    expect(dto.profile).not.toHaveProperty("elo");
    expect(dto.profile.evolution).toEqual([
      {
        occurredAt: "2026-08-01T00:00:00.000Z",
        rating: 7.1,
        outcome: "win",
      },
      {
        occurredAt: "2026-08-02T00:00:00.000Z",
        rating: null,
        outcome: "draw",
      },
    ]);
    expect(dto.profile.evolution[0]).not.toHaveProperty("elo");
  });

  it("maps prerequisite states without a profile bag", () => {
    expect(toPlayerGameProfileDto({ status: "needs_club" })).toEqual({ status: "needs_club" });
    expect(toPlayerGameProfileDto({ status: "needs_game_account" })).toEqual({
      status: "needs_game_account",
    });
  });
});

function ready(
  matches: Extract<PlayerRecentMatchesResult, { status: "ready" }>["matches"],
): PlayerRecentMatchesResult {
  return { status: "ready", matches };
}

function providerMatch(input: {
  readonly players: readonly ProviderPlayerMatchStats[];
}): ProviderMatch {
  return {
    id: "ea-clubs:1",
    provider: { key: "ea-clubs", externalMatchId: "1" },
    game: { edition: "fc26", platform: "common-gen5", mode: "friendlyMatch" },
    occurredAt: new Date("2026-08-01T00:00:00.000Z"),
    home: { externalClubId: "10754", name: "Home", goals: 1, imageUrl: null },
    away: { externalClubId: "2", name: "Away", goals: 0, imageUrl: null },
    players: input.players,
    metadata: {
      durationSeconds: 540,
      wasDisconnected: false,
      winnerByForfeit: false,
      completeness: "complete",
    },
  };
}

function playerStats(
  input: Partial<ProviderPlayerMatchStats> & { readonly displayName: string },
): ProviderPlayerMatchStats {
  return {
    externalPlayerId: input.externalPlayerId ?? "0",
    displayName: input.displayName,
    externalClubId: input.externalClubId ?? "10754",
    position: input.position ?? "midfielder",
    minutesPlayed: input.minutesPlayed ?? 90,
    goals: input.goals ?? 0,
    assists: input.assists ?? 0,
    shots: input.shots ?? 0,
    passAttempts: input.passAttempts ?? 0,
    passesMade: input.passesMade ?? 0,
    tackleAttempts: input.tackleAttempts ?? 0,
    tacklesMade: input.tacklesMade ?? 0,
    saves: input.saves ?? 0,
    yellowCards: input.yellowCards ?? 0,
    redCards: input.redCards ?? 0,
    isMvp: input.isMvp ?? false,
    rating: input.rating ?? 7,
  };
}

function appearanceSample(input: {
  readonly occurredAt: Date;
  readonly appearance: ProviderPlayerMatchStats;
  readonly outcome: PlayerGameAppearanceSample["outcome"];
}): PlayerGameAppearanceSample {
  return {
    occurredAt: input.occurredAt,
    clubId: input.appearance.externalClubId,
    clubName: "Home",
    position: input.appearance.position,
    role: "midfield",
    outcome: input.outcome,
    appearance: input.appearance,
  };
}
