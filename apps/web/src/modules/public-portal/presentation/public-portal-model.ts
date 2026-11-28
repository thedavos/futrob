import type {
  CompetitionFormatDto,
  PublicBracketSideDto,
  PublicCalendarEntryDto,
  PublicCompetitionStatusDto,
  PublicEncounterStatusDto,
  PublicMatchScoreDto,
  PublicRankingKindDto,
} from "@futrob/api-contracts";
import {
  publicCompetitionKeySchema,
  publicOrganizationSlugSchema,
  publicRankingKindSchema,
} from "@futrob/api-contracts";
import { compareByTime, TIME_SORT_DIRECTION } from "@futrob/shared-kernel";
import { z } from "zod";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";

/** One anonymous read: a 404 is "not found" (never "exists but hidden"), anything else an error. */
export type PortalRead<T> =
  | { readonly status: "ready"; readonly data: T }
  | { readonly status: "not_found" }
  | { readonly status: "error" };

/** Where a published competition lives on the web: `/{organizationSlug}/{competitionKey}`. */
export interface PortalRef {
  readonly organizationSlug: string;
  readonly competitionKey: string;
}

export const PORTAL_SECTIONS = [
  "cover",
  "calendar",
  "standings",
  "bracket",
  "teams",
  "rankings",
  "rules",
] as const;
export type PortalSection = (typeof PORTAL_SECTIONS)[number];

export const PORTAL_RANKING_KINDS = [
  "scorer",
  "assister",
  "rating",
  "mvp",
  "goalkeeper",
] as const satisfies readonly PublicRankingKindDto[];

/** A format without an elimination stage has no bracket, so its tab is omitted, not empty. */
export function hasBracket(format: CompetitionFormatDto): boolean {
  switch (format) {
    case "league":
    case "swiss":
      return false;
    case "league-playoffs":
    case "knockout":
    case "groups-knockout":
      return true;
    default: {
      const exhaustive: never = format;
      return exhaustive;
    }
  }
}

export function portalSections(format: CompetitionFormatDto): readonly PortalSection[] {
  return PORTAL_SECTIONS.filter((section) => section !== "bracket" || hasBracket(format));
}

/** The web path of a section. Shared by the portal tabs and the organizer's "view" link. */
export function portalPath(ref: PortalRef, section: PortalSection = "cover"): string {
  const base = `/${encodeURIComponent(ref.organizationSlug)}/${encodeURIComponent(ref.competitionKey)}`;
  return section === "cover" ? base : `${base}/${section}`;
}

/** Human-readable organization label derived from its public URL slug (e.g. `liga-andina` → `Liga Andina`). */
export function organizationSlugLabel(slug: string): string {
  return slug
    .split(/[-_]+/)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * Section a public portal pathname is asking for, without needing the competition identity.
 * Used while the layout loader is still pending.
 */
export function portalSectionFromPathname(pathname: string): PortalSection {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const tail = normalized.split("/").pop() ?? "";
  switch (tail) {
    case "calendar":
    case "standings":
    case "bracket":
    case "teams":
    case "rankings":
    case "rules":
      return tail;
    default:
      return "cover";
  }
}

/**
 * Search contract for `/$organizationSlug/$competitionKey/rankings`. Shared by the route loader
 * and the pending frame skeleton so deep links keep their ranking kind while identity loads.
 */
export const portalRankingSearchSchema = z.object({
  kind: publicRankingKindSchema.optional().catch(undefined),
});

/** Search contract for `/$organizationSlug/$competitionKey/calendar`, supporting team deep links. */
export const portalCalendarSearchSchema = z.object({
  team: z.string().min(1).max(120).optional().catch(undefined),
});

/** Validated ranking kind from a URL search string, defaulting to `scorer` when missing or invalid. */
export function portalRankingKindFromSearch(searchStr: string): PublicRankingKindDto {
  const parsed = portalRankingSearchSchema.safeParse({
    kind: new URLSearchParams(searchStr).get("kind") ?? undefined,
  });
  return parsed.success ? (parsed.data.kind ?? "scorer") : "scorer";
}

/** «2–1», or «2–1 · 0–0» when the Encounter is played over two official matches. */
export function scoreLabel(score: readonly PublicMatchScoreDto[]): string {
  return score.map((match) => `${match.homeGoals}–${match.awayGoals}`).join(" · ");
}

export interface ScoreSummary {
  readonly homeGoals: number;
  readonly awayGoals: number;
  readonly leader: "home" | "away" | "draw";
  readonly legs: readonly PublicMatchScoreDto[];
}

/** Aggregate totals and leader side for rendering a public Encounter score with a lime leader digit. */
export function scoreSummary(score: readonly PublicMatchScoreDto[] | null): ScoreSummary | null {
  if (!score || score.length === 0) return null;
  let homeGoals = 0;
  let awayGoals = 0;
  for (const leg of score) {
    homeGoals += leg.homeGoals;
    awayGoals += leg.awayGoals;
  }
  const leader = homeGoals > awayGoals ? "home" : awayGoals > homeGoals ? "away" : "draw";
  return { homeGoals, awayGoals, leader, legs: score };
}

/** Kick-off in the competition's time zone, so every visitor reads the same local time. */
export function kickoffLabel(iso: string, timeZone: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(new Date(iso));
}

export function kickoffTimeOnly(iso: string, timeZone: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(new Date(iso));
}

export function zonedDateKey(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).formatToParts(new Date(iso));
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

export function calendarDayLabel(iso: string, timeZone: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone,
  }).format(new Date(iso));
}

