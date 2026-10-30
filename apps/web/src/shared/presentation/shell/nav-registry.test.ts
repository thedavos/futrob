import type { EffectiveAccessDto } from "@futrob/api-contracts";
import { BILLING_PERMISSION } from "@futrob/billing";
import { SHELL_PERMISSIONS, allowedPermissionSet } from "@/context/permissions.ts";
import { describe, expect, it } from "vite-plus/test";
import { COMPETITION_PERMISSION } from "@futrob/competitions";
import { RESULT_PERMISSION } from "@futrob/results";
import { ORGANIZATION_PERMISSION } from "@futrob/organizations";
import { TEAM_PERMISSION } from "@futrob/teams";
import { createTranslator } from "@/shared/presentation/i18n/translate.ts";
import { accountNavItems, contextNavFor, generalNavFor } from "./nav-registry.ts";
import { WORKSPACE_SELECTION_KIND } from "./workspace-selection.ts";

describe("generalNavFor", () => {
  it("uses the active locale for personal navigation and the account menu", () => {
    const english = createTranslator("en");
    const personal = generalNavFor({ kind: WORKSPACE_SELECTION_KIND.personal }, undefined, english);
    expect(personal.items.map((item) => item.label)).toEqual([
      "Home",
      "Competitions",
      "Game data",
      "My matches",
      "My statistics",
      "Invitations",
    ]);
    expect(accountNavItems(english).map((item) => item.label)).toEqual([
      "Profile",
      "Send feedback",
      "Contact us",
      "Settings",
    ]);
    expect(accountNavItems().map((item) => item.label)).toContain("Perfil");
  });

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

describe("organization players entry", () => {
  const selection = {
    kind: WORKSPACE_SELECTION_KIND.organization,
    organizationId: "org-1",
  } as const;

  it("follows roster access, not organization membership access", () => {
    const withMemberships = generalNavFor(
      selection,
      new Set([ORGANIZATION_PERMISSION.membershipsRead]),
    );
    const withRosters = generalNavFor(selection, new Set([TEAM_PERMISSION.rosterRead]));
    expect(withMemberships.items.map((item) => item.id)).not.toContain("players");
    expect(withRosters.items.map((item) => item.id)).toContain("players");
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

  it("adds roster management pages for captains", () => {
    const section = contextNavFor(
      {
        kind: WORKSPACE_SELECTION_KIND.competition,
        competitionId: "c1",
        organizationId: "org-1",
      },
      new Set([
        TEAM_PERMISSION.read,
        TEAM_PERMISSION.rosterManage,
        TEAM_PERMISSION.invitationsManage,
        COMPETITION_PERMISSION.read,
      ]),
    );
    expect(section.items.map((item) => item.href)).toEqual([
      "/orgs/org-1/competitions/c1",
      "/orgs/org-1/competitions/c1/matches",
      "/orgs/org-1/competitions/c1/stats",
      "/orgs/org-1/competitions/c1/team",
      "/orgs/org-1/competitions/c1/team/roster",
      "/orgs/org-1/competitions/c1/team/invitations",
    ]);
  });

  it("keeps every competition page navigable", () => {
    const player = contextNavFor({
      kind: WORKSPACE_SELECTION_KIND.competition,
      competitionId: "c1",
      organizationId: null,
    });
    const operator = contextNavFor(
      {
        kind: WORKSPACE_SELECTION_KIND.competition,
        competitionId: "c1",
        organizationId: "org-1",
      },
      new Set([COMPETITION_PERMISSION.update, COMPETITION_PERMISSION.read, TEAM_PERMISSION.read]),
    );
    expect(player.items[0]?.href).toBe("/player/competitions/c1");
    expect([...player.items, ...operator.items].filter((item) => item.stub)).toEqual([]);
  });

  it("lists disputes only for actors who can approve results", () => {
    const competition = {
      kind: WORKSPACE_SELECTION_KIND.competition,
      competitionId: "c1",
      organizationId: "org-1",
    } as const;
    const editor = contextNavFor(
      competition,
      new Set([COMPETITION_PERMISSION.update, COMPETITION_PERMISSION.read]),
    );
    const approver = contextNavFor(
      competition,
      new Set([
        COMPETITION_PERMISSION.update,
        COMPETITION_PERMISSION.read,
        RESULT_PERMISSION.resultApprove,
      ]),
    );

    expect(editor.items.map((item) => item.id)).not.toContain("disputes");
    expect(approver.items.find((item) => item.id === "disputes")).toMatchObject({
      href: "/orgs/org-1/competitions/c1/disputes",
    });
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

  it("gives every competition destination an icon for the collapsed rail", () => {
    const player = contextNavFor({
      kind: WORKSPACE_SELECTION_KIND.competition,
      competitionId: "c1",
      organizationId: null,
    });
    const operator = contextNavFor(
      {
        kind: WORKSPACE_SELECTION_KIND.competition,
        competitionId: "c1",
        organizationId: "org-1",
      },
      new Set([COMPETITION_PERMISSION.update, COMPETITION_PERMISSION.read, TEAM_PERMISSION.read]),
    );
    for (const item of [...player.items, ...operator.items]) {
      expect(item.icon, item.id).toBeTruthy();
    }
  });
});

describe("plan navigation from shell bootstrap permissions", () => {
  const selection = {
    kind: WORKSPACE_SELECTION_KIND.organization,
    organizationId: "org-1",
  } as const;
  const effectiveAccess = (role: string, billingAllowed: boolean): EffectiveAccessDto => ({
    actorId: "actor-1",
    scope: { organizationId: "org-1" },
    roles: [{ scopeType: "organization", scopeId: "org-1", role }],
    permissions: SHELL_PERMISSIONS.map((permission) => ({
      permission,
      allowed: permission === BILLING_PERMISSION.read && billingAllowed,
      decidedAt: "organization",
    })),
  });
  it.each(["organizer", "staff"])(
    "shows Plan y uso for an authorized %s using the actual probes",
    (role) => {
      const permissions = allowedPermissionSet(effectiveAccess(role, true));
      expect(
        generalNavFor(selection, permissions).items.find((item) => item.id === "plan"),
      ).toMatchObject({
        href: "/orgs/org-1/settings/plan",
      });
    },
  );
  it("hides Plan y uso when billing.read is denied", () => {
    const permissions = allowedPermissionSet(effectiveAccess("staff", false));
    expect(generalNavFor(selection, permissions).items.map((item) => item.id)).not.toContain(
      "plan",
    );
  });
});
