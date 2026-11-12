import { describe, expect, it } from "vite-plus/test";
import { exploreViewerRelation } from "./index.ts";

describe("exploreViewerRelation", () => {
  const base = { organizationId: "org-1", competitionId: "cup-1" };
  const competition = (id: string) => ({ competition: { id } });

  it("makes organizers and staff managers, even when they also play", () => {
    for (const role of ["organizer", "staff"] as const) {
      expect(
        exploreViewerRelation({
          ...base,
          memberships: [{ organizationId: "org-1", role }],
          accessibleCompetitions: [],
        }),
      ).toBe("manager");
    }
  });

  it("makes a plain member or a team member a participant only through the competition", () => {
    expect(
      exploreViewerRelation({
        ...base,
        memberships: [{ organizationId: "org-1", role: "member" }],
        accessibleCompetitions: [],
      }),
    ).toBe("visitor");
    expect(
      exploreViewerRelation({
        ...base,
        memberships: [],
        accessibleCompetitions: [competition("cup-1")],
      }),
    ).toBe("participant");
  });
});
