import { describe, expect, it } from "vite-plus/test";
import type { ProviderPlayerMatchStats } from "../entities/provider-match.ts";
import { computePlayerAttributeOverview } from "./player-attribute-overview.ts";
import { buildPlayerGameProfile, type PlayerGameAppearanceSample } from "./player-game-profile.ts";
import { playerPitchRole } from "./player-pitch-role.ts";

function stats(overrides: Partial<ProviderPlayerMatchStats> = {}): ProviderPlayerMatchStats {
  return {
    externalPlayerId: "p-1",
    displayName: "davos282",
    externalClubId: "club-1",
    position: "forward",
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
    rating: 6.6,
    ...overrides,
  };
}

function sample(
  overrides: Omit<Partial<PlayerGameAppearanceSample>, "appearance"> & {
    readonly appearance?: Partial<ProviderPlayerMatchStats>;
  } = {},
): PlayerGameAppearanceSample {
  const appearance = stats(overrides.appearance);
  return {
    occurredAt: overrides.occurredAt ?? new Date("2026-08-01T00:00:00.000Z"),
    clubId: overrides.clubId ?? "club-1",
    clubName: overrides.clubName ?? "Night Owls",
    position: overrides.position ?? appearance.position,
    role: overrides.role ?? playerPitchRole(appearance.position),
    outcome: overrides.outcome ?? "win",
    appearance,
  };
}

describe("playerPitchRole", () => {
  it("maps common provider positions", () => {
    expect(playerPitchRole("forward")).toBe("attack");
    expect(playerPitchRole("midfielder")).toBe("midfield");
    expect(playerPitchRole("defender")).toBe("defense");
    expect(playerPitchRole("goalkeeper")).toBe("goalkeeper");
    expect(playerPitchRole(null)).toBe("unknown");
  });
});

describe("computePlayerAttributeOverview", () => {
  it("scores attack goals-per-match at the documented 30% weight", () => {
    const samples = Array.from({ length: 28 }, (_, index) =>
      sample({
        occurredAt: new Date(Date.UTC(2026, 7, index + 1)),
        appearance: { goals: index < 4 ? 1 : 0, shots: 0, rating: null, position: "forward" },
        role: "attack",
        outcome: "draw",
      }),
    );
    const attack = computePlayerAttributeOverview(samples).find((row) => row.category === "attack");
    const goals = attack?.components.find((row) => row.key === "goalsPerMatch");
    expect(goals?.raw).toBeCloseTo(4 / 28, 5);
    expect(goals?.points).toBe(4);
    expect(goals?.sampleCount).toBe(28);
  });

  it("awards full discipline when the player has no red cards", () => {
    const samples = [sample({ appearance: { redCards: 0 } })];
    const discipline = computePlayerAttributeOverview(samples).find(
      (row) => row.category === "discipline",
    );
    expect(discipline?.score).toBe(100);
  });
});

describe("buildPlayerGameProfile", () => {
  it("summarizes played matches by team and position", () => {
    const profile = buildPlayerGameProfile([
      sample({
        clubId: "club-1",
        clubName: "Night Owls",
        appearance: { position: "forward", goals: 2 },
        role: "attack",
        outcome: "win",
      }),
      sample({
        occurredAt: new Date("2026-08-02T00:00:00.000Z"),
        clubId: "club-2",
        clubName: "Rival FC",
        appearance: { position: "midfielder", goals: 0, externalClubId: "club-2" },
        role: "midfield",
        outcome: "loss",
      }),
    ]);

    expect(profile.sampleSize).toBe(2);
    expect(profile.identity).toEqual({
      displayName: "davos282",
      preferredPosition: "forward",
      preferredRole: "attack",
    });
    expect(profile.summary.wins).toBe(1);
    expect(profile.summary.losses).toBe(1);
    expect(profile.summary.totals.goals).toBe(2);
    expect(profile.byTeam).toHaveLength(2);
    expect(profile.byPosition.map((row) => row.position)).toEqual(["forward", "midfielder"]);
    expect(profile.evolution).toEqual([
      {
        occurredAt: new Date("2026-08-01T00:00:00.000Z"),
        rating: 6.6,
        outcome: "win",
      },
      {
        occurredAt: new Date("2026-08-02T00:00:00.000Z"),
        rating: 6.6,
        outcome: "loss",
      },
    ]);
    expect(profile).not.toHaveProperty("elo");
  });

  it("orders evolution chronologically and keeps null ratings with outcomes", () => {
    const profile = buildPlayerGameProfile([
      sample({
        occurredAt: new Date("2026-08-02T00:00:00.000Z"),
        outcome: "draw",
        appearance: { rating: 7.1 },
      }),
      sample({
        occurredAt: new Date("2026-08-01T00:00:00.000Z"),
        outcome: "unknown",
        appearance: { rating: null },
      }),
    ]);

    expect(profile.evolution).toEqual([
      {
        occurredAt: new Date("2026-08-01T00:00:00.000Z"),
        rating: null,
        outcome: "unknown",
      },
      {
        occurredAt: new Date("2026-08-02T00:00:00.000Z"),
        rating: 7.1,
        outcome: "draw",
      },
    ]);
  });

  it("returns empty aggregates when there are no played matches", () => {
    const profile = buildPlayerGameProfile([], "Davos282");
    expect(profile.sampleSize).toBe(0);
    expect(profile.identity.displayName).toBe("Davos282");
    expect(profile.identity.preferredPosition).toBeNull();
    expect(profile.evolution).toEqual([]);
    expect(profile).not.toHaveProperty("elo");
    expect(profile.summary.matchesPlayed).toBe(0);
    expect(profile.attributes).toHaveLength(5);
  });
});
