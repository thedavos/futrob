import { describe, expect, it } from "vite-plus/test";
import { COMPETITION_PERMISSION } from "@futrob/competitions";
import { STATISTICS_PERMISSION } from "@futrob/statistics";
import { contextNavFor, resolveActiveNavHref } from "@/shared/presentation/shell/nav-registry.ts";
import { createTranslator } from "@/shared/presentation/i18n/translate.ts";
import { WORKSPACE_SELECTION_KIND } from "@/shared/presentation/shell/workspace-selection.ts";

const competition = {
  kind: WORKSPACE_SELECTION_KIND.competition,
  competitionId: "c1",
  organizationId: "org-1",
} as const;

describe("team performance navigation", () => {
  it("lists the team ranking for statistics readers, apart from standings and rankings", () => {
    const section = contextNavFor(
      competition,
      new Set([
        COMPETITION_PERMISSION.update,
        COMPETITION_PERMISSION.read,
        STATISTICS_PERMISSION.read,
      ]),
      createTranslator("en"),
    );
    const ids = section.items.map((item) => item.id);

    expect(section.items.find((item) => item.id === "team-performance")).toMatchObject({
      label: "Team performance",
      href: "/orgs/org-1/competitions/c1/team-performance",
    });
    expect(ids.indexOf("team-performance")).toBe(ids.indexOf("rankings") + 1);
    expect(ids).toContain("standings");
  });

  it("lists the team ranking for statistics readers without competitions.update", () => {
    const section = contextNavFor(
      competition,
      new Set([COMPETITION_PERMISSION.read, STATISTICS_PERMISSION.read]),
    );
    const href = "/orgs/org-1/competitions/c1/team-performance";

    // Read-only actors keep the player menu: no operator-only destinations appear.
    expect(section.items.map((item) => item.id)).toEqual([
      "overview",
      "matches",
      "stats",
      "team-performance",
    ]);
    expect(section.items.find((item) => item.id === "team-performance")?.href).toBe(href);
    expect(resolveActiveNavHref(href, section.items)).toBe(href);
    expect(resolveActiveNavHref("/orgs/org-1/competitions/c1/stats", section.items)).toBe(
      "/orgs/org-1/competitions/c1/stats",
    );
  });

  it("stays hidden without statistics.read", () => {
    const operator = contextNavFor(
      competition,
      new Set([COMPETITION_PERMISSION.update, COMPETITION_PERMISSION.read]),
    );
    const reader = contextNavFor(competition, new Set([COMPETITION_PERMISSION.read]));

    expect(operator.items.map((item) => item.id)).not.toContain("team-performance");
    expect(reader.items.map((item) => item.id)).not.toContain("team-performance");
  });

  it("stays out of the personal competition menu, which has no ranking route", () => {
    const section = contextNavFor(
      { ...competition, organizationId: null },
      new Set([COMPETITION_PERMISSION.read, STATISTICS_PERMISSION.read]),
    );

    expect(section.items.map((item) => item.id)).not.toContain("team-performance");
  });
});
