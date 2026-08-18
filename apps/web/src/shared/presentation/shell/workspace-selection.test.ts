import { describe, expect, it } from "vite-plus/test";
import { COMPETITION_PERMISSION } from "@futrob/competitions";
import { ONBOARDING_PATH } from "@futrob/identity";
import { TEAM_PERMISSION } from "@futrob/teams";
import {
  WORKSPACE_SELECTION_KIND,
  isSameWorkspaceSelection,
  pathForWorkspaceSelection,
  personalWorkspaceSelection,
  resolveDefaultWorkspaceSelection,
  resolvePersonalExternalClubId,
  selectionAfterAssociatingClub,
  workspaceSelectionFromPathname,
  workspaceSelectionKey,
} from "./workspace-selection.ts";
import {
  contextNavFor,
  generalNavFor,
  isNavItemActive,
  resolveActiveNavHref,
} from "./nav-registry.ts";

describe("resolveDefaultWorkspaceSelection", () => {
  it("defaults to personal for the player path", () => {
    expect(
      resolveDefaultWorkspaceSelection({
        path: ONBOARDING_PATH.player,
        organizationId: null,
        competitionId: null,
      }),
    ).toEqual({ kind: WORKSPACE_SELECTION_KIND.personal });
  });

  it("defaults to organization for the organization path", () => {
    expect(
      resolveDefaultWorkspaceSelection({
        path: ONBOARDING_PATH.organization,
        organizationId: "org-1",
        competitionId: "comp-1",
        organizationLabel: "Acme",
      }),
    ).toEqual({
      kind: WORKSPACE_SELECTION_KIND.organization,
      organizationId: "org-1",
      label: "Acme",
    });
  });

  it("defaults to competition for the invitation path", () => {
    expect(
      resolveDefaultWorkspaceSelection({
        path: ONBOARDING_PATH.invitation,
        organizationId: "org-1",
        competitionId: "comp-9",
        competitionLabel: "Liga Norte",
      }),
    ).toEqual({
      kind: WORKSPACE_SELECTION_KIND.competition,
      organizationId: "org-1",
      competitionId: "comp-9",
      label: "Liga Norte",
    });
  });

  it("falls back to personal when invitation has no competition id", () => {
    expect(
      resolveDefaultWorkspaceSelection({
        path: ONBOARDING_PATH.invitation,
        organizationId: "org-1",
        competitionId: null,
      }),
    ).toEqual({ kind: WORKSPACE_SELECTION_KIND.personal });
  });
});

describe("workspaceSelectionFromPathname", () => {
  it("reads personal, organization, and competition routes", () => {
    expect(workspaceSelectionFromPathname("/player")).toEqual({
      kind: WORKSPACE_SELECTION_KIND.personal,
    });
    expect(workspaceSelectionFromPathname("/player/game-accounts")).toEqual({
      kind: WORKSPACE_SELECTION_KIND.personal,
    });
    expect(workspaceSelectionFromPathname("/orgs/org-1")).toEqual({
      kind: WORKSPACE_SELECTION_KIND.organization,
      organizationId: "org-1",
    });
    expect(workspaceSelectionFromPathname("/orgs/org-1/competitions/comp-2")).toEqual({
      kind: WORKSPACE_SELECTION_KIND.competition,
      organizationId: "org-1",
      competitionId: "comp-2",
    });
    expect(workspaceSelectionFromPathname("/orgs/org-1/competitions/new")).toEqual({
      kind: WORKSPACE_SELECTION_KIND.organization,
      organizationId: "org-1",
    });
  });
});

describe("pathForWorkspaceSelection", () => {
  it("builds stable deep links", () => {
    expect(pathForWorkspaceSelection({ kind: WORKSPACE_SELECTION_KIND.personal })).toBe("/player");
    expect(
      pathForWorkspaceSelection({
        kind: WORKSPACE_SELECTION_KIND.organization,
        organizationId: "org-1",
      }),
    ).toBe("/orgs/org-1");
    expect(
      pathForWorkspaceSelection({
        kind: WORKSPACE_SELECTION_KIND.competition,
        organizationId: "org-1",
        competitionId: "comp-2",
      }),
    ).toBe("/orgs/org-1/competitions/comp-2");
  });
});

