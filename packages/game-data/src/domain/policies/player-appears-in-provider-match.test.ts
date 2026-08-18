import { describe, expect, it } from "vite-plus/test";
import type { ProviderMatch, ProviderPlayerMatchStats } from "../entities/provider-match.ts";
import { findPlayerAppearance, findPlayerAppearances } from "./player-appears-in-provider-match.ts";

describe("findPlayerAppearances", () => {
  it("returns every roster row that matches the account", () => {
    const match = providerMatch([
      playerStats({ displayName: "davos282", externalClubId: "2", goals: 3 }),
      playerStats({ displayName: "Rival", externalClubId: "10754" }),
      playerStats({ displayName: "davos282", externalClubId: "10754", goals: 1 }),
    ]);

    expect(
      findPlayerAppearances(match, [
        {
          identifier: "davos282",
          normalizedIdentifier: "davos282",
          providerExternalPlayerId: null,
        },
      ]),
    ).toEqual([
      expect.objectContaining({ externalClubId: "2", goals: 3 }),
      expect.objectContaining({ externalClubId: "10754", goals: 1 }),
    ]);
  });

  it("returns an empty list when the player is not in the match", () => {
    const match = providerMatch([playerStats({ displayName: "Rival", externalClubId: "10754" })]);
    expect(
      findPlayerAppearances(match, [
        {
          identifier: "davos282",
          normalizedIdentifier: "davos282",
          providerExternalPlayerId: null,
        },
      ]),
    ).toEqual([]);
  });
});

describe("findPlayerAppearance", () => {
  it("returns the first matching roster row", () => {
    const match = providerMatch([
      playerStats({ displayName: "davos282", externalClubId: "2" }),
      playerStats({ displayName: "davos282", externalClubId: "10754" }),
    ]);
    expect(
      findPlayerAppearance(match, [
        {
          identifier: "davos282",
          normalizedIdentifier: "davos282",
          providerExternalPlayerId: null,
        },
      ])?.externalClubId,
    ).toBe("2");
  });
});

function providerMatch(players: readonly ProviderPlayerMatchStats[]): ProviderMatch {
  return {
    id: "ea-clubs:1",
    provider: { key: "ea-clubs", externalMatchId: "1" },
    game: { edition: "fc26", platform: "common-gen5", mode: "friendlyMatch" },
    occurredAt: new Date("2026-08-01T00:00:00.000Z"),
    home: { externalClubId: "10754", name: "Home", goals: 1, imageUrl: null },
    away: { externalClubId: "2", name: "Away", goals: 0, imageUrl: null },
    players,
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
