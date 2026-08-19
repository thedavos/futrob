import { describe, expect, it } from "vite-plus/test";
import { recentProviderMatchFixture } from "./player-matches-page.fixtures.ts";
import {
  appearanceContribution,
  calendarDayKind,
  filterMatchesByMode,
  formTimeline,
  groupMatchesByDay,
  isDnfMatch,
  lastFormGames,
  listedClubId,
  matchesForView,
  matchMvpDisplayName,
  matchOutcome,
  opponentClubName,
  playerMatchSide,
  ratingTrendVsLast,
  scoringFeat,
  scoringFeatPlayerName,
  showsContributionStats,
  showsMatchTypeBadge,
  showsPerformanceStats,
  showsRecentForm,
  showsRedCards,
  showsYellowCards,
  sortMatchesByOccurredAt,
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

describe("appearanceContribution", () => {
  it("classifies contributed, blank and unknown appearances", () => {
    expect(appearanceContribution({ goals: 1, assists: 0 })).toBe("contributed");
    expect(appearanceContribution({ goals: null, assists: 2 })).toBe("contributed");
    expect(appearanceContribution({ goals: 0, assists: 0 })).toBe("blank");
    expect(appearanceContribution({ goals: null, assists: null })).toBe("unknown");
    expect(appearanceContribution({ goals: 0, assists: null })).toBe("unknown");
    expect(appearanceContribution({ goals: null, assists: 0 })).toBe("unknown");
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
      goalsPlusAssists: 3,
      averageRating: 7,
      contributions: {
        playedAppearances: 3,
        contributed: { kind: "ready", contributed: 3, known: 3 },
        pace: { kind: "ready", rate: 1 },
        teamGoalShare: { kind: "ready", ratio: 1 },
      },
    });
  });

  it("returns null goals, assists and G+A when every appearance omits them", () => {
    const summary = summarizeMatchRecord([
      recentProviderMatchFixture({ appearance: { goals: null, assists: null, rating: null } }),
    ]);
    expect(summary.goals).toBeNull();
    expect(summary.assists).toBeNull();
    expect(summary.goalsPlusAssists).toBeNull();
    expect(summary.averageRating).toBeNull();
    expect(summary.contributions).toEqual({
      playedAppearances: 1,
      contributed: { kind: "unknown" },
      pace: { kind: "unknown" },
      teamGoalShare: { kind: "unknown" },
    });
  });

  it("counts G+A from whichever of goals or assists is present", () => {
    const summary = summarizeMatchRecord([
      recentProviderMatchFixture({ appearance: { goals: 2, assists: null } }),
    ]);
    expect(summary.goals).toBe(2);
    expect(summary.assists).toBeNull();
    expect(summary.goalsPlusAssists).toBe(2);
    expect(summary.contributions.contributed).toEqual({
      kind: "ready",
      contributed: 1,
      known: 1,
    });
    expect(summary.contributions.pace).toEqual({ kind: "ready", rate: 2 });
    expect(summary.contributions.teamGoalShare).toEqual({ kind: "ready", ratio: 1 });
  });

  it("returns a null average when no ratings exist", () => {
    const summary = summarizeMatchRecord([
      recentProviderMatchFixture({ appearance: { rating: null } }),
    ]);
    expect(summary.averageRating).toBeNull();
    expect(showsPerformanceStats(summary)).toBe(false);
  });

  it("shows contribution stats when G+A is known, including zero", () => {
    expect(showsContributionStats(summarizeMatchRecord([recentProviderMatchFixture()]))).toBe(true);
    expect(
      showsContributionStats(
        summarizeMatchRecord([
          recentProviderMatchFixture({ appearance: { goals: 0, assists: 0 } }),
        ]),
      ),
    ).toBe(true);
  });

  it("hides contribution stats when G+A is missing", () => {
    expect(
      showsContributionStats(
        summarizeMatchRecord([
          recentProviderMatchFixture({ appearance: { goals: null, assists: null } }),
        ]),
      ),
    ).toBe(false);
    expect(
      showsContributionStats(
        summarizeMatchRecord([recentProviderMatchFixture({ kind: "not_played" })]),
      ),
    ).toBe(false);
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
      goalsPlusAssists: 2,
      averageRating: 8,
      contributions: {
        playedAppearances: 1,
        contributed: { kind: "ready", contributed: 1, known: 1 },
        pace: { kind: "ready", rate: 2 },
        teamGoalShare: { kind: "ready", ratio: 0.5 },
      },
    });
  });

  it("treats 0 G+A as a blank appearance and ignores unknown G+A in the ratio", () => {
    const summary = summarizeMatchRecord([
      recentProviderMatchFixture({ appearance: { goals: 1, assists: 0 } }),
      recentProviderMatchFixture({
        id: "blank",
        appearance: { goals: 0, assists: 0 },
      }),
      recentProviderMatchFixture({
        id: "unknown",
        appearance: { goals: null, assists: null },
      }),
    ]);
    expect(summary.contributions.playedAppearances).toBe(3);
    expect(summary.contributions.contributed).toEqual({
      kind: "ready",
      contributed: 1,
      known: 2,
    });
    expect(summary.goalsPlusAssists).toBe(1);
    expect(summary.contributions.pace).toEqual({ kind: "ready", rate: 1 / 3 });
  });

  it("does not treat a one-sided null as a blank appearance", () => {
    const summary = summarizeMatchRecord([
      recentProviderMatchFixture({ appearance: { goals: null, assists: 0 } }),
    ]);
    expect(summary.contributions.playedAppearances).toBe(1);
    expect(summary.contributions.contributed).toEqual({ kind: "unknown" });
    expect(summary.contributions.pace).toEqual({ kind: "unknown" });
  });

  it("shares player goals against listed club goals from played matches", () => {
    const summary = summarizeMatchRecord([
      recentProviderMatchFixture({
        home: { externalClubId: "10754", name: "Fera", goals: 4, imageUrl: null },
        appearance: { goals: 3, assists: 1 },
      }),
      recentProviderMatchFixture({
        kind: "not_played",
        id: "not-played-goals",
        listedExternalClubId: "10754",
        home: { externalClubId: "10754", name: "Sirius", goals: 5, imageUrl: null },
        away: { externalClubId: "99", name: "Cuervos", goals: 0, imageUrl: null },
      }),
    ]);
    expect(summary.contributions.teamGoalShare).toEqual({ kind: "ready", ratio: 0.75 });
    expect(summary.contributions.pace).toEqual({ kind: "ready", rate: 4 });
  });

  it("marks goal share as noClubGoals when the club scored none", () => {
    const summary = summarizeMatchRecord([
      recentProviderMatchFixture({
        home: { externalClubId: "10754", name: "Fera", goals: 0, imageUrl: null },
        appearance: { goals: 0, assists: 0 },
      }),
    ]);
    expect(summary.contributions.teamGoalShare).toEqual({ kind: "noClubGoals" });
  });
});

