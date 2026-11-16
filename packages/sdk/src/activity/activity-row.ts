import type { ActivityEntryDto } from "@futrob/api-contracts";

/**
 * Pure activity-feed row model shared by clients (web's `activityRowView` without icons or
 * router types). Clients localize `title` and map `destination` to their own routes.
 */

export type ActivityTone = "default" | "urgent" | "waiting" | "resolved";

/** Stable message ids; same names as web's `activity.*` catalog keys. */
export type ActivityTitle =
  | "matchDispute.open"
  | "matchDispute.closed"
  | "selection.closed"
  | "selection.expired"
  | "selection.pending"
  | "selection.watching"
  | "invitation.closed"
  | "invitation.expired"
  | "invitation.pending"
  | "invitation.watching"
  | "competitionPublished"
  | "entryInvitation.closed"
  | "entryInvitation.expired"
  | "entryInvitation.pending"
  | "entryInvitation.watching"
  | "scheduleChange.closed"
  | "scheduleChange.expired"
  | "scheduleChange.decide"
  | "scheduleChange.pending"
  | "scheduleChange.watching"
  | "decision.entryApproved"
  | "decision.entryRejected"
  | "decision.scheduleSet"
  | "decision.scheduleKept"
  | "decision.walkoverIntended"
  | "decision.sanctionImposed"
  | "decision.sanctionRevoked"
  | "decision.generic"
  | "competitionEntry.closed"
  | "competitionEntry.pending"
  | "competitionEntry.watching";

/**
 * Where a row leads, by the space it belongs to. Organization rows go to the competition the
 * operators run; Team rows to the actor's Team space; actor rows to their invitations.
 */
export type ActivityDestination =
  | {
      readonly kind: "competition" | "team";
      readonly organizationId: string;
      readonly competitionId: string;
    }
  | { readonly kind: "roster_invitations" }
  | { readonly kind: "entry_invitation"; readonly invitationId: string };

export interface ActivityRow {
  readonly id: string;
  readonly title: ActivityTitle;
  /** Names only, joined for display: who or what the fact is about. */
  readonly subtitle: string | null;
  readonly tone: ActivityTone;
  readonly at: string;
  readonly destination: ActivityDestination | null;
}

function isExpired(entry: ActivityEntryDto, now: Date): boolean {
  return (
    entry.status === "open" &&
    entry.expiresAt !== null &&
    new Date(entry.expiresAt).getTime() <= now.getTime()
  );
}

function openTitle<Prefix extends "selection" | "invitation" | "entryInvitation">(
  prefix: Prefix,
  entry: ActivityEntryDto,
  now: Date,
): `${Prefix}.${"closed" | "expired" | "pending" | "watching"}` {
  if (entry.status !== "open") return `${prefix}.closed`;
  if (isExpired(entry, now)) return `${prefix}.expired`;
  return entry.requiresAction ? `${prefix}.pending` : `${prefix}.watching`;
}

const DECISIONS = {
  entry_approved: "decision.entryApproved",
  entry_rejected: "decision.entryRejected",
  schedule_set: "decision.scheduleSet",
  schedule_kept: "decision.scheduleKept",
  walkover_intended: "decision.walkoverIntended",
  sanction_imposed: "decision.sanctionImposed",
  sanction_revoked: "decision.sanctionRevoked",
} as const satisfies Record<NonNullable<ActivityEntryDto["subject"]["outcome"]>, ActivityTitle>;

function title(entry: ActivityEntryDto, now: Date): ActivityTitle {
  const open = entry.status === "open";
  switch (entry.kind) {
    case "match_dispute":
      return open ? "matchDispute.open" : "matchDispute.closed";
    case "selection_confirmation":
      return openTitle("selection", entry, now);
    case "roster_invitation":
      return openTitle("invitation", entry, now);
    case "competition_published":
      return "competitionPublished";
    case "entry_invitation":
      return openTitle("entryInvitation", entry, now);
    case "schedule_change":
      if (!open) return "scheduleChange.closed";
      if (isExpired(entry, now)) return "scheduleChange.expired";
      if (entry.audience === "organization" && entry.requiresAction) {
        return "scheduleChange.decide";
      }
      return entry.requiresAction ? "scheduleChange.pending" : "scheduleChange.watching";
    case "organizer_decision":
      return entry.subject.outcome ? DECISIONS[entry.subject.outcome] : "decision.generic";
    case "competition_entry":
      if (!open) return "competitionEntry.closed";
      return entry.requiresAction ? "competitionEntry.pending" : "competitionEntry.watching";
  }
}

function tone(entry: ActivityEntryDto, now: Date): ActivityTone {
  if (entry.status === "closed" || isExpired(entry, now)) return "resolved";
  if (entry.kind === "match_dispute") return "urgent";
  return entry.requiresAction ? "default" : "waiting";
}

/** The part of the snapshot a row leads with: the match, or the Team, it is about. */
function about(entry: ActivityEntryDto): string | null {
  const { encounterLabel, teamName } = entry.subject;
  switch (entry.kind) {
    case "selection_confirmation":
    case "match_dispute":
    case "schedule_change":
      return encounterLabel;
    case "organizer_decision":
      return encounterLabel ?? teamName;
    case "roster_invitation":
    case "competition_entry":
      return teamName;
    case "competition_published":
    case "entry_invitation":
      return null;
  }
}

function subtitle(entry: ActivityEntryDto): string | null {
  const parts = [about(entry), entry.subject.competitionName].filter((part): part is string =>
    Boolean(part),
  );
  return parts.length > 0 ? parts.join(" · ") : null;
}

function destination(entry: ActivityEntryDto): ActivityDestination | null {
  if (entry.audience === "actor") {
    if (entry.kind === "entry_invitation") {
      return { kind: "entry_invitation", invitationId: entry.resourceId };
    }
    return entry.kind === "roster_invitation" ? { kind: "roster_invitations" } : null;
  }
  if (!entry.competitionId) return null;
  return {
    kind: entry.audience === "team" ? "team" : "competition",
    organizationId: entry.organizationId,
    competitionId: entry.competitionId,
  };
}

/** One row of an activity feed. Names come from the server snapshot; copy from the client. */
export function activityRow(entry: ActivityEntryDto, now: Date): ActivityRow {
  return {
    id: entry.id,
    title: title(entry, now),
    subtitle: subtitle(entry),
    tone: tone(entry, now),
    at: entry.lastEventAt,
    destination: destination(entry),
  };
}

/**
 * Compact relative time for rows: «hace 3 h», «ayer». Runtimes without
 * `Intl.RelativeTimeFormat` (Hermes on React Native) get the time today, else the date.
 */
export function formatActivityTime(at: string, locale: string, now: Date): string {
  const date = new Date(at);
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  // SAFETY: the lib types declare RelativeTimeFormat everywhere, but Hermes (React Native)
  // ships Intl without it; widening to `undefined` only makes that real absence checkable.
  if ((Intl.RelativeTimeFormat as typeof Intl.RelativeTimeFormat | undefined) === undefined) {
    const sameDay = date.toDateString() === now.toDateString();
    return new Intl.DateTimeFormat(
      locale,
      sameDay ? { hour: "2-digit", minute: "2-digit" } : { day: "numeric", month: "short" },
    ).format(date);
  }
  const format = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" });
  if (Math.abs(seconds) < 60) return format.format(0, "minute");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return format.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return format.format(hours, "hour");
  return format.format(Math.round(hours / 24), "day");
}
