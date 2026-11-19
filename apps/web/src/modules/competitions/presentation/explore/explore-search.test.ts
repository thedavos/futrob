import { defaultParseSearch, defaultStringifySearch } from "@tanstack/react-router";
import { describe, expect, it } from "vite-plus/test";
import {
  competitionApplySearch,
  competitionApplySearchSchema,
} from "./competition-apply-search.ts";
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

describe("competition apply search", () => {
  const roundTrip = (teamName: string | null) =>
    competitionApplySearchSchema.parse(
      defaultParseSearch(defaultStringifySearch(competitionApplySearch(teamName))),
    );

  it("round-trips the handoff, a numeric club name included", () => {
    expect(roundTrip("Fera Enjaulada")).toEqual({ apply: true, teamName: "Fera Enjaulada" });
    expect(roundTrip("10754")).toEqual({ apply: true, teamName: "10754" });
    expect(roundTrip(null)).toEqual({ apply: true, teamName: undefined });
  });

  it("round-trips a club association that failed during onboarding", () => {
    expect(
      competitionApplySearchSchema.parse(
        defaultParseSearch(defaultStringifySearch(competitionApplySearch("Fera", "failed"))),
      ),
    ).toEqual({ apply: true, teamName: "Fera", clubAssociation: "failed" });
    expect(competitionApplySearchSchema.parse({ clubAssociation: "ok" }).clubAssociation).toBe(
      undefined,
    );
  });

  it("drops malformed values instead of failing the route", () => {
    expect(competitionApplySearchSchema.parse({ apply: "yes", teamName: "" })).toEqual({
      apply: undefined,
      teamName: undefined,
    });
    expect(competitionApplySearchSchema.parse({ teamName: "x".repeat(121) }).teamName).toBe(
      undefined,
    );
  });
});
