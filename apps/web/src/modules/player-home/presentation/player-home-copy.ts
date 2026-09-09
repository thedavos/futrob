import type {
  AccessibleCompetitionDto,
  CompetitionFormatDto,
  CompetitionStatusDto,
} from "@futrob/api-contracts";
import type { ParameterlessMessageKey } from "@/shared/presentation/i18n/catalogs.ts";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { calendarDayKind } from "@/modules/statistics/presentation/player-match-view.ts";

export function competitionStatusLabel(status: CompetitionStatusDto, t: Translator): string {
  return t(competitionStatusKey(status));
}

export function competitionListStatus(
  competition: AccessibleCompetitionDto["competition"],
  t: Translator,
): string {
  return competitionStatusLabel(competition.status, t);
}

export function competitionListBadge(
  competition: AccessibleCompetitionDto["competition"],
  t: Translator,
): string {
  return competitionStatusLabel(competition.status, t);
}

export type CompetitionMark = "league" | "cup";
export type CompetitionBadgeTone = "primary" | "info" | "neutral" | "warning" | "outline";

export function competitionMark(
  competition: AccessibleCompetitionDto["competition"],
): CompetitionMark {
  switch (competition.format) {
    case "league":
    case "league-playoffs":
      return "league";
    case "knockout":
    case "groups-knockout":
      return "cup";
    default: {
      const _exhaustive: never = competition.format;
      return _exhaustive;
    }
  }
}

export function competitionListBadgeVariant(
  competition: AccessibleCompetitionDto["competition"],
): CompetitionBadgeTone {
  switch (competition.status) {
    case "published":
      return "primary";
    case "finished":
      return "neutral";
    case "paused":
      return "warning";
    case "archived":
    case "draft":
      return "outline";
    default: {
      const _exhaustive: never = competition.status;
      return _exhaustive;
    }
  }
}

export function competitionFormatLabel(format: CompetitionFormatDto, t: Translator): string {
  return t(competitionFormatKey(format));
}

export function formatEncounterWhen(iso: string, timeZone: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function lastMatchWhen(
  occurredAt: string,
  locale: string,
  t: Translator,
  now = new Date(),
): string {
  const date = new Date(occurredAt);
  const kind = calendarDayKind(date, now);
  const time = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  switch (kind) {
    case "today":
      return `${t("player.matches.day.today")}, ${time}`;
    case "yesterday":
      return `${t("player.matches.day.yesterday")}, ${time}`;
    case "other":
      return `${new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(date)}, ${time}`;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function formatUpdatedAgo(updatedAt: Date, locale: string, now = new Date()): string {
  const seconds = Math.round((updatedAt.getTime() - now.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const abs = Math.abs(seconds);
  if (abs < 60) return rtf.format(seconds, "second");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(hours, "hour");
  return rtf.format(Math.round(hours / 24), "day");
}

function competitionStatusKey(status: CompetitionStatusDto): ParameterlessMessageKey {
  switch (status) {
    case "published":
      return "player.home.competitions.status.published";
    case "draft":
      return "player.home.competitions.status.draft";
    case "paused":
      return "player.home.competitions.status.paused";
    case "finished":
      return "player.home.competitions.status.finished";
    case "archived":
      return "player.home.competitions.status.archived";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function competitionFormatKey(format: CompetitionFormatDto): ParameterlessMessageKey {
  switch (format) {
    case "league":
      return "player.home.competitions.format.league";
    case "knockout":
      return "player.home.competitions.format.knockout";
    case "groups-knockout":
      return "player.home.competitions.format.groups-knockout";
    case "league-playoffs":
      return "player.home.competitions.format.league-playoffs";
    default: {
      const _exhaustive: never = format;
      return _exhaustive;
    }
  }
}