describe("nav registries", () => {
  it("returns organization general nav for org selection", () => {
    const section = generalNavFor({
      kind: WORKSPACE_SELECTION_KIND.organization,
      organizationId: "org-1",
    });
    expect(section.items.map((item) => item.id)).toContain("teams");
    expect(section.items.map((item) => item.id)).not.toContain("pro-stats");
    expect(section.items[0]?.href).toBe("/orgs/org-1");
  });

  it("keeps personal matches and statistics as distinct real destinations", () => {
    const section = generalNavFor({ kind: WORKSPACE_SELECTION_KIND.personal });
    const matches = section.items.find((item) => item.id === "matches");
    const statistics = section.items.find((item) => item.id === "statistics");
    expect(matches).toMatchObject({
      label: "Mis partidos",
      href: "/player/matches",
    });
    expect(statistics).toMatchObject({
      label: "Mis estadísticas",
      href: "/player/statistics",
    });
    expect(matches?.stub).toBeUndefined();
    expect(statistics?.stub).toBeUndefined();
  });

  it("returns competition context items", () => {
    const section = contextNavFor(
      {
        kind: WORKSPACE_SELECTION_KIND.competition,
        organizationId: "org-1",
        competitionId: "comp-2",
      },
      new Set([COMPETITION_PERMISSION.update, COMPETITION_PERMISSION.read, TEAM_PERMISSION.read]),
    );
    expect(section.items.length).toBeGreaterThan(0);
    expect(section.items.some((item) => item.id === "standings")).toBe(true);
  });

  it("prefers context nav over general when competition is selected", () => {
    const selection = {
      kind: WORKSPACE_SELECTION_KIND.competition,
      organizationId: "org-1",
      competitionId: "comp-2",
    } as const;
    const context = contextNavFor(
      selection,
      new Set([COMPETITION_PERMISSION.update, COMPETITION_PERMISSION.read, TEAM_PERMISSION.read]),
    );
    const general = generalNavFor(selection);
    const footerItems = context.items.length > 0 ? context.items : general.items;
    expect(footerItems.map((item) => item.id)).toContain("standings");
    expect(footerItems.map((item) => item.id)).not.toContain("ea-clubs");
  });

  it("uses personal competition navigation when the actor lacks operator capabilities", () => {
    const context = contextNavFor(
      {
        kind: WORKSPACE_SELECTION_KIND.competition,
        organizationId: "org-1",
        competitionId: "comp-2",
      },
      new Set([
        COMPETITION_PERMISSION.read,
        COMPETITION_PERMISSION.participantsRead,
        TEAM_PERMISSION.read,
      ]),
    );
    expect(context.items.map((item) => item.id)).toContain("team");
    expect(context.items.map((item) => item.id)).not.toContain("standings");
  });

  it("marks active nav items by pathname prefix", () => {
    expect(isNavItemActive("/player/game-accounts", "/player")).toBe(true);
    expect(isNavItemActive("/player", "/player/competitions")).toBe(false);
  });

  it("resolves the most specific matching nav href among siblings", () => {
    const items = generalNavFor({ kind: WORKSPACE_SELECTION_KIND.personal }).items;
    expect(resolveActiveNavHref("/player/game-accounts", items)).toBe("/player/game-accounts");
    expect(resolveActiveNavHref("/player", items)).toBe("/player");
  });
});

describe("selection identity", () => {
  it("compares selections by key", () => {
    const left = {
      kind: WORKSPACE_SELECTION_KIND.organization,
      organizationId: "org-1",
    } as const;
    const right = {
      kind: WORKSPACE_SELECTION_KIND.organization,
      organizationId: "org-1",
      label: "Acme",
    } as const;
    expect(workspaceSelectionKey(left)).toBe("organization:org-1");
    expect(isSameWorkspaceSelection(left, right)).toBe(true);
  });

  it("includes the selected club in the personal key", () => {
    expect(workspaceSelectionKey(personalWorkspaceSelection("club-1"))).toBe("personal:club-1");
    expect(workspaceSelectionKey(personalWorkspaceSelection())).toBe("personal");
  });
});

describe("personal club selection", () => {
  it("keeps a preferred associated club and falls back to the first", () => {
    expect(resolvePersonalExternalClubId("club-2", ["club-1", "club-2"])).toBe("club-2");
    expect(resolvePersonalExternalClubId("gone", ["club-1", "club-2"])).toBe("club-1");
    expect(resolvePersonalExternalClubId(undefined, [])).toBeUndefined();
  });

  it("keeps the selected club after associating another from the shell", () => {
    expect(selectionAfterAssociatingClub(personalWorkspaceSelection("club-2"))).toEqual({
      kind: WORKSPACE_SELECTION_KIND.personal,
      externalClubId: "club-2",
    });
    expect(
      selectionAfterAssociatingClub({
        kind: WORKSPACE_SELECTION_KIND.organization,
        organizationId: "org-1",
      }),
    ).toEqual({ kind: WORKSPACE_SELECTION_KIND.personal });
  });
});
