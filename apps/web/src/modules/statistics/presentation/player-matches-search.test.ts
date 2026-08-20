import { describe, expect, it } from "vite-plus/test";
import {
  normalizePlayerMatchesSearch,
  playerMatchesSearchSchema,
} from "./player-matches-search.ts";

describe("player matches search", () => {
  it("normalizes legacy and absent values for list and detail routes", () => {
    expect(normalizePlayerMatchesSearch(playerMatchesSearchSchema.parse({}))).toEqual({
      view: "all",
      sort: "newest",
    });
    expect(
      normalizePlayerMatchesSearch(playerMatchesSearchSchema.parse({ view: "recent" })),
    ).toEqual({
      view: "all",
      sort: "newest",
    });
    expect(
      normalizePlayerMatchesSearch(
        playerMatchesSearchSchema.parse({ view: "playoff", sort: "oldest" }),
      ),
    ).toEqual({
      view: "playoff",
      sort: "oldest",
    });
  });
});
