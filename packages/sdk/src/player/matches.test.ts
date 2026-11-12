import type {
  GetMyRecentMatchesResponse,
  PlayerRecentProviderMatchDto,
} from "@futrob/api-contracts";
import { describe, expect, it } from "vite-plus/test";
import {
  calendarDayKind,
  groupMatchesByDay,
  isDnfMatch,
  matchOutcome,
  matchRosters,
  opponentClubName,
  presentPlayerMatches,
  scoringFeat,
  sortMatchesByOccurredAt,
} from "./index.ts";

function match(
  id: string,
  input: {
    occurredAt: string;
    mode?: string;
    home?: [string, number];
    away?: [string, number];
    listed?: string;
    goals?: number | null;
  },
): PlayerRecentProviderMatchDto {
  const [homeId, homeGoals] = input.home ?? ["club-a", 2];
  const [awayId, awayGoals] = input.away ?? ["club-b", 1];
  const base = {
    listedExternalClubId: input.listed ?? "club-a",
    listedMvpDisplayName: null,
    match: {
      id,
      provider: { key: "ea-clubs" as const, externalMatchId: `ea-${id}` },
      game: { edition: "fc26", platform: "common-gen5", mode: input.mode ?? "leagueMatch" },
      occurredAt: input.occurredAt,
      home: { externalClubId: homeId, name: `Name ${homeId}`, goals: homeGoals, imageUrl: null },
      away: { externalClubId: awayId, name: `Name ${awayId}`, goals: awayGoals, imageUrl: null },
      metadata: {
        durationSeconds: 540,
        wasDisconnected: false,
        winnerByForfeit: false,
        completeness: "complete" as const,
      },
    },
  };
  if (input.goals === undefined) return { kind: "not_played", ...base };
  return {
    kind: "played",
    ...base,
    appearance: {
      externalPlayerId: "p1",
      displayName: "davos282",
      externalClubId: base.listedExternalClubId,
      position: "ST",
      minutesPlayed: 90,
      goals: input.goals,
      assists: 0,
      shots: 3,
      passAttempts: 10,
      passesMade: 8,
      tackleAttempts: 1,
      tacklesMade: 1,
      saves: null,
      yellowCards: 0,
      redCards: 0,
      isMvp: false,
      rating: 7.5,
    },
  };
}

describe("match outcome from the selected club", () => {
  it("reads win, loss and draw from the listed club's side", () => {
    const win = match("1", { occurredAt: "2026-09-01T20:00:00.000Z" });
    const loss = match("2", { occurredAt: "2026-09-01T20:00:00.000Z", listed: "club-b" });
    const draw = match("3", {
      occurredAt: "2026-09-01T20:00:00.000Z",
      home: ["club-a", 1],
      away: ["club-b", 1],
    });
    expect([matchOutcome(win), matchOutcome(loss), matchOutcome(draw)]).toEqual([
      "win",
      "loss",
      "draw",
    ]);
    expect(opponentClubName(win)).toBe("Name club-b");
    expect(opponentClubName(loss)).toBe("Name club-a");
  });

  it("is unknown when the listed club is on neither side", () => {
    const stray = match("1", { occurredAt: "2026-09-01T20:00:00.000Z", listed: "club-z" });
    expect(matchOutcome(stray)).toBe("unknown");
    expect(opponentClubName(stray)).toBeNull();
  });

  it("names hat-trick, poker and repoker", () => {
    expect([2, 3, 4, 5, 7, null].map(scoringFeat)).toEqual([
      null,
      "hatTrick",
      "poker",
      "repoker",
      "repoker",
      null,
    ]);
  });

  it("flags forfeits and disconnections", () => {
    const base = match("1", { occurredAt: "2026-09-01T20:00:00.000Z" });
    expect(isDnfMatch(base)).toBe(false);
    expect(
      isDnfMatch({
        match: { ...base.match, metadata: { ...base.match.metadata, wasDisconnected: true } },
      }),
    ).toBe(true);
  });
});

