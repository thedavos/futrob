import { describe, expect, it } from "vite-plus/test";
import { EXPLORE_ACTIONS, exploreViewerRelation } from "./explore-viewer-relation.ts";

describe("exploreViewerRelation", () => {
  it("treats organizer and staff as managers", () => {
    expect(
      exploreViewerRelation({
        organizationId: "org-1",
        competitionId: "c-1",
        memberships: [{ organizationId: "org-1", role: "organizer" }],
        accessibleCompetitionIds: [],
      }),
    ).toBe("manager");
    expect(EXPLORE_ACTIONS.manager.manage).toBe(true);
  });

  it("treats a listed competitor as a participant", () => {
    expect(
      exploreViewerRelation({
        organizationId: "org-1",
        competitionId: "c-1",
        memberships: [{ organizationId: "org-1", role: "member" }],
        accessibleCompetitionIds: ["c-1"],
      }),
    ).toBe("participant");
    expect(EXPLORE_ACTIONS.participant.participating).toBe(true);
    expect(EXPLORE_ACTIONS.participant.manage).toBe(false);
  });

  it("treats everyone else as a visitor", () => {
    expect(
      exploreViewerRelation({
        organizationId: "org-1",
        competitionId: "c-1",
        memberships: [],
        accessibleCompetitionIds: [],
      }),
    ).toBe("visitor");
    expect(EXPLORE_ACTIONS.visitor.view).toBe(true);
    expect(EXPLORE_ACTIONS.visitor.share).toBe(true);
  });
});
