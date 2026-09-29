import { describe, expect, it } from "vite-plus/test";
import { isDiscoverableCompetitionStatus } from "./discoverable-competition.ts";

describe("discoverable competition policy", () => {
  it("treats registration, published, paused and finished as discoverable", () => {
    expect(isDiscoverableCompetitionStatus("registration")).toBe(true);
    expect(isDiscoverableCompetitionStatus("published")).toBe(true);
    expect(isDiscoverableCompetitionStatus("paused")).toBe(true);
    expect(isDiscoverableCompetitionStatus("finished")).toBe(true);
  });

  it("keeps drafts and archives private", () => {
    expect(isDiscoverableCompetitionStatus("draft")).toBe(false);
    expect(isDiscoverableCompetitionStatus("archived")).toBe(false);
  });
});
