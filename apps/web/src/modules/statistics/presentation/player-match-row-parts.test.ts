import { EqualsIcon, TrendDownIcon, TrophyIcon } from "@phosphor-icons/react";
import { describe, expect, it } from "vite-plus/test";

import { matchOutcomeIcon } from "./player-match-row-parts.tsx";

describe("matchOutcomeIcon", () => {
  it("maps each rated outcome to the same icons as the record stats", () => {
    expect(matchOutcomeIcon("win")).toBe(TrophyIcon);
    expect(matchOutcomeIcon("draw")).toBe(EqualsIcon);
    expect(matchOutcomeIcon("loss")).toBe(TrendDownIcon);
  });
});
