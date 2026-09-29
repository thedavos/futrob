import { describe, expect, it } from "vite-plus/test";
import {
  clearedExploreSearch,
  exploreCompetitionsSearchSchema,
  exploreQueryFromSearch,
  hasActiveExploreFilters,
  toExploreSearchParams,
} from "./explore-search.ts";

describe("explore competitions search", () => {
  it("keeps valid filters and drops unknown values", () => {
    const search = exploreCompetitionsSearchSchema.parse({
      q: "  Liga  ",
      format: "league",
      status: "draft",
      region: "not-a-region",
      platform: "playstation",
      sort: "name-asc",
    });

    expect(search).toEqual({
      q: "Liga",
      format: "league",
      platform: "playstation",
      sort: "name-asc",
    });
    expect(hasActiveExploreFilters(search)).toBe(true);
    expect(exploreQueryFromSearch(search)).toMatchObject({
      q: "Liga",
      format: "league",
      sort: "name-asc",
      limit: 24,
    });
  });

  it("clears filters without dropping sort", () => {
    expect(
      clearedExploreSearch({
        q: "Liga",
        status: "published",
        sort: "name-asc",
      }),
    ).toEqual({ sort: "name-asc" });
    expect(hasActiveExploreFilters({ sort: "name-asc" })).toBe(false);
  });

  it("omits default sort from shareable search params", () => {
    expect(
      toExploreSearchParams({
        q: "Liga",
        sort: "updated-desc",
      }),
    ).toEqual({ q: "Liga" });
  });
});
