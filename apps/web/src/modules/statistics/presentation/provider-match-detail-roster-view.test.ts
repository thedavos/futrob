import { describe, expect, it } from "vite-plus/test";
import { recentProviderMatchDetailFixture } from "./player-matches-page.fixtures.ts";
import {
  providerMatchRosterModel,
  type ProviderPlayer,
  type ProviderRosterPlayer,
} from "./provider-match-detail-model.ts";
import {
  isRosterWinner,
  matchRosterAwards,
  ratioLabel,
  ratingBadgeVariant,
  ratingTone,
  rosterPlayerBadges,
  type MatchRosterAwards,
} from "./provider-match-detail-roster-view.ts";

const numberFormat = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 });

describe("rosterPlayerBadges", () => {
  it("keeps Tú and MVP when more than two awards apply", () => {
    const player = rosterPlayer("Alpha", { isMvp: true, goals: 3, assists: 4, tacklesMade: 6 });
    expect(rosterPlayerBadges(player, awardsFor(player.player))).toEqual(["you", "mvp"]);
  });

  it("shows Goleador and Playmaker when the row is not personal", () => {
    const player = rosterPlayer("Finisher", {
      isPersonal: false,
      isMvp: false,
      goals: 3,
      assists: 4,
    });
    expect(rosterPlayerBadges(player, awardsFor(player.player))).toEqual(["scorer", "playmaker"]);
  });

  it("shows Playmaker and Asistente when those are the highest awards", () => {
    const player = rosterPlayer("Creator", { isPersonal: false, isMvp: false });
    expect(
      rosterPlayerBadges(player, {
        mvp: null,
        scorer: null,
        playmaker: player.player,
        assister: player.player,
        defender: null,
      }),
    ).toEqual(["playmaker", "assister"]);
  });

  it("caps at two badges in priority order", () => {
    const player = rosterPlayer("Wall", {
      isPersonal: false,
      isMvp: true,
      goals: 2,
      tacklesMade: 8,
    });
    expect(rosterPlayerBadges(player, awardsFor(player.player))).toEqual(["mvp", "scorer"]);
  });
});

describe("ratingTone", () => {
  it("maps FIFA-style bands onto design-system badge variants", () => {
    expect(ratingTone(null)).toBe("normal");
    expect(ratingTone(6.9)).toBe("normal");
    expect(ratingTone(7)).toBe("good");
    expect(ratingTone(8.8)).toBe("good");
    expect(ratingTone(9)).toBe("excellent");
    expect(ratingTone(10)).toBe("excellent");
    expect(ratingBadgeVariant("normal")).toBe("outline");
    expect(ratingBadgeVariant("good")).toBe("primary");
    expect(ratingBadgeVariant("excellent")).toBe("primary");
  });
});

describe("isRosterWinner", () => {
  it("marks only the club with more goals", () => {
    const home = { externalClubId: "1", name: "Home", goals: 3, imageUrl: null };
    const away = { externalClubId: "2", name: "Away", goals: 2, imageUrl: null };
    expect(isRosterWinner(home, away)).toBe(true);
    expect(isRosterWinner(away, home)).toBe(false);
    expect(isRosterWinner(home, { ...away, goals: 3 })).toBe(false);
  });
});

describe("ratioLabel", () => {
  it("formats completed over attempted and keeps unknown as an em dash", () => {
    expect(ratioLabel(25, 31, numberFormat)).toBe("25/31");
    expect(ratioLabel(0, 2, numberFormat)).toBe("0/2");
    expect(ratioLabel(null, 8, numberFormat)).toBe("—");
    expect(ratioLabel(6, null, numberFormat)).toBe("—");
  });
});

describe("matchRosterAwards", () => {
  it("awards defender by tackle volume and playmaker by pass ratio with a sample floor", () => {
    const detail = recentProviderMatchDetailFixture({
      listedExternalClubId: "10754",
      players: [
        {
          ...rosterPlayer("Finisher", {
            goals: 3,
            tacklesMade: 6,
            tackleAttempts: 12,
            passesMade: 20,
            passAttempts: 28,
          }).player,
        },
        {
          ...rosterPlayer("Wall", {
            isPersonal: false,
            goals: 0,
            tacklesMade: 4,
            tackleAttempts: 5,
            passesMade: 8,
            passAttempts: 12,
          }).player,
          externalClubId: "99",
        },
        {
          ...rosterPlayer("Support", {
            goals: 0,
            assists: 2,
            tacklesMade: 2,
            tackleAttempts: 4,
            passesMade: 18,
            passAttempts: 20,
          }).player,
        },
        {
          ...rosterPlayer("Perfect Few", {
            goals: 0,
            tacklesMade: 1,
            tackleAttempts: 1,
            passesMade: 4,
            passAttempts: 4,
          }).player,
        },
      ],
    });

    const awards = matchRosterAwards(providerMatchRosterModel(detail));

    expect(awards.scorer?.displayName).toBe("Finisher");
    expect(awards.defender?.displayName).toBe("Finisher");
    expect(awards.playmaker?.displayName).toBe("Support");
    expect(awards.assister?.displayName).toBe("Support");
  });
});

function awardsFor(player: ProviderPlayer): MatchRosterAwards {
  return {
    mvp: player.isMvp ? player : null,
    scorer: player,
    playmaker: player,
    assister: player,
    defender: player,
  };
}

function rosterPlayer(
  displayName: string,
  overrides: Partial<ProviderPlayer> & { readonly isPersonal?: boolean } = {},
): ProviderRosterPlayer {
  const { isPersonal = true, ...playerOverrides } = overrides;
  return {
    isPersonal,
    player: {
      externalPlayerId: displayName.toLowerCase(),
      displayName,
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
      rating: 8,
      ...playerOverrides,
    },
  };
}