describe("recent form", () => {
  it("needs at least two listed matches", () => {
    expect(showsRecentForm([recentProviderMatchFixture()])).toBe(false);
    expect(
      showsRecentForm([recentProviderMatchFixture(), recentProviderMatchFixture({ id: "second" })]),
    ).toBe(true);
  });

  it("orders the timeline oldest first and takes the last two", () => {
    const newest = recentProviderMatchFixture({
      id: "newest",
      occurredAt: new Date(2026, 7, 14, 18, 0).toISOString(),
      away: { externalClubId: "99", name: "Night Owls", goals: 1, imageUrl: null },
    });
    const oldest = recentProviderMatchFixture({
      id: "oldest",
      occurredAt: new Date(2026, 7, 1, 18, 0).toISOString(),
      away: { externalClubId: "44001", name: "Atlético Norte", goals: 1, imageUrl: null },
    });
    const middle = recentProviderMatchFixture({
      id: "middle",
      occurredAt: new Date(2026, 7, 13, 20, 0).toISOString(),
      away: { externalClubId: "33021", name: "Fera Barranco", goals: 1, imageUrl: null },
    });

    expect(formTimeline([newest, oldest, middle]).map((item) => item.match.id)).toEqual([
      "oldest",
      "middle",
      "newest",
    ]);
    expect(lastFormGames([newest, oldest, middle]).map((item) => item.match.id)).toEqual([
      "oldest",
      "middle",
      "newest",
    ]);
    const extra = recentProviderMatchFixture({
      id: "extra",
      occurredAt: new Date(2026, 6, 20, 18, 0).toISOString(),
    });
    expect(lastFormGames([newest, oldest, middle, extra]).map((item) => item.match.id)).toEqual([
      "oldest",
      "middle",
      "newest",
    ]);
    expect(opponentClubName(newest)).toBe("Night Owls");
  });
});

