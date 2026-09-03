import { describe, expect, it } from "vite-plus/test";
import { recentProviderMatchDetailFixture } from "./player-matches-page.fixtures.ts";
import {
  PROVIDER_PLAYER_METRICS,
  comparisonBarShares,
  listedMatchFromDetail,
  providerMatchDetailModel,
  providerMatchRosterModel,
  providerPositionLabelKey,
  providerPositionShortLabelKey,
} from "./provider-match-detail-model.ts";
import {
  MIN_PLAYMAKER_PASS_ATTEMPTS,
  matchRatioLeader,
  matchVolumeRatioLeader,
} from "./provider-match-detail-ranking.ts";

describe("provider match detail model", () => {
  it("puts the selected away club first and sorts rating descending with null last", () => {
    const played = recentProviderMatchDetailFixture({
      listedExternalClubId: "99",
      home: {
        externalClubId: "10754",
        name: "Home",
        goals: 1,
        imageUrl: null,
      },
      away: {
        externalClubId: "99",
        name: "Selected away",
        goals: 2,
        imageUrl: null,
      },
      players: [
        player("Zulu", "99", 8),
        player("Alpha", "99", 8),
        player("Unknown", "99", null),
        player("Opponent", "10754", 9),
      ],
      appearance: {
        externalPlayerId: "alpha",
        externalClubId: "99",
        displayName: "Alpha",
      },
    });

    const model = providerMatchRosterModel(played);

    expect(model.selected.team.name).toBe("Selected away");
    expect(model.opponent.team.name).toBe("Home");
    expect(model.selected.players.map((entry) => entry.player.displayName)).toEqual([
      "Alpha",
      "Zulu",
      "Unknown",
    ]);
    expect(model.selected.players.map((entry) => entry.isPersonal)).toEqual([true, false, false]);
  });

  it("does not mark a personal row for not_played detail", () => {
    const notPlayed = recentProviderMatchDetailFixture({
      kind: "not_played",
      listedExternalClubId: "10754",
      players: [player("Davos282", "10754", 7.5)],
    });

    const model = providerMatchRosterModel(notPlayed);

    expect(model.selected.players[0]?.isPersonal).toBe(false);
  });

  it("registers every persisted player stat shown by the detail except the MVP badge", () => {
    expect(PROVIDER_PLAYER_METRICS.map((metric) => metric.key)).toEqual([
      "position",
      "minutesPlayed",
      "goals",
      "assists",
      "shots",
      "passAttempts",
      "passesMade",
      "tackleAttempts",
      "tacklesMade",
      "saves",
      "yellowCards",
      "redCards",
      "rating",
    ]);
    expect(PROVIDER_PLAYER_METRICS.every((metric) => metric.labelKey.length > 0)).toBe(true);
  });

  it("maps known positions and leaves abbreviations unchanged", () => {
    expect(providerPositionLabelKey("goalkeeper")).toBe("player.matchDetail.position.goalkeeper");
    expect(providerPositionShortLabelKey("goalkeeper")).toBe(
      "player.matchDetail.position.short.goalkeeper",
    );
    expect(providerPositionLabelKey("ST")).toBeNull();
    expect(providerPositionShortLabelKey("ST")).toBeNull();
  });

  it("strips roster players and names the listed-club MVP for the scoreboard row", () => {
    const detail = recentProviderMatchDetailFixture({
      listedExternalClubId: "99",
      home: { externalClubId: "10754", name: "Home", goals: 1, imageUrl: null },
      away: { externalClubId: "99", name: "Selected away", goals: 2, imageUrl: null },
      appearance: { isMvp: false },
      players: [
        player("Zulu", "99", 8),
        { ...player("Alpha", "99", 8), isMvp: true },
        { ...player("Opponent", "10754", 9), isMvp: true },
      ],
    });

    const listed = listedMatchFromDetail(detail);

    expect("players" in listed.match).toBe(false);
    expect(listed.listedMvpDisplayName).toBe("Alpha");
    expect(listed.kind).toBe("played");
  });

  it("does not stamp an opponent MVP onto the listed scoreboard row", () => {
    const detail = recentProviderMatchDetailFixture({
      listedExternalClubId: "99",
      home: { externalClubId: "10754", name: "Home", goals: 1, imageUrl: null },
      away: { externalClubId: "99", name: "Selected away", goals: 2, imageUrl: null },
      appearance: { isMvp: false, externalClubId: "99" },
      players: [player("Alpha", "99", 8), { ...player("Opponent", "10754", 9), isMvp: true }],
    });

    expect(listedMatchFromDetail(detail).listedMvpDisplayName).toBeNull();
  });

  it("aggregates selected vs opponent team stats and pass accuracy", () => {
    const detail = recentProviderMatchDetailFixture({
      listedExternalClubId: "99",
      home: { externalClubId: "10754", name: "Home", goals: 1, imageUrl: null },
      away: { externalClubId: "99", name: "Selected away", goals: 2, imageUrl: null },
      players: [
        {
          ...player("Alpha", "99", 8),
          shots: 4,
          passesMade: 20,
          passAttempts: 25,
          tacklesMade: 3,
          redCards: 0,
          yellowCards: 1,
          assists: 1,
        },
        {
          ...player("Zulu", "99", 7),
          shots: 2,
          passesMade: 10,
          passAttempts: 15,
          tacklesMade: 1,
          redCards: 1,
          yellowCards: 0,
          assists: 0,
        },
        {
          ...player("Opponent", "10754", 9),
          shots: 8,
          passesMade: 30,
          passAttempts: 40,
          tacklesMade: 5,
          redCards: 0,
          yellowCards: 0,
          assists: 2,
        },
      ],
    });

    const comparison = providerMatchDetailModel(detail).comparison;

    expect(comparison.selected.team.name).toBe("Selected away");
    expect(comparison.selected.stats.goals).toEqual({ kind: "ready", value: 2 });
    expect(comparison.selected.stats.shots).toEqual({ kind: "ready", value: 6 });
    expect(comparison.selected.stats.passesMade).toEqual({ kind: "ready", value: 30 });
    expect(comparison.selected.stats.passAccuracy).toEqual({ kind: "ready", value: 0.75 });
    expect(comparison.selected.stats.tacklesMade).toEqual({ kind: "ready", value: 4 });
    expect(comparison.selected.stats.redCards).toEqual({ kind: "ready", value: 1 });
    expect(comparison.selected.stats.yellowCards).toEqual({ kind: "ready", value: 1 });
    expect(comparison.opponent.stats.shots).toEqual({ kind: "ready", value: 8 });
    expect(
      comparisonBarShares(comparison.selected.stats.goals, comparison.opponent.stats.goals),
    ).toEqual({ selected: 100, opponent: 50 });
  });

  it("treats a roster with any missing player stat as unknown for that team total", () => {
    const detail = recentProviderMatchDetailFixture({
      listedExternalClubId: "99",
      home: { externalClubId: "10754", name: "Home", goals: 1, imageUrl: null },
      away: { externalClubId: "99", name: "Selected away", goals: 2, imageUrl: null },
      players: [
        { ...player("Alpha", "99", 8), yellowCards: 1 },
        { ...player("Zulu", "99", 7), yellowCards: null },
        { ...player("Opponent", "10754", 9), yellowCards: 0 },
      ],
    });

    const comparison = providerMatchDetailModel(detail).comparison;

    expect(comparison.selected.stats.yellowCards).toEqual({ kind: "unknown" });
    expect(comparison.opponent.stats.yellowCards).toEqual({ kind: "ready", value: 0 });
    expect(comparison.selected.stats.goals).toEqual({ kind: "ready", value: 2 });
  });

  it("treats an empty roster as unknown for player-derived stats", () => {
    const detail = recentProviderMatchDetailFixture({
      players: [],
    });

    const comparison = providerMatchDetailModel(detail).comparison;

    expect(comparison.selected.stats.shots).toEqual({ kind: "unknown" });
    expect(comparison.selected.stats.passAccuracy).toEqual({ kind: "unknown" });
    expect(comparison.selected.stats.goals).toEqual({ kind: "ready", value: 2 });
  });

  it("treats a team with no known passing stats as unknown accuracy", () => {
    const detail = recentProviderMatchDetailFixture({
      players: [{ ...player("Ghost", "10754", null), passesMade: null, passAttempts: null }],
    });

    expect(providerMatchDetailModel(detail).comparison.selected.stats.passAccuracy).toEqual({
      kind: "unknown",
    });
  });

  it("orders highlights as MVP, top scorer, playmaker, then best opponent", () => {
    const detail = recentProviderMatchDetailFixture({
      listedExternalClubId: "10754",
      home: { externalClubId: "10754", name: "Home", goals: 3, imageUrl: null },
      away: { externalClubId: "99", name: "Away", goals: 2, imageUrl: null },
      players: [
        { ...player("Home Cap", "10754", 8.1), isMvp: true, goals: 1, assists: 1 },
        { ...player("Home Finisher", "10754", 7.2), goals: 3, assists: 0 },
        { ...player("Home Creator", "10754", 7.0), goals: 0, assists: 2 },
        { ...player("Away Star", "99", 8.8), goals: 2, assists: 1 },
        { ...player("Away Reserve", "99", 6.1), goals: 0, assists: 0 },
      ],
    });

    expect(
      providerMatchDetailModel(detail).highlights.items.map((item) => [
        item.kind,
        item.player.displayName,
      ]),
    ).toEqual([
      ["mvp", "Home Cap"],
      ["scorer", "Home Finisher"],
      ["playmaker", "Home Creator"],
      ["rival", "Away Star"],
    ]);
  });

  it("picks the playmaker by assists, then rating, then original index", () => {
    const detail = recentProviderMatchDetailFixture({
      listedExternalClubId: "10754",
      players: [
        { ...player("Earlier Equal", "10754", 8.0), assists: 2 },
        { ...player("Later Equal", "10754", 8.0), assists: 2 },
        { ...player("Higher Rated", "99", 9.1), assists: 2 },
        { ...player("Fewer Assists", "99", 9.9), assists: 1 },
      ],
    });

    expect(providerMatchDetailModel(detail).highlights.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "playmaker",
          assists: 2,
          player: expect.objectContaining({ displayName: "Higher Rated" }),
        }),
      ]),
    );
  });

  it("breaks equal assist and rating playmaker ties by original index", () => {
    const detail = recentProviderMatchDetailFixture({
      listedExternalClubId: "10754",
      players: [
        { ...player("Earlier Creator", "10754", 8.0), assists: 2 },
        { ...player("Later Creator", "99", 8.0), assists: 2 },
      ],
    });

    const playmaker = providerMatchDetailModel(detail).highlights.items.find(
      (item) => item.kind === "playmaker",
    );
    expect(playmaker?.player.displayName).toBe("Earlier Creator");
  });

  it("omits the playmaker highlight when nobody recorded an assist", () => {
    const detail = recentProviderMatchDetailFixture({
      listedExternalClubId: "10754",
      players: [
        { ...player("Home Cap", "10754", 8.1), isMvp: true, goals: 1, assists: 0 },
        { ...player("Home Finisher", "10754", 7.2), goals: 3, assists: 0 },
        { ...player("Away Star", "99", 8.8), goals: 2, assists: 0 },
      ],
    });

    expect(providerMatchDetailModel(detail).highlights.items.map((item) => item.kind)).toEqual([
      "mvp",
      "scorer",
      "rival",
    ]);
  });

  it("omits the MVP highlight when no player is flagged", () => {
    const detail = recentProviderMatchDetailFixture({
      players: [
        { ...player("Quiet", "10754", 7.1), isMvp: false, goals: 0 },
        { ...player("Loud", "99", 8.9), isMvp: false, goals: 0 },
      ],
    });

    expect(providerMatchDetailModel(detail).highlights.items.map((item) => item.kind)).toEqual([
      "rival",
    ]);
  });
});

