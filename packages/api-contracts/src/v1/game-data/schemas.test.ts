import { describe, expect, it } from "vite-plus/test";
import {
  getMyGameProfileQuerySchema,
  getMyGameProfileResponseSchema,
  getMyRecentMatchPathSchema,
  getMyRecentMatchQuerySchema,
  getMyRecentMatchResponseSchema,
  getMyRecentMatchesResponseSchema,
  playerGameProfileSchema,
  playerRecentProviderMatchSchema,
} from "./schemas.ts";

describe("getMyRecentMatchesResponseSchema", () => {
  it("accepts the club and game-account requirement states without a matches bag", () => {
    expect(getMyRecentMatchesResponseSchema.parse({ status: "needs_club" })).toEqual({
      status: "needs_club",
    });
    expect(getMyRecentMatchesResponseSchema.parse({ status: "needs_game_account" })).toEqual({
      status: "needs_game_account",
    });
    expect(getMyRecentMatchesResponseSchema.parse({ status: "needs_club", matches: [] })).toEqual({
      status: "needs_club",
    });
  });

  it("accepts a ready list of appearances", () => {
    const parsed = getMyRecentMatchesResponseSchema.parse({
      status: "ready",
      matches: [],
    });
    expect(parsed).toEqual({ status: "ready", matches: [] });
  });

  it("strips the roster from listed matches and requires the MVP summary", () => {
    const listed = getMyRecentMatchesResponseSchema.parse({
      status: "ready",
      matches: [listMatch("played")],
    });
    expect(listed.status === "ready" ? listed.matches[0]?.match : undefined).not.toHaveProperty(
      "players",
    );
    expect(listed.status === "ready" ? listed.matches[0]?.listedMvpDisplayName : undefined).toBe(
      "Rival Cap",
    );
    expect(
      playerRecentProviderMatchSchema.safeParse({
        ...listMatch("played"),
        listedMvpDisplayName: undefined,
      }).success,
    ).toBe(false);
  });
});

describe("getMyRecentMatch schemas", () => {
  it("parses the composite path and selected-club query", () => {
    expect(
      getMyRecentMatchPathSchema.parse({
        providerKey: "ea-clubs",
        externalMatchId: "match/with spaces",
      }),
    ).toEqual({ providerKey: "ea-clubs", externalMatchId: "match/with spaces" });
    expect(getMyRecentMatchQuerySchema.parse({ externalClubId: " 10754 " })).toEqual({
      externalClubId: "10754",
    });
  });

  it("accepts prerequisite, not-found, played, and not-played detail states", () => {
    expect(getMyRecentMatchResponseSchema.parse({ status: "needs_club" })).toEqual({
      status: "needs_club",
    });
    expect(getMyRecentMatchResponseSchema.parse({ status: "needs_game_account" })).toEqual({
      status: "needs_game_account",
    });
    expect(getMyRecentMatchResponseSchema.parse({ status: "not_found" })).toEqual({
      status: "not_found",
    });

    const played = getMyRecentMatchResponseSchema.parse({
      status: "ready",
      match: detailMatch("played"),
    });
    const notPlayed = getMyRecentMatchResponseSchema.parse({
      status: "ready",
      match: detailMatch("not_played"),
    });
    expect(played.status === "ready" ? played.match.match.players : []).toHaveLength(2);
    expect(notPlayed.status === "ready" ? notPlayed.match.kind : undefined).toBe("not_played");
  });

  it("rejects an unsupported provider key at the path boundary", () => {
    expect(
      getMyRecentMatchPathSchema.safeParse({
        providerKey: "unknown-provider",
        externalMatchId: "match-1",
      }).success,
    ).toBe(false);
  });
});

describe("getMyGameProfileQuerySchema", () => {
  it("accepts a club without a period", () => {
    expect(getMyGameProfileQuerySchema.parse({ externalClubId: " 10754 " })).toEqual({
      externalClubId: "10754",
    });
  });

  it("accepts an inclusive-from exclusive-to period", () => {
    expect(
      getMyGameProfileQuerySchema.parse({
        from: "2026-08-25T05:00:00.000Z",
        to: "2026-09-01T05:00:00.000Z",
      }),
    ).toEqual({
      from: "2026-08-25T05:00:00.000Z",
      to: "2026-09-01T05:00:00.000Z",
    });
  });

  it("rejects a lone bound or a reversed period", () => {
    expect(
      getMyGameProfileQuerySchema.safeParse({ from: "2026-08-25T00:00:00.000Z" }).success,
    ).toBe(false);
    expect(
      getMyGameProfileQuerySchema.safeParse({
        from: "2026-09-01T00:00:00.000Z",
        to: "2026-08-25T00:00:00.000Z",
      }).success,
    ).toBe(false);
    expect(
      getMyGameProfileQuerySchema.safeParse({
        from: "2026-08-25T00:00:00.000Z",
        to: "2026-08-25T00:00:00.000Z",
      }).success,
    ).toBe(false);
  });
});

