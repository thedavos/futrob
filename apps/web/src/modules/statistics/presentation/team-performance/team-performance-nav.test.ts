import { describe, expect, it } from "vite-plus/test";
import { COMPETITION_PERMISSION } from "@futrob/competitions";
import { STATISTICS_PERMISSION } from "@futrob/statistics";
import { contextNavFor } from "@/shared/presentation/shell/nav-registry.ts";
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

  it("stays hidden without statistics.read", () => {
    const section = contextNavFor(
      competition,
      new Set([COMPETITION_PERMISSION.update, COMPETITION_PERMISSION.read]),
    );

    expect(section.items.map((item) => item.id)).not.toContain("team-performance");
  });
});
