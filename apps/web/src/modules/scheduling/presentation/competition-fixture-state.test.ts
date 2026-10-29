import { describe, expect, it } from "vite-plus/test";
import { groupsKnockoutFixture, noFixture } from "./competition-fixture.fixtures.ts";
import { competitionFixturePageState } from "./competition-fixture-state.ts";

const retry = () => undefined;

describe("competitionFixturePageState", () => {
  it("lists the fixture grouped once a read succeeds", () => {
    const state = competitionFixturePageState({
      data: groupsKnockoutFixture,
      failed: false,
      refused: false,
      retry,
    });
    expect(state.kind).toBe("ready");
    if (state.kind !== "ready") return;
    expect(state.view.stages.map((stage) => stage.kind)).toEqual(["groups", "knockout"]);
    expect(state.refreshFailed).toBe(false);
  });

  it("treats a missing fixture as empty, including when a later refresh fails", () => {
    expect(
      competitionFixturePageState({ data: noFixture, failed: false, refused: false, retry }).kind,
    ).toBe("empty");
    const stale = competitionFixturePageState({
      data: noFixture,
      failed: true,
      refused: false,
      retry,
    });
    expect(stale.kind === "empty" && stale.refreshFailed).toBe(true);
  });

  it("keeps the last fixture when a refresh fails", () => {
    const state = competitionFixturePageState({
      data: groupsKnockoutFixture,
      failed: true,
      refused: false,
      retry,
    });
    expect(state.kind === "ready" && state.refreshFailed).toBe(true);
  });

  it("hides a refusal and surfaces a failed first read", () => {
    expect(
      competitionFixturePageState({
        data: undefined,
        failed: true,
        refused: true,
        retry,
      }).kind,
    ).toBe("not_found");
    expect(
      competitionFixturePageState({
        data: undefined,
        failed: true,
        refused: false,
        retry,
      }).kind,
    ).toBe("error");
    expect(
      competitionFixturePageState({
        data: undefined,
        failed: false,
        refused: false,
        retry,
      }).kind,
    ).toBe("loading");
  });
});