describe("playerGameProfileSchema", () => {
  it("accepts a rating-only profile", () => {
    expect(playerGameProfileSchema.parse(profilePayload())).toEqual(profilePayload());
  });

  it("accepts a legacy API payload and strips ELO fields", () => {
    const parsed = getMyGameProfileResponseSchema.parse({
      status: "ready",
      profile: {
        ...profilePayload(),
        elo: { rating: 1512, ratedMatches: 28 },
        evolution: [
          {
            occurredAt: "2026-08-01T00:00:00.000Z",
            elo: 1512,
            rating: 7.2,
            outcome: "win",
          },
        ],
      },
    });

    expect(parsed).toEqual({
      status: "ready",
      profile: {
        ...profilePayload(),
        evolution: [
          {
            occurredAt: "2026-08-01T00:00:00.000Z",
            rating: 7.2,
            outcome: "win",
          },
        ],
      },
    });
    expect(parsed.status === "ready" ? parsed.profile : undefined).not.toHaveProperty("elo");
    expect(parsed.status === "ready" ? parsed.profile.evolution[0] : undefined).not.toHaveProperty(
      "elo",
    );
  });
});

function detailMatch(kind: "played" | "not_played") {
  const player = {
    externalPlayerId: "player-1",
    displayName: "Davos282",
    externalClubId: "10754",
    position: "midfielder",
    minutesPlayed: 90,
    goals: 0,
    assists: 0,
    shots: 0,
    passAttempts: 0,
    passesMade: 0,
    tackleAttempts: 0,
    tacklesMade: 0,
    saves: 0,
    yellowCards: 0,
    redCards: 0,
    isMvp: false,
    rating: 7.1,
  };
  const match = {
    id: "ea-clubs:match-1",
    provider: { key: "ea-clubs", externalMatchId: "match-1" },
    game: { edition: "fc26", platform: "common-gen5", mode: "friendlyMatch" },
    occurredAt: "2026-08-01T00:00:00.000Z",
    home: { externalClubId: "10754", name: "Home", goals: 1, imageUrl: null },
    away: { externalClubId: "2", name: "Away", goals: 0, imageUrl: null },
    players: [player, { ...player, externalPlayerId: "player-2", displayName: "Teammate" }],
    metadata: {
      durationSeconds: 540,
      wasDisconnected: false,
      winnerByForfeit: false,
      completeness: "complete",
    },
  };
  return kind === "played"
    ? { kind, match, appearance: player, listedExternalClubId: "10754" }
    : { kind, match, listedExternalClubId: "10754" };
}

function listMatch(kind: "played" | "not_played") {
  const detail = detailMatch(kind);
  const { players: _players, ...match } = detail.match;
  if (detail.kind === "played") {
    return {
      kind: "played" as const,
      match,
      appearance: detail.appearance,
      listedExternalClubId: "10754",
      listedMvpDisplayName: "Rival Cap",
    };
  }
  return {
    kind: "not_played" as const,
    match,
    listedExternalClubId: "10754",
    listedMvpDisplayName: null,
  };
}

function profilePayload() {
  const rates = {
    goals: 0.64,
    assists: 0.39,
    shots: 2.29,
    passAttempts: 14.71,
    passesMade: 12.07,
    tackleAttempts: 1.93,
    tacklesMade: 1.32,
    saves: 0,
    yellowCards: 0.11,
    redCards: 0,
    mvpAwards: 0.14,
    rating: 7.2,
  };
  const totals = {
    goals: 18,
    assists: 11,
    shots: 64,
    passAttempts: 412,
    passesMade: 338,
    tackleAttempts: 54,
    tacklesMade: 37,
    saves: 0,
    yellowCards: 3,
    redCards: 0,
    mvpAwards: 4,
    rating: 201.6,
  };
  const partial = {
    minutes: false,
    goals: false,
    assists: false,
    shots: false,
    passAttempts: false,
    passesMade: false,
    tackleAttempts: false,
    tacklesMade: false,
    saves: false,
    yellowCards: false,
    redCards: false,
    mvpAwards: false,
    rating: false,
  };
  const summary = {
    matchesPlayed: 28,
    wins: 16,
    draws: 4,
    losses: 8,
    minutes: 2520,
    totals,
    averages: rates,
    partial,
  };
  return {
    identity: {
      displayName: "davos282",
      preferredPosition: "forward",
      preferredRole: "attack" as const,
    },
    sampleSize: 28,
    attributes: [],
    evolution: [
      {
        occurredAt: "2026-08-01T00:00:00.000Z",
        rating: 7.2,
        outcome: "win" as const,
      },
    ],
    summary,
    byTeam: [{ clubId: "club-1", clubName: "Cuervos FC1", ...summary }],
    byPosition: [{ position: "forward", role: "attack" as const, ...summary }],
  };
}