describe("ordering and days", () => {
  const now = new Date(2026, 8, 10, 12, 0);
  const today = match("today", { occurredAt: new Date(2026, 8, 10, 9, 0).toISOString() });
  const yesterday = match("yesterday", { occurredAt: new Date(2026, 8, 9, 22, 0).toISOString() });
  const older = match("older", { occurredAt: new Date(2026, 8, 1, 22, 0).toISOString() });

  it("sorts newest or oldest first, then by id for ties", () => {
    const tie = match("a-tie", { occurredAt: today.match.occurredAt });
    expect(
      sortMatchesByOccurredAt([older, today, tie, yesterday], "newest").map((m) => m.match.id),
    ).toEqual(["a-tie", "today", "yesterday", "older"]);
    expect(sortMatchesByOccurredAt([today, older], "oldest").map((m) => m.match.id)).toEqual([
      "older",
      "today",
    ]);
  });

  it("groups by local calendar day and labels today and yesterday", () => {
    const days = groupMatchesByDay([today, yesterday, older], now);
    expect(days.map((day) => [day.kind, day.matches.map((m) => m.match.id)])).toEqual([
      ["today", ["today"]],
      ["yesterday", ["yesterday"]],
      ["other", ["older"]],
    ]);
    expect(calendarDayKind(new Date(2026, 8, 10, 23, 59), now)).toBe("today");
  });
});

describe("presentPlayerMatches", () => {
  const now = new Date(2026, 8, 10, 12, 0);
  const league = match("league", { occurredAt: "2026-09-08T20:00:00.000Z", goals: 3 });
  const friendly = match("friendly", {
    occurredAt: "2026-09-09T20:00:00.000Z",
    mode: "friendlyMatch",
  });
  const input = { view: "all", order: "newest", now } as const;

  it("keeps missing prerequisites apart from an empty list", () => {
    expect(presentPlayerMatches({ status: "needs_club" }, input)).toEqual({ kind: "needs-club" });
    expect(presentPlayerMatches({ status: "needs_game_account" }, input)).toEqual({
      kind: "needs-game-account",
    });
    expect(presentPlayerMatches({ status: "ready", matches: [] }, input)).toEqual({
      kind: "empty",
    });
  });

  it("filters by view, and says when a view has no matches", () => {
    const response: GetMyRecentMatchesResponse = { status: "ready", matches: [league, friendly] };
    const ready = presentPlayerMatches(response, { ...input, view: "league" });
    expect(
      ready.kind === "ready" && ready.days.flatMap((d) => d.matches.map((m) => m.match.id)),
    ).toEqual(["league"]);
    expect(presentPlayerMatches(response, { ...input, view: "playoff" })).toEqual({
      kind: "filtered-empty",
      view: "playoff",
    });
  });

  it("orders all matches newest first by default", () => {
    const state = presentPlayerMatches({ status: "ready", matches: [league, friendly] }, input);
    expect(
      state.kind === "ready" && state.days.flatMap((d) => d.matches.map((m) => m.match.id)),
    ).toEqual(["friendly", "league"]);
  });
});

describe("matchRosters", () => {
  const base = match("1", { occurredAt: "2026-09-01T20:00:00.000Z", listed: "club-b" });
  const player = (id: string, club: string, rating: number | null) => ({
    externalPlayerId: id,
    displayName: id,
    externalClubId: club,
    position: null,
    minutesPlayed: null,
    goals: null,
    assists: null,
    shots: null,
    passAttempts: null,
    passesMade: null,
    tackleAttempts: null,
    tacklesMade: null,
    saves: null,
    yellowCards: null,
    redCards: null,
    isMvp: null,
    rating,
  });

  it("lists the selected club first and orders by rating with unknown ratings last", () => {
    const rosters = matchRosters({
      listedExternalClubId: "club-b",
      match: {
        ...base.match,
        players: [
          player("a1", "club-a", 6),
          player("b-null", "club-b", null),
          player("b7", "club-b", 7),
          player("b9", "club-b", 9),
        ],
      },
    });
    expect(
      rosters.map((roster) => [roster.side, roster.players.map((p) => p.externalPlayerId)]),
    ).toEqual([
      ["away", ["b9", "b7", "b-null"]],
      ["home", ["a1"]],
    ]);
  });
});