describe("matchRatioLeader", () => {
  it("picks the higher completed-to-attempted ratio", () => {
    expect(
      matchRatioLeader(
        [
          { ...player("Spray", "10754", 8), tacklesMade: 6, tackleAttempts: 12 },
          { ...player("Precise", "99", 7), tacklesMade: 4, tackleAttempts: 5 },
        ],
        (entry) => entry.tacklesMade,
        (entry) => entry.tackleAttempts,
      )?.displayName,
    ).toBe("Precise");
  });

  it("breaks equal ratios with more attempts, then rating, then original index", () => {
    expect(
      matchRatioLeader(
        [
          { ...player("Small Sample", "10754", 9), passesMade: 3, passAttempts: 3 },
          { ...player("Large Sample", "99", 7), passesMade: 10, passAttempts: 10 },
        ],
        (entry) => entry.passesMade,
        (entry) => entry.passAttempts,
      )?.displayName,
    ).toBe("Large Sample");

    expect(
      matchRatioLeader(
        [
          { ...player("Earlier", "10754", 8), passesMade: 8, passAttempts: 10 },
          { ...player("Later Higher Rated", "99", 9), passesMade: 8, passAttempts: 10 },
        ],
        (entry) => entry.passesMade,
        (entry) => entry.passAttempts,
      )?.displayName,
    ).toBe("Later Higher Rated");

    expect(
      matchRatioLeader(
        [
          { ...player("Earlier Equal", "10754", 8), passesMade: 8, passAttempts: 10 },
          { ...player("Later Equal", "99", 8), passesMade: 8, passAttempts: 10 },
        ],
        (entry) => entry.passesMade,
        (entry) => entry.passAttempts,
      )?.displayName,
    ).toBe("Earlier Equal");
  });

  it("skips unknown, zero attempts, and zero completed actions", () => {
    expect(
      matchRatioLeader(
        [
          { ...player("Unknown", "10754", 9), tacklesMade: null, tackleAttempts: 4 },
          { ...player("No Tries", "10754", 9), tacklesMade: 2, tackleAttempts: 0 },
          { ...player("Missed All", "99", 9), tacklesMade: 0, tackleAttempts: 8 },
        ],
        (entry) => entry.tacklesMade,
        (entry) => entry.tackleAttempts,
      ),
    ).toBeNull();
  });

  it("ignores samples below the minimum attempt floor", () => {
    expect(
      matchRatioLeader(
        [
          { ...player("Perfect Few", "10754", 9), passesMade: 4, passAttempts: 4 },
          { ...player("Good Enough", "99", 7), passesMade: 9, passAttempts: 10 },
        ],
        (entry) => entry.passesMade,
        (entry) => entry.passAttempts,
        MIN_PLAYMAKER_PASS_ATTEMPTS,
      )?.displayName,
    ).toBe("Good Enough");
  });
});

