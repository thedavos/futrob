import { describe, expect, it } from "vite-plus/test";
import { MOBILE_PERMISSION } from "@/modules/authorization/permissions";
import { contextTabs } from "./nav-registry";

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

  it("roots competition tabs at the competition route", () => {
    expect(
      contextTabs(
        { kind: "competition", organizationId: "org-1", competitionId: "cup-1" },
        new Set(),
      ),
    ).toEqual([
      { id: "overview", href: "/orgs/org-1/competitions/cup-1", allowed: true },
      { id: "more", href: "/orgs/org-1/competitions/cup-1/more", allowed: true },
    ]);
  });
});
