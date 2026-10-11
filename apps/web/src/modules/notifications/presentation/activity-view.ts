import type { ActivityEntryDto } from "@futrob/api-contracts";
import type { Icon } from "@futrob/ui";
import {
  CheckSquareIcon,
  EnvelopeSimpleIcon,
  MegaphoneSimpleIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import type { ParameterlessMessageKey } from "@/shared/presentation/i18n/catalogs.ts";

/** Same tones as `QueueTaskItem`; the feed rows reuse them for icon colour. */
export type ActivityTone = "default" | "urgent" | "waiting" | "resolved";

/** Typed router destination of a row; `null` when the row has nowhere useful to go. */
export type ActivityDestination =
  | {
      readonly to:
        | "/orgs/$orgId/competitions/$competitionId/disputes"
        | "/orgs/$orgId/competitions/$competitionId/encounters"
        | "/orgs/$orgId/competitions/$competitionId/teams"
        | "/orgs/$orgId/competitions/$competitionId";
      readonly params: { readonly orgId: string; readonly competitionId: string };
    }
  | {
      readonly to: "/player/competitions/$competitionId/matches";
      readonly params: { readonly competitionId: string };
    }
  | { readonly to: "/invitations"; readonly params?: undefined };

export interface ActivityRowView {
  readonly id: string;
  readonly icon: Icon;
  readonly titleKey: ParameterlessMessageKey;
  /** Names only, joined for display: who or what the fact is about. */
  readonly subtitle: string | null;
  readonly tone: ActivityTone;
  readonly at: Date;
  readonly destination: ActivityDestination | null;
}

function isExpired(entry: ActivityEntryDto, now: Date): boolean {
  return (
    entry.status === "open" &&
    entry.expiresAt !== null &&
    new Date(entry.expiresAt).getTime() <= now.getTime()
  );
}

function titleKey(entry: ActivityEntryDto, now: Date): ParameterlessMessageKey {
  const open = entry.status === "open";
  switch (entry.kind) {
    case "match_dispute":
      return open ? "activity.matchDispute.open" : "activity.matchDispute.closed";
    case "selection_confirmation":
      if (!open) return "activity.selection.closed";
      if (isExpired(entry, now)) return "activity.selection.expired";
      return entry.requiresAction ? "activity.selection.pending" : "activity.selection.watching";
    case "roster_invitation":
      if (!open) return "activity.invitation.closed";
      if (isExpired(entry, now)) return "activity.invitation.expired";
      return entry.requiresAction ? "activity.invitation.pending" : "activity.invitation.watching";
    case "competition_published":
      return "activity.competitionPublished";
  }
}

function icon(entry: ActivityEntryDto): Icon {
  switch (entry.kind) {
    case "match_dispute":
      return WarningCircleIcon;
    case "selection_confirmation":
      return CheckSquareIcon;
    case "roster_invitation":
      return EnvelopeSimpleIcon;
    case "competition_published":
      return MegaphoneSimpleIcon;
  }
}

function tone(entry: ActivityEntryDto, now: Date): ActivityTone {
  if (entry.status === "closed" || isExpired(entry, now)) return "resolved";
  if (entry.kind === "match_dispute") return "urgent";
  return entry.requiresAction ? "default" : "waiting";
}

function subtitle(entry: ActivityEntryDto): string | null {
  const { competitionName, encounterLabel, teamName } = entry.subject;
  const about =
    entry.kind === "selection_confirmation" || entry.kind === "match_dispute"
      ? encounterLabel
      : entry.kind === "roster_invitation"
        ? teamName
        : null;
  const parts = [about, competitionName].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(" · ") : null;
}

function destination(entry: ActivityEntryDto): ActivityDestination | null {
  const competitionId = entry.competitionId;
  if (entry.audience === "actor") {
    return entry.kind === "roster_invitation" ? { to: "/invitations" } : null;
  }
  if (!competitionId) return null;
  if (entry.audience === "team") {
    return { to: "/player/competitions/$competitionId/matches", params: { competitionId } };
  }
  const params = { orgId: entry.organizationId, competitionId };
  switch (entry.kind) {
    case "match_dispute":
      return { to: "/orgs/$orgId/competitions/$competitionId/disputes", params };
    case "selection_confirmation":
      return { to: "/orgs/$orgId/competitions/$competitionId/encounters", params };
    case "roster_invitation":
      return { to: "/orgs/$orgId/competitions/$competitionId/teams", params };
    case "competition_published":
      return { to: "/orgs/$orgId/competitions/$competitionId", params };
  }
}

/** Presentation of one activity row. Names come from the server snapshot, copy from i18n. */
export function activityRowView(entry: ActivityEntryDto, now: Date): ActivityRowView {
  return {
    id: entry.id,
    icon: icon(entry),
    titleKey: titleKey(entry, now),
    subtitle: subtitle(entry),
    tone: tone(entry, now),
    at: new Date(entry.lastEventAt),
    destination: destination(entry),
  };
}

/** Compact relative time for rows: «hace 3 h», «ayer». */
export function formatActivityTime(at: Date, locale: string, now: Date): string {
  const seconds = Math.round((at.getTime() - now.getTime()) / 1000);
  const format = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" });
  if (Math.abs(seconds) < 60) return format.format(0, "minute");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return format.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return format.format(hours, "hour");
  return format.format(Math.round(hours / 24), "day");
}
