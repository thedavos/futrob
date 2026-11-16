import type { ActivityEntryDto } from "@futrob/api-contracts";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { activityRow, formatActivityTime } from "./index.ts";

const now = new Date("2026-11-12T12:00:00.000Z");

function entry(overrides: Partial<ActivityEntryDto> = {}): ActivityEntryDto {
  return {
    id: "activity-1",
    organizationId: "org-1",
    competitionId: "competition-1",
    audience: "team",
    kind: "selection_confirmation",
    status: "open",
    requiresAction: true,
    resourceType: "encounter",
    resourceId: "encounter-1",
    subject: {
      competitionName: "Liga Futrob",
      encounterLabel: "Cuervos FC vs Tigres FC",
      teamName: "Cuervos FC",
      outcome: null,
    },
    openedAt: "2026-11-12T10:00:00.000Z",
    closedAt: null,
    expiresAt: null,
    lastEventAt: "2026-11-12T11:00:00.000Z",
    ...overrides,
  };
}

describe("activityRow", () => {
  it("asks the Team to act on an open selection and leads to its Team space", () => {
    expect(activityRow(entry(), now)).toEqual({
      id: "activity-1",
      title: "selection.pending",
      subtitle: "Cuervos FC vs Tigres FC · Liga Futrob",
      tone: "default",
      at: "2026-11-12T11:00:00.000Z",
      destination: { kind: "team", organizationId: "org-1", competitionId: "competition-1" },
    });
  });

  it("marks an open row past its deadline as expired and resolved", () => {
    const row = activityRow(entry({ expiresAt: "2026-11-12T11:30:00.000Z" }), now);
    expect(row.title).toBe("selection.expired");
    expect(row.tone).toBe("resolved");
  });

  it("flags open disputes as urgent and sends operators to the competition", () => {
    const row = activityRow(
      entry({ kind: "match_dispute", audience: "organization", requiresAction: false }),
      now,
    );
    expect(row.title).toBe("matchDispute.open");
    expect(row.tone).toBe("urgent");
    expect(row.destination).toEqual({
      kind: "competition",
      organizationId: "org-1",
      competitionId: "competition-1",
    });
  });

  it("separates a schedule change the organization decides from one it watches", () => {
    const base = { kind: "schedule_change", audience: "organization" } as const;
    expect(activityRow(entry({ ...base, requiresAction: true }), now).title).toBe(
      "scheduleChange.decide",
    );
    expect(activityRow(entry({ ...base, requiresAction: false }), now).title).toBe(
      "scheduleChange.watching",
    );
  });

  it("names organizer decisions by outcome", () => {
    const decision = entry({
      kind: "organizer_decision",
      status: "closed",
      subject: { ...entry().subject, encounterLabel: null, outcome: "entry_approved" },
    });
    const row = activityRow(decision, now);
    expect(row.title).toBe("decision.entryApproved");
    expect(row.subtitle).toBe("Cuervos FC · Liga Futrob");
    expect(row.tone).toBe("resolved");
  });

  it("sends the actor's invitations to where they answer them", () => {
    const invitation = entry({
      kind: "roster_invitation",
      audience: "actor",
      resourceType: "roster_invitation",
      resourceId: "invitation-1",
    });
    expect(activityRow(invitation, now).destination).toEqual({ kind: "roster_invitations" });
    const entryInvitation = entry({
      kind: "entry_invitation",
      audience: "actor",
      resourceType: "entry_invitation",
      resourceId: "entry-invitation-1",
      subject: { ...entry().subject, competitionName: null },
    });
    const row = activityRow(entryInvitation, now);
    expect(row.destination).toEqual({
      kind: "entry_invitation",
      invitationId: "entry-invitation-1",
    });
    expect(row.subtitle).toBeNull();
  });

  it("leads nowhere when a non-actor row has no competition", () => {
    expect(activityRow(entry({ competitionId: null }), now).destination).toBeNull();
  });
});

describe("formatActivityTime", () => {
  const relativeTimeFormat = Intl.RelativeTimeFormat;

  afterEach(() => {
    Object.defineProperty(Intl, "RelativeTimeFormat", {
      value: relativeTimeFormat,
      configurable: true,
      writable: true,
    });
  });

  it("falls back to the time or date where Intl.RelativeTimeFormat is missing (Hermes)", () => {
    Object.defineProperty(Intl, "RelativeTimeFormat", {
      value: undefined,
      configurable: true,
      writable: true,
    });
    const at = "2026-11-10T09:00:00.000Z";
    expect(formatActivityTime(at, "en", now)).toBe(
      new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(new Date(at)),
    );
  });

  it("formats compact relative times", () => {
    expect(formatActivityTime("2026-11-12T11:59:40.000Z", "en", now)).toBe("this minute");
    expect(formatActivityTime("2026-11-12T09:00:00.000Z", "en", now)).toBe("3 hr. ago");
    expect(formatActivityTime("2026-11-11T12:00:00.000Z", "en", now)).toBe("yesterday");
  });
});
