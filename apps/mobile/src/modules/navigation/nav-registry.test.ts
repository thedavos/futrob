import { describe, expect, it } from "vite-plus/test";
import { MOBILE_PERMISSION } from "@/modules/authorization/permissions";
import { contextLinks, contextTabs } from "./nav-registry";

describe("contextTabs", () => {
  it("routes personal tabs under /player without carrying the selected club", () => {
    expect(contextTabs({ kind: "personal", externalClubId: "club-a" }, undefined)).toEqual([
      { id: "home", href: "/player", allowed: true },
      { id: "more", href: "/player/more", allowed: true },
    ]);
  });

  it("hides the organization home until EffectiveAccess allows organizations.read", () => {
    const context = { kind: "organization", organizationId: "org a" } as const;
    expect(contextTabs(context, undefined).map((tab) => [tab.href, tab.allowed])).toEqual([
      ["/orgs/org%20a", false],
      ["/orgs/org%20a/more", true],
    ]);
    expect(contextTabs(context, new Set())[0]?.allowed).toBe(false);
    expect(contextTabs(context, new Set([MOBILE_PERMISSION.organizationsRead]))[0]?.allowed).toBe(
      true,
    );
  });

  it("roots competition tabs at the competition route and gates its read tabs", () => {
    const context = {
      kind: "competition",
      organizationId: "org-1",
      competitionId: "cup-1",
    } as const;
    expect(contextTabs(context, new Set())).toEqual([
      { id: "overview", href: "/orgs/org-1/competitions/cup-1", allowed: true },
      { id: "fixture", href: "/orgs/org-1/competitions/cup-1/fixture", allowed: false },
      { id: "standings", href: "/orgs/org-1/competitions/cup-1/standings", allowed: false },
      { id: "more", href: "/orgs/org-1/competitions/cup-1/more", allowed: true },
    ]);
    expect(
      contextTabs(context, new Set([MOBILE_PERMISSION.competitionsRead])).every(
        (tab) => tab.allowed,
      ),
    ).toBe(true);
  });
});

describe("contextLinks", () => {
  const context = { kind: "competition", organizationId: "org-1", competitionId: "cup-1" } as const;

  it("lists competition destinations only once EffectiveAccess allows them", () => {
    expect(contextLinks(context, undefined)).toEqual([]);
    expect(contextLinks(context, new Set([MOBILE_PERMISSION.competitionsRead]))).toEqual([
      { id: "bracket", href: "/orgs/org-1/competitions/cup-1/bracket" },
      { id: "rankings", href: "/orgs/org-1/competitions/cup-1/rankings" },
      { id: "rules", href: "/orgs/org-1/competitions/cup-1/rules" },
    ]);
    expect(
      contextLinks(context, new Set([MOBILE_PERMISSION.teamsRead])).map((link) => link.id),
    ).toEqual(["teams"]);
  });

  it("has no extra destinations in the personal and organization contexts yet", () => {
    const all = new Set([MOBILE_PERMISSION.competitionsRead, MOBILE_PERMISSION.teamsRead]);
    expect(contextLinks({ kind: "personal" }, all)).toEqual([]);
    expect(contextLinks({ kind: "organization", organizationId: "org-1" }, all)).toEqual([]);
  });
});
