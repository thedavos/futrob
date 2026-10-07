import type { ActivityEntryDto } from "@futrob/api-contracts";
import { describe, expect, it } from "vite-plus/test";
import { activityRowView, formatActivityTime } from "./activity-view.ts";

const NOW = new Date("2026-10-07T12:00:00.000Z");

function entry(overrides: Partial<ActivityEntryDto>): ActivityEntryDto {
  return {
    id: "row",
    organizationId: "org-a",
    competitionId: "cmp-a",
    audience: "organization",
    kind: "match_dispute",
    status: "open",
    requiresAction: true,
    resourceType: "encounter",
    resourceId: "enc-1",
    subject: {
      competitionName: "Liga A",
      encounterLabel: "Cuervos vs Halcones",
      teamName: "Halcones",
    },
    openedAt: "2026-10-07T10:00:00.000Z",
    closedAt: null,
    expiresAt: null,
    lastEventAt: "2026-10-07T10:00:00.000Z",
    ...overrides,
  };
}

describe("activity row view", () => {
  it("names each kind by what the audience has to do, or by what happened", () => {
    expect(activityRowView(entry({}), NOW)).toMatchObject({
      titleKey: "activity.matchDispute.open",
      tone: "urgent",
      subtitle: "Cuervos vs Halcones · Liga A",
      destination: {
        to: "/orgs/$orgId/competitions/$competitionId/disputes",
        params: { orgId: "org-a", competitionId: "cmp-a" },
      },
    });
    expect(
      activityRowView(entry({ kind: "selection_confirmation", audience: "team" }), NOW),
    ).toMatchObject({
      titleKey: "activity.selection.pending",
      tone: "default",
      destination: { to: "/player/competitions/$competitionId/matches" },
    });
    expect(
      activityRowView(entry({ kind: "selection_confirmation", requiresAction: false }), NOW),
    ).toMatchObject({ titleKey: "activity.selection.watching", tone: "waiting" });
    expect(
      activityRowView(
        entry({ kind: "roster_invitation", audience: "actor", resourceType: "roster_invitation" }),
        NOW,
      ),
    ).toMatchObject({
      titleKey: "activity.invitation.pending",
      subtitle: "Halcones · Liga A",
      destination: { to: "/invitations" },
    });
    expect(
      activityRowView(
        entry({ kind: "competition_published", status: "closed", requiresAction: false }),
        NOW,
      ),
    ).toMatchObject({
      titleKey: "activity.competitionPublished",
      tone: "resolved",
      subtitle: "Liga A",
      destination: { to: "/orgs/$orgId/competitions/$competitionId" },
    });
  });

  it("treats an open row past its deadline as expired, not pending", () => {
    const expired = entry({
      kind: "roster_invitation",
      audience: "actor",
      expiresAt: "2026-10-07T11:00:00.000Z",
    });
    expect(activityRowView(expired, NOW)).toMatchObject({
      titleKey: "activity.invitation.expired",
      tone: "resolved",
    });
  });

  it("orders by the last event and formats it relative to now", () => {
    const closed = entry({ status: "closed", lastEventAt: "2026-10-07T11:00:00.000Z" });
    const view = activityRowView(closed, NOW);
    expect(view.titleKey).toBe("activity.matchDispute.closed");
    expect(view.at).toEqual(new Date("2026-10-07T11:00:00.000Z"));
    expect(formatActivityTime(view.at, "en", NOW)).toBe("1 hr. ago");
  });
});