describe("matchVolumeRatioLeader", () => {
  it("picks more completed actions over a better ratio", () => {
    expect(
      matchVolumeRatioLeader(
        [
          { ...player("Spray", "10754", 7), tacklesMade: 6, tackleAttempts: 12 },
          { ...player("Precise", "99", 9), tacklesMade: 4, tackleAttempts: 5 },
        ],
        (entry) => entry.tacklesMade,
        (entry) => entry.tackleAttempts,
      )?.displayName,
    ).toBe("Spray");
  });

  it("breaks equal volume with ratio, then rating, then original index", () => {
    expect(
      matchVolumeRatioLeader(
        [
          { ...player("Messy", "10754", 9), tacklesMade: 6, tackleAttempts: 12 },
          { ...player("Clean", "99", 7), tacklesMade: 6, tackleAttempts: 8 },
        ],
        (entry) => entry.tacklesMade,
        (entry) => entry.tackleAttempts,
      )?.displayName,
    ).toBe("Clean");

    expect(
      matchVolumeRatioLeader(
        [
          { ...player("Unknown Attempts", "10754", 9), tacklesMade: 6, tackleAttempts: null },
          { ...player("Known Attempts", "99", 7), tacklesMade: 6, tackleAttempts: 10 },
        ],
        (entry) => entry.tacklesMade,
        (entry) => entry.tackleAttempts,
      )?.displayName,
    ).toBe("Known Attempts");

    expect(
      matchVolumeRatioLeader(
        [
          { ...player("Earlier", "10754", 8), tacklesMade: 4, tackleAttempts: 8 },
          { ...player("Later Higher Rated", "99", 9), tacklesMade: 4, tackleAttempts: 8 },
        ],
        (entry) => entry.tacklesMade,
        (entry) => entry.tackleAttempts,
      )?.displayName,
    ).toBe("Later Higher Rated");
  });
});

function player(displayName: string, externalClubId: string, rating: number | null) {
  return {
    externalPlayerId: displayName.toLowerCase(),
    displayName,
    externalClubId,
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
    rating,
  };
}
