import type { AccessibleCompetitionDto } from "@futrob/api-contracts";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { calendarDayKind } from "@/modules/statistics/presentation/player-match-view.ts";
import {
  competitionFormatLabel,
  competitionListBadgeVariant as competitionStatusBadgeVariant,
  competitionMark as competitionFormatMark,
  competitionStatusLabel,
  type CompetitionBadgeTone,
  type CompetitionMark,
} from "@/modules/competitions/presentation/competition-labels.ts";

export {
  competitionFormatLabel,
  competitionStatusLabel,
  type CompetitionBadgeTone,
  type CompetitionMark,
};

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

export function competitionMark(
  competition: AccessibleCompetitionDto["competition"],
): CompetitionMark {
  return competitionFormatMark(competition.format);
}

export function competitionListBadgeVariant(
  competition: AccessibleCompetitionDto["competition"],
): CompetitionBadgeTone {
  return competitionStatusBadgeVariant(competition.status);
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