export interface CalendarRound {
  readonly roundNumber: number;
  readonly entries: readonly PublicCalendarEntryDto[];
}

export interface CalendarDayGroup {
  readonly dateKey: string;
  readonly firstIso: string;
  readonly entries: readonly PublicCalendarEntryDto[];
}

/** Rounds in order, each with its Encounters by kick-off. */
export function calendarRounds(
  entries: readonly PublicCalendarEntryDto[],
): readonly CalendarRound[] {
  const byRound = new Map<number, PublicCalendarEntryDto[]>();
  for (const entry of entries) {
    const round = byRound.get(entry.roundNumber) ?? [];
    round.push(entry);
    byRound.set(entry.roundNumber, round);
  }
  return [...byRound.entries()]
    .sort(([left], [right]) => left - right)
    .map(([roundNumber, round]) => ({
      roundNumber,
      entries: [...round].sort(kickoffOrder(TIME_SORT_DIRECTION.asc)),
    }));
}

/** Encounters grouped by competition local calendar date, chronological. */
export function calendarDays(
  entries: readonly PublicCalendarEntryDto[],
  timeZone: string,
): readonly CalendarDayGroup[] {
  const sorted = [...entries].sort(kickoffOrder(TIME_SORT_DIRECTION.asc));
  const byDay = new Map<string, PublicCalendarEntryDto[]>();
  for (const entry of sorted) {
    const key = zonedDateKey(entry.scheduledStartAt, timeZone);
    const group = byDay.get(key) ?? [];
    group.push(entry);
    byDay.set(key, group);
  }
  return [...byDay.entries()].map(([dateKey, group]) => ({
    dateKey,
    firstIso: group[0]?.scheduledStartAt ?? "",
    entries: group,
  }));
}

/** Unique team names appearing in the public calendar, sorted by locale. */
export function calendarTeamNames(
  entries: readonly PublicCalendarEntryDto[],
  locale: string,
): readonly string[] {
  const names = new Set<string>();
  for (const entry of entries) {
    names.add(entry.homeTeamName);
    names.add(entry.awayTeamName);
  }
  return [...names].sort((left, right) => left.localeCompare(right, locale));
}

export interface PortalCalendarFilters {
  readonly team: string | null;
  readonly round: number | null;
  readonly status: PublicEncounterStatusDto | null;
}

export function filterCalendarEntries(
  entries: readonly PublicCalendarEntryDto[],
  filters: PortalCalendarFilters,
): readonly PublicCalendarEntryDto[] {
  return entries.filter((entry) => {
    if (
      filters.team !== null &&
      entry.homeTeamName !== filters.team &&
      entry.awayTeamName !== filters.team
    ) {
      return false;
    }
    if (filters.round !== null && entry.roundNumber !== filters.round) {
      return false;
    }
    if (filters.status !== null && entry.status !== filters.status) {
      return false;
    }
    return true;
  });
}