describe("ratingTrendVsLast", () => {
  it("returns null when there are not more matches than the window", () => {
    expect(
      ratingTrendVsLast(
        Array.from({ length: 5 }, (_, index) =>
          recentProviderMatchFixture({
            id: `m-${index}`,
            occurredAt: new Date(2026, 7, index + 1, 18, 0).toISOString(),
            appearance: { rating: 8 },
          }),
        ),
      ),
    ).toBeNull();
  });

  it("compares the last five ratings against the earlier matches", () => {
    const matches = [
      recentProviderMatchFixture({
        id: "old",
        occurredAt: new Date(2026, 7, 1, 18, 0).toISOString(),
        appearance: { rating: 7 },
      }),
      ...Array.from({ length: 5 }, (_, index) =>
        recentProviderMatchFixture({
          id: `recent-${index}`,
          occurredAt: new Date(2026, 7, index + 8, 18, 0).toISOString(),
          appearance: { rating: 8 },
        }),
      ),
    ];
    expect(ratingTrendVsLast(matches)).toEqual({ delta: 1, window: 5 });
  });

  it("returns a negative delta when the last five are worse", () => {
    const matches = [
      recentProviderMatchFixture({
        id: "old",
        occurredAt: new Date(2026, 7, 1, 18, 0).toISOString(),
        appearance: { rating: 9 },
      }),
      ...Array.from({ length: 5 }, (_, index) =>
        recentProviderMatchFixture({
          id: `recent-${index}`,
          occurredAt: new Date(2026, 7, index + 8, 18, 0).toISOString(),
          appearance: { rating: 7 },
        }),
      ),
    ];
    expect(ratingTrendVsLast(matches)?.delta).toBe(-2);
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

    expect(matchesForView(matches, "all")).toEqual(matches);
    expect(matchesForView(matches, "league")).toEqual([league]);
    expect(matchesForView(matches, "friendly")).toEqual([olderFriendly]);
    expect(matchesForView(matches, "playoff")).toEqual([]);
  });

  it("orders matches by occurredAt", () => {
    const league = recentProviderMatchFixture({
      id: "league",
      occurredAt: new Date(2026, 7, 14, 18, 0).toISOString(),
    });
    const olderFriendly = recentProviderMatchFixture({
      id: "friendly",
      occurredAt: new Date(2026, 7, 1, 18, 0).toISOString(),
    });
    const matches = [league, olderFriendly];

    expect(sortMatchesByOccurredAt(matches, "newest").map((item) => item.match.id)).toEqual([
      "league",
      "friendly",
    ]);
    expect(sortMatchesByOccurredAt(matches, "oldest").map((item) => item.match.id)).toEqual([
      "friendly",
      "league",
    ]);
  });
});

describe("showsMatchTypeBadge", () => {
  it("is only for Todos", () => {
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
