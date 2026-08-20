import { describe, expect, it } from "vite-plus/test";
import {
  getMyRecentMatchPathSchema,
  getMyRecentMatchQuerySchema,
  getMyRecentMatchResponseSchema,
  getMyRecentMatchesResponseSchema,
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
