import type {
  CompetitionFormatDto,
  PublicBracketSideDto,
  PublicCalendarEntryDto,
  PublicMatchScoreDto,
  PublicRankingKindDto,
} from "@futrob/api-contracts";
import { publicCompetitionKeySchema, publicOrganizationSlugSchema } from "@futrob/api-contracts";
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

/** «2–1», or «2–1 · 0–0» when the Encounter is played over two official matches. */
export function scoreLabel(score: readonly PublicMatchScoreDto[]): string {
  return score.map((match) => `${match.homeGoals}–${match.awayGoals}`).join(" · ");
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

export interface CalendarRound {
  readonly roundNumber: number;
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
