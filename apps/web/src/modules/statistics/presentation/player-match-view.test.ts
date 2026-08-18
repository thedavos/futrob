import { describe, expect, it } from "vite-plus/test";
import { recentProviderMatchFixture } from "./player-matches-page.fixtures.ts";
import {
  calendarDayKind,
  filterMatchesByMode,
  filterRecentMatches,
  groupMatchesByDay,
  isDnfMatch,
  isWithinRecentCalendarDays,
  listedClubId,
  matchesForView,
  matchMvpDisplayName,
  matchOutcome,
  playerMatchSide,
  scoringFeat,
  scoringFeatPlayerName,
  showsMatchTypeBadge,
  showsRedCards,
  showsYellowCards,
  summarizeMatchRecord,
} from "./player-match-view.ts";

const now = new Date(2026, 7, 14, 15, 0, 0);

describe("playerMatchSide", () => {
  it("returns home when the appearance club is the home club", () => {
    expect(playerMatchSide(recentProviderMatchFixture())).toBe("home");
  });

  it("returns away when the appearance club is the away club", () => {
    expect(
      playerMatchSide(
        recentProviderMatchFixture({
          appearance: { externalClubId: "99" },
        }),
      ),
    ).toBe("away");
  });
});

describe("matchOutcome", () => {
  it("counts a home win", () => {
    expect(matchOutcome(recentProviderMatchFixture())).toBe("win");
  });

  it("counts an away loss", () => {
    const item = recentProviderMatchFixture({
      home: { externalClubId: "99", name: "Night Owls", goals: 3, imageUrl: null },
      away: { externalClubId: "10754", name: "Fera Enjaulada", goals: 1, imageUrl: null },
      appearance: { externalClubId: "10754" },
    });
    expect(matchOutcome(item)).toBe("loss");
  });

  it("counts an away win", () => {
    const item = recentProviderMatchFixture({
      home: { externalClubId: "99", name: "Night Owls", goals: 1, imageUrl: null },
      away: { externalClubId: "10754", name: "Fera Enjaulada", goals: 3, imageUrl: null },
      appearance: { externalClubId: "10754" },
    });
    expect(matchOutcome(item)).toBe("win");
  });

  it("counts a draw for the away club", () => {
    const item = recentProviderMatchFixture({
      home: { externalClubId: "99", name: "Night Owls", goals: 2, imageUrl: null },
      away: { externalClubId: "10754", name: "Fera Enjaulada", goals: 2, imageUrl: null },
      appearance: { externalClubId: "10754" },
    });
    expect(matchOutcome(item)).toBe("draw");
  });

  it("returns unknown when the appearance club is not in the match", () => {
    const item = recentProviderMatchFixture({
      appearance: { externalClubId: "missing" },
    });
    expect(matchOutcome(item)).toBe("unknown");
  });

  it("uses the listed club for a not_played row, not an opponent appearance", () => {
    const item = recentProviderMatchFixture({
      kind: "not_played",
      listedExternalClubId: "10754",
      home: { externalClubId: "10754", name: "Sirius", goals: 2, imageUrl: null },
      away: { externalClubId: "99", name: "Cuervos", goals: 1, imageUrl: null },
    });
    expect(listedClubId(item)).toBe("10754");
    expect(playerMatchSide(item)).toBe("home");
    expect(matchOutcome(item)).toBe("win");
  });
});

