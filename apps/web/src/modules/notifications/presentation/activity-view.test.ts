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
      outcome: null,
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

  it("tells apart the schedule change a Team answers, the organizer watches and the organizer decides", () => {
    const rival = entry({ kind: "schedule_change", audience: "team" });
    expect(activityRowView(rival, NOW)).toMatchObject({
      titleKey: "activity.scheduleChange.pending",
      tone: "default",
      subtitle: "Cuervos vs Halcones · Liga A",
      destination: { to: "/player/competitions/$competitionId/matches" },
    });
    expect(
      activityRowView(entry({ kind: "schedule_change", requiresAction: false }), NOW),
    ).toMatchObject({
      titleKey: "activity.scheduleChange.watching",
      tone: "waiting",
    });
    expect(activityRowView(entry({ kind: "schedule_change" }), NOW)).toMatchObject({
      titleKey: "activity.scheduleChange.decide",
      destination: { to: "/orgs/$orgId/competitions/$competitionId/encounters" },
    });
    expect(activityRowView({ ...rival, expiresAt: "2026-10-07T11:00:00.000Z" }, NOW)).toMatchObject(
      { titleKey: "activity.scheduleChange.expired", tone: "resolved" },
    );
    expect(activityRowView({ ...rival, status: "closed" }, NOW)).toMatchObject({
      titleKey: "activity.scheduleChange.closed",
    });
  });

  it("names an organizer decision by its outcome and sends it where it was taken", () => {
    const decision = (
      outcome: ActivityEntryDto["subject"]["outcome"],
      resourceType: "encounter" | "competition",
    ) =>
      activityRowView(
        entry({
          kind: "organizer_decision",
          status: "closed",
          requiresAction: false,
          resourceType,
          subject: {
            competitionName: "Liga A",
            encounterLabel: null,
            teamName: "Halcones",
            outcome,
          },
        }),
        NOW,
      );
    expect(decision("entry_approved", "competition")).toMatchObject({
      titleKey: "activity.decision.entryApproved",
      tone: "resolved",
      subtitle: "Halcones · Liga A",
      destination: { to: "/orgs/$orgId/competitions/$competitionId/teams" },
    });
    expect(decision("entry_rejected", "competition").titleKey).toBe(
      "activity.decision.entryRejected",
    );
    expect(decision("schedule_set", "encounter")).toMatchObject({
      titleKey: "activity.decision.scheduleSet",
      destination: { to: "/orgs/$orgId/competitions/$competitionId/encounters" },
    });
    expect(decision("schedule_kept", "encounter").titleKey).toBe("activity.decision.scheduleKept");
    expect(decision("walkover_intended", "encounter").titleKey).toBe(
      "activity.decision.walkoverIntended",
    );
    expect(decision(null, "encounter").titleKey).toBe("activity.decision.generic");
  });

  it("asks the organizer to review a pending entry and keeps it as a Team entry once closed", () => {
    const pending = entry({ kind: "competition_entry", resourceType: "competition" });
    expect(activityRowView(pending, NOW)).toMatchObject({
      titleKey: "activity.competitionEntry.pending",
      tone: "default",
      subtitle: "Halcones · Liga A",
      destination: { to: "/orgs/$orgId/competitions/$competitionId/teams" },
    });
    expect(activityRowView({ ...pending, status: "closed" }, NOW)).toMatchObject({
      titleKey: "activity.competitionEntry.closed",
      tone: "resolved",
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
