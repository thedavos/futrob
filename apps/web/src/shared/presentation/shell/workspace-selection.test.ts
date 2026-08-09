import { describe, expect, it } from "vite-plus/test";
import { ONBOARDING_PATH } from "@futrob/identity";
import {
  WORKSPACE_SELECTION_KIND,
  isSameWorkspaceSelection,
  pathForWorkspaceSelection,
  resolveDefaultWorkspaceSelection,
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

  it("includes Pro Stats in personal general nav", () => {
    const section = generalNavFor({ kind: WORKSPACE_SELECTION_KIND.personal });
    const proStats = section.items.find((item) => item.id === "pro-stats");
    expect(proStats).toMatchObject({
      label: "Pro Stats",
      href: "/player/pro-stats",
      stub: true,
    });
  });

  it("returns competition context items", () => {
    const section = contextNavFor(
      {
        kind: WORKSPACE_SELECTION_KIND.competition,
        organizationId: "org-1",
        competitionId: "comp-2",
      },
      new Set(["competitions.update", "competitions.read", "teams.read"]),
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
      new Set(["competitions.update", "competitions.read", "teams.read"]),
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
      new Set(["competitions.read", "competitions.participants.read"]),
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
    expect(resolveActiveNavHref("/player/ea-clubs", items)).toBe("/player/ea-clubs");
    expect(resolveActiveNavHref("/player", items)).toBe("/player");
    expect(resolveActiveNavHref("/player/game-accounts", items)).toBe("/player");
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
});
