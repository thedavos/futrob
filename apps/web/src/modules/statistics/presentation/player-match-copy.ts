import type { ParameterlessMessageKey } from "@/shared/presentation/i18n/catalogs.ts";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import {
  startOfLocalDay,
  type CalendarDayKind,
  type MatchOutcome,
  type PlayerMatchesView,
  type ProviderMatchMode,
  type ScoringFeat,
} from "./player-match-view.ts";

export type ListedMatchesView = Exclude<PlayerMatchesView, "recent">;

export const VIEW_TAB_KEYS = {
  recent: "player.matches.view.recent",
  league: "player.matches.view.league",
  playoff: "player.matches.view.playoff",
  friendly: "player.matches.view.friendly",
  all: "player.matches.view.all",
} as const satisfies Record<PlayerMatchesView, ParameterlessMessageKey>;

export const HISTORY_LABEL_KEYS = {
  all: "player.matches.all.historyLabel",
  league: "player.matches.league.historyLabel",
  playoff: "player.matches.playoff.historyLabel",
  friendly: "player.matches.friendly.historyLabel",
} as const satisfies Record<ListedMatchesView, ParameterlessMessageKey>;

export const EMPTY_TITLE_KEYS = {
  all: "player.matches.all.emptyTitle",
  league: "player.matches.league.emptyTitle",
  playoff: "player.matches.playoff.emptyTitle",
  friendly: "player.matches.friendly.emptyTitle",
} as const satisfies Record<ListedMatchesView, ParameterlessMessageKey>;

export const EMPTY_DESCRIPTION_KEYS = {
  all: "player.matches.all.emptyDescription",
  league: "player.matches.league.emptyDescription",
  playoff: "player.matches.playoff.emptyDescription",
  friendly: "player.matches.friendly.emptyDescription",
} as const satisfies Record<ListedMatchesView, ParameterlessMessageKey>;

export const MATCH_TYPE_KEYS = {
  leagueMatch: "player.matches.type.league",
  playoffMatch: "player.matches.type.playoff",
  friendlyMatch: "player.matches.type.friendly",
} as const satisfies Record<ProviderMatchMode, ParameterlessMessageKey>;

export const MATCH_OUTCOME_KEYS = {
  win: "player.matches.outcome.win",
  draw: "player.matches.outcome.draw",
  loss: "player.matches.outcome.loss",
} as const satisfies Record<Exclude<MatchOutcome, "unknown">, ParameterlessMessageKey>;

export const FORM_OUTCOME_SHORT_KEYS = {
  win: "player.matches.form.winShort",
  draw: "player.matches.form.drawShort",
  loss: "player.matches.form.lossShort",
  unknown: "player.matches.form.unknownShort",
} as const satisfies Record<MatchOutcome, ParameterlessMessageKey>;

export const FORM_SEGMENT_TOOLTIP_KEYS = {
  win: "player.matches.form.win",
  draw: "player.matches.form.draw",
  loss: "player.matches.form.loss",
} as const;

export const SCORING_FEAT_KEYS = {
  hatTrick: "player.matches.feat.hatTrick",
  poker: "player.matches.feat.poker",
  repoker: "player.matches.feat.repoker",
} as const satisfies Record<ScoringFeat, ParameterlessMessageKey>;

export function dayHeading(
  kind: CalendarDayKind,
  occurredAt: Date,
  dateFormat: Intl.DateTimeFormat,
  t: Translator,
): string {
  switch (kind) {
    case "today":
      return t("player.matches.day.today");
    case "yesterday":
      return t("player.matches.day.yesterday");
    case "other":
      return formatCalendarDayHeading(occurredAt, dateFormat);
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function formatCalendarDayHeading(occurredAt: Date, dateFormat: Intl.DateTimeFormat): string {
  const day = startOfLocalDay(occurredAt);
  const parts = dateFormat.formatToParts(day);
  const dayPart = parts.find((part) => part.type === "day")?.value;
  const monthPart = parts.find((part) => part.type === "month")?.value;
  const yearPart = parts.find((part) => part.type === "year")?.value;
  if (dayPart === undefined || monthPart === undefined || yearPart === undefined) {
    return dateFormat.format(day);
  }
  if (dateFormat.resolvedOptions().locale.startsWith("es")) {
    return `${dayPart} de ${monthPart} del ${yearPart}`;
  }
  return `${dayPart} ${monthPart} ${yearPart}`;
}