describe("summarizeMatchRecord", () => {
  it("aggregates wins, draws, losses, goals, assists and average rating", () => {
    const summary = summarizeMatchRecord([
      recentProviderMatchFixture({ appearance: { rating: 8 } }),
      recentProviderMatchFixture({
        id: "draw",
        home: { externalClubId: "10754", name: "Fera", goals: 1, imageUrl: null },
        away: { externalClubId: "99", name: "Owls", goals: 1, imageUrl: null },
        appearance: { rating: null },
      }),
      recentProviderMatchFixture({
        id: "loss",
        home: { externalClubId: "10754", name: "Fera", goals: 0, imageUrl: null },
        away: { externalClubId: "99", name: "Owls", goals: 2, imageUrl: null },
        appearance: { rating: 6 },
      }),
    ]);

    expect(summary).toEqual({
      wins: 1,
      draws: 1,
      losses: 1,
      goals: 3,
      assists: 0,
      averageRating: 7,
    });
  });

  it("returns null goals and assists when every appearance omits them", () => {
    const summary = summarizeMatchRecord([
      recentProviderMatchFixture({ appearance: { goals: null, assists: null, rating: null } }),
    ]);
    expect(summary.goals).toBeNull();
    expect(summary.assists).toBeNull();
    expect(summary.averageRating).toBeNull();
  });

  it("returns a null average when no ratings exist", () => {
    const summary = summarizeMatchRecord([
      recentProviderMatchFixture({ appearance: { rating: null } }),
    ]);
    expect(summary.averageRating).toBeNull();
  });

  it("counts W/D/L for not_played rows and ignores opponent personal stats", () => {
    const summary = summarizeMatchRecord([
      recentProviderMatchFixture({ appearance: { goals: 1, assists: 1, rating: 8 } }),
      recentProviderMatchFixture({
        kind: "not_played",
        id: "not-played-win",
        listedExternalClubId: "10754",
        home: { externalClubId: "10754", name: "Sirius", goals: 4, imageUrl: null },
        away: { externalClubId: "99", name: "Cuervos", goals: 0, imageUrl: null },
      }),
    ]);
    expect(summary).toEqual({
      wins: 2,
      draws: 0,
      losses: 0,
      goals: 1,
      assists: 1,
      averageRating: 8,
    });
  });
});

describe("recent calendar window", () => {
  it("includes today and the sixth previous calendar day", () => {
    expect(isWithinRecentCalendarDays(new Date(2026, 7, 14, 23, 59), now)).toBe(true);
    expect(isWithinRecentCalendarDays(new Date(2026, 7, 8, 0, 0), now)).toBe(true);
    expect(isWithinRecentCalendarDays(new Date(2026, 7, 7, 23, 59), now)).toBe(false);
  });

  it("filters the 7-day subset", () => {
    const recent = recentProviderMatchFixture({
      occurredAt: new Date(2026, 7, 13, 18, 0).toISOString(),
    });
    const older = recentProviderMatchFixture({
      id: "old",
      occurredAt: new Date(2026, 7, 1, 18, 0).toISOString(),
    });
    expect(filterRecentMatches([recent, older], now)).toEqual([recent]);
  });
});

describe("groupMatchesByDay", () => {
  it("groups newest-first days and keeps input order inside a day", () => {
    const morning = recentProviderMatchFixture({
      id: "morning",
      occurredAt: new Date(2026, 7, 14, 10, 0).toISOString(),
    });
    const evening = recentProviderMatchFixture({
      id: "evening",
      occurredAt: new Date(2026, 7, 14, 21, 0).toISOString(),
    });
    const yesterday = recentProviderMatchFixture({
      id: "yesterday",
      occurredAt: new Date(2026, 7, 13, 18, 0).toISOString(),
    });

    const groups = groupMatchesByDay([evening, morning, yesterday]);
    expect(groups.map((group) => group.dayKey)).toEqual(["2026-08-14", "2026-08-13"]);
    expect(groups[0]?.matches.map((item) => item.match.id)).toEqual(["evening", "morning"]);
  });

  it("labels today and yesterday", () => {
    expect(calendarDayKind(new Date(2026, 7, 14, 1, 0), now)).toBe("today");
    expect(calendarDayKind(new Date(2026, 7, 13, 23, 0), now)).toBe("yesterday");
    expect(calendarDayKind(new Date(2026, 7, 12, 12, 0), now)).toBe("other");
  });
});

describe("provider match types", () => {
  it("filters league, playoff and friendly modes", () => {
    const league = recentProviderMatchFixture({ id: "league", mode: "leagueMatch" });
    const playoff = recentProviderMatchFixture({ id: "playoff", mode: "playoffMatch" });
    const friendly = recentProviderMatchFixture({ id: "friendly", mode: "friendlyMatch" });
    const matches = [league, playoff, friendly];

    expect(filterMatchesByMode(matches, "leagueMatch")).toEqual([league]);
    expect(filterMatchesByMode(matches, "playoffMatch")).toEqual([playoff]);
    expect(filterMatchesByMode(matches, "friendlyMatch")).toEqual([friendly]);
  });

  it("selects the subset for each view", () => {
    const league = recentProviderMatchFixture({
      id: "league",
      mode: "leagueMatch",
      occurredAt: new Date(2026, 7, 14, 18, 0).toISOString(),
    });
    const olderFriendly = recentProviderMatchFixture({
      id: "friendly",
      mode: "friendlyMatch",
      occurredAt: new Date(2026, 7, 1, 18, 0).toISOString(),
    });
    const matches = [league, olderFriendly];

    expect(matchesForView(matches, "recent", now)).toEqual([league]);
    expect(matchesForView(matches, "all", now)).toEqual(matches);
    expect(matchesForView(matches, "league", now)).toEqual([league]);
    expect(matchesForView(matches, "friendly", now)).toEqual([olderFriendly]);
    expect(matchesForView(matches, "playoff", now)).toEqual([]);
  });
});