export interface PortalProgress {
  readonly official: number;
  readonly total: number;
  readonly percent: number;
  readonly completed: boolean;
}

/**
 * Officialized share of the published Encounters for the hero banner. The calendar only lists
 * pairings with both Teams known (later knockout and Swiss rounds appear as they are drawn), so
 * the count is not a season total: only the competition status can say the season is over.
 */
export function portalCalendarProgress(
  entries: readonly PublicCalendarEntryDto[],
  status: PublicCompetitionStatusDto,
): PortalProgress | null {
  if (entries.length === 0) return null;
  const official = entries.filter((entry) => entry.status === "official").length;
  const total = entries.length;
  return {
    official,
    total,
    percent: Math.round((official / total) * 100),
    completed: status === "finished",
  };
}

const kickoffOrder = (direction: (typeof TIME_SORT_DIRECTION)[keyof typeof TIME_SORT_DIRECTION]) =>
  compareByTime<PublicCalendarEntryDto>((entry) => new Date(entry.scheduledStartAt), direction);

/** The next Encounters still to be played, soonest first. Status decides, not the clock. */
export function upcomingEntries(
  entries: readonly PublicCalendarEntryDto[],
  limit: number,
): readonly PublicCalendarEntryDto[] {
  return entries
    .filter((entry) => entry.status === "scheduled")
    .sort(kickoffOrder(TIME_SORT_DIRECTION.asc))
    .slice(0, limit);
}

/** The latest officialized results, most recent first. */
export function latestResults(
  entries: readonly PublicCalendarEntryDto[],
  limit: number,
): readonly PublicCalendarEntryDto[] {
  return entries
    .filter((entry) => entry.status === "official" && entry.score !== null)
    .sort(kickoffOrder(TIME_SORT_DIRECTION.desc))
    .slice(0, limit);
}

/** Best single Encounter to highlight on the Cover with `MatchPitchSurface`. */
export function featuredCoverEncounter(
  entries: readonly PublicCalendarEntryDto[],
): PublicCalendarEntryDto | null {
  const latest = latestResults(entries, 1)[0];
  if (latest) return latest;
  const next = upcomingEntries(entries, 1)[0];
  if (next) return next;
  const awaiting = entries
    .filter((entry) => entry.status === "awaiting_result")
    .sort(kickoffOrder(TIME_SORT_DIRECTION.desc))[0];
  return awaiting ?? null;
}

export {
  publicRankingSummary,
  publicStandingsCut,
  publicStandingsSummary,
  rankingUsesPerMatchRate,
  type PublicRankingSummary,
  type PublicStandingsGoalsLeader,
  type PublicStandingsSummary,
} from "./public-portal-summary-model.ts";

/** Who fills a bracket side, in words. A bye has no opponent and never a score. */
export function bracketSideLabel(side: PublicBracketSideDto, t: Translator): string {
  switch (side.kind) {
    case "team":
      return side.name;
    case "bye":
      return t("portal.bracket.side.bye");
    case "winner":
      return t("portal.bracket.side.winner", { round: side.roundNumber, order: side.order });
    case "group_rank":
      return t("portal.bracket.side.groupRank", { group: side.group, rank: side.rank });
    case "stage_rank":
      return t("portal.bracket.side.stageRank", { rank: side.rank });
    case "pending":
      return t("portal.bracket.side.pending");
    default: {
      const exhaustive: never = side;
      return exhaustive;
    }
  }
}

const portalRefSchema = z.object({
  organizationSlug: publicOrganizationSlugSchema,
  competitionKey: publicCompetitionKeySchema,
});

/** URL params as a portal reference, or null when no published competition could live there. */
export function parsePortalRef(params: Readonly<Record<string, string>>): PortalRef | null {
  const parsed = portalRefSchema.safeParse(params);
  return parsed.success ? parsed.data : null;
}
