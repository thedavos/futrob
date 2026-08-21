import { describe, expect, it } from "vite-plus/test";
import type { ProviderPlayerMatchStats } from "@futrob/game-data";
import { rollUpSlotPlayers } from "./project-official-result-projection.ts";

function player(overrides: Partial<ProviderPlayerMatchStats> = {}): ProviderPlayerMatchStats {
  return {
    externalPlayerId: "p1",
    displayName: "Player One",
    externalClubId: "club-1",
    position: null,
    minutesPlayed: 90,
    goals: 0,
    assists: 0,
    shots: 0,
    passAttempts: 0,
    passesMade: 0,
    tackleAttempts: 0,
    tacklesMade: 0,
    saves: null,
    yellowCards: 0,
    redCards: 0,
    isMvp: false,
    rating: null,
    ...overrides,
  };
}

describe("rollUpSlotPlayers", () => {
  it("sums complete team metrics across players", () => {
    const rollup = rollUpSlotPlayers([player({ goals: 2 }), player({ goals: 1 })]);
    expect(rollup.goals).toBe(3);
  });

  it("keeps a team metric unknown when any player row lacks it", () => {
    const rollup = rollUpSlotPlayers([
      player({ goals: 2 }),
      player({ goals: null, externalPlayerId: "p2" }),
    ]);
    expect(rollup.goals).toBeNull();
  });

  it("keeps team rating unknown when any player lacks a rating", () => {
    const partial = rollUpSlotPlayers([
      player({ rating: 8.0 }),
      player({ rating: null, externalPlayerId: "p2" }),
    ]);
    expect(partial.rating).toBeNull();

    const complete = rollUpSlotPlayers([
      player({ rating: 8.0 }),
      player({ rating: 6.0, externalPlayerId: "p2" }),
    ]);
    expect(complete.rating).toBe(7.0);
  });

  it("rolls minutes up as match duration (max stint), not summed player minutes", () => {
    const rollup = rollUpSlotPlayers([
      player({ minutesPlayed: 90 }),
      player({ minutesPlayed: 60, externalPlayerId: "p2" }),
      player({ minutesPlayed: 45, externalPlayerId: "p3" }),
    ]);
    expect(rollup.minutesPlayed).toBe(90);
  });
});
