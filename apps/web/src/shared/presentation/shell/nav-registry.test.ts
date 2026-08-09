import { describe, expect, it } from "vite-plus/test";
import { COMPETITION_PERMISSION } from "@futrob/competitions";
import { ORGANIZATION_PERMISSION } from "@futrob/organizations";
import { TEAM_PERMISSION } from "@futrob/teams";
import { contextNavFor, generalNavFor } from "./nav-registry.ts";
import { WORKSPACE_SELECTION_KIND } from "./workspace-selection.ts";

describe("generalNavFor", () => {
  it("filters organization items by effective permissions only", () => {
    const section = generalNavFor(
      {
        kind: WORKSPACE_SELECTION_KIND.organization,
        organizationId: "org-1",
        label: "Org",
      },
      new Set([ORGANIZATION_PERMISSION.read, COMPETITION_PERMISSION.read]),
    );
    expect(section.items.map((item) => item.id)).toEqual(["home", "competitions"]);
  });

  it("hides privileged organization items while capabilities are empty", () => {
    const section = generalNavFor(
      {
        kind: WORKSPACE_SELECTION_KIND.organization,
        organizationId: "org-1",
      },
      new Set(),
    );
    expect(section.items).toEqual([]);
  });
});

describe("contextNavFor", () => {
  it("uses personal competition nav without competitions.update", () => {
    const section = contextNavFor(
      {
        kind: WORKSPACE_SELECTION_KIND.competition,
        competitionId: "c1",
        organizationId: "org-1",
      },
      new Set([TEAM_PERMISSION.read, COMPETITION_PERMISSION.read]),
    );
    expect(section.items.map((item) => item.id)).toEqual(["overview", "matches", "stats", "team"]);
  });

  it("uses operator competition nav when competitions.update is allowed", () => {
    const section = contextNavFor(
      {
        kind: WORKSPACE_SELECTION_KIND.competition,
        competitionId: "c1",
        organizationId: "org-1",
      },
      new Set([COMPETITION_PERMISSION.update, COMPETITION_PERMISSION.read, TEAM_PERMISSION.read]),
    );
    expect(section.items.map((item) => item.id)).toContain("fixture");
    expect(section.items.map((item) => item.id)).not.toContain("team");
  });

  it("hides Mi equipo without teams.read", () => {
    const section = contextNavFor(
      {
        kind: WORKSPACE_SELECTION_KIND.competition,
        competitionId: "c1",
        organizationId: "org-1",
      },
      new Set([COMPETITION_PERMISSION.read]),
    );
    expect(section.items.map((item) => item.id)).toEqual(["overview", "matches", "stats"]);
  });
});
