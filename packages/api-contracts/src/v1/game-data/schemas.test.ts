import { describe, expect, it } from "vite-plus/test";
import { getMyRecentMatchesResponseSchema } from "./schemas.ts";

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
});