describe("showsMatchTypeBadge", () => {
  it("is only for Recientes and Todos", () => {
    expect(showsMatchTypeBadge("recent")).toBe(true);
    expect(showsMatchTypeBadge("all")).toBe(true);
    expect(showsMatchTypeBadge("league")).toBe(false);
    expect(showsMatchTypeBadge("playoff")).toBe(false);
    expect(showsMatchTypeBadge("friendly")).toBe(false);
  });
});

describe("scoringFeat", () => {
  it("returns null below three goals or when goals are missing", () => {
    expect(scoringFeat(null)).toBeNull();
    expect(scoringFeat(0)).toBeNull();
    expect(scoringFeat(2)).toBeNull();
  });

  it("maps 3, 4 and 5+ goals to hat-trick, poker and repoker", () => {
    expect(scoringFeat(3)).toBe("hatTrick");
    expect(scoringFeat(4)).toBe("poker");
    expect(scoringFeat(5)).toBe("repoker");
    expect(scoringFeat(6)).toBe("repoker");
  });
});

describe("scoringFeatPlayerName", () => {
  it("returns the appearance name when the player scored a feat", () => {
    expect(scoringFeatPlayerName(recentProviderMatchFixture({ appearance: { goals: 3 } }))).toBe(
      "davos282",
    );
  });

  it("returns null when the name is missing", () => {
    expect(
      scoringFeatPlayerName(
        recentProviderMatchFixture({ appearance: { goals: 3, displayName: "  " } }),
      ),
    ).toBeNull();
  });

  it("returns null for a not_played row", () => {
    expect(
      scoringFeatPlayerName(
        recentProviderMatchFixture({
          kind: "not_played",
          listedExternalClubId: "10754",
        }),
      ),
    ).toBeNull();
  });
});

describe("showsYellowCards", () => {
  it("is only true for a positive count", () => {
    expect(showsYellowCards(null)).toBe(false);
    expect(showsYellowCards(0)).toBe(false);
    expect(showsYellowCards(1)).toBe(true);
  });
});

describe("showsRedCards", () => {
  it("is only true for a positive count", () => {
    expect(showsRedCards(null)).toBe(false);
    expect(showsRedCards(0)).toBe(false);
    expect(showsRedCards(1)).toBe(true);
  });
});

describe("isDnfMatch", () => {
  it("is true when the provider marked a forfeit or disconnect", () => {
    expect(isDnfMatch(recentProviderMatchFixture())).toBe(false);
    expect(isDnfMatch(recentProviderMatchFixture({ metadata: { winnerByForfeit: true } }))).toBe(
      true,
    );
    expect(isDnfMatch(recentProviderMatchFixture({ metadata: { wasDisconnected: true } }))).toBe(
      true,
    );
  });
});

describe("matchMvpDisplayName", () => {
  it("uses the appearance when the player is the MVP", () => {
    expect(matchMvpDisplayName(recentProviderMatchFixture({ appearance: { isMvp: true } }))).toBe(
      "davos282",
    );
  });

  it("does not name the player as MVP on a not_played row", () => {
    const appearance = recentProviderMatchFixture().appearance;
    expect(
      matchMvpDisplayName(
        recentProviderMatchFixture({
          kind: "not_played",
          listedExternalClubId: "10754",
          players: [{ ...appearance, externalClubId: "99", displayName: "davos282", isMvp: true }],
        }),
      ),
    ).toBeNull();
  });

  it("prefers the named MVP in the match roster", () => {
    const appearance = recentProviderMatchFixture().appearance;
    expect(
      matchMvpDisplayName(
        recentProviderMatchFixture({
          appearance: { isMvp: false },
          players: [{ ...appearance, displayName: "Rival Cap", isMvp: true }],
        }),
      ),
    ).toBe("Rival Cap");
  });
});
