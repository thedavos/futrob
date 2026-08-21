"use client";

import { Badge, Card, CardContent, CardHeader, Stat, StatLabel } from "@futrob/ui";
import { StarIcon } from "@phosphor-icons/react";
import type { ParameterlessMessageKey } from "@/shared/presentation/i18n/catalogs.ts";
import { MetricStatValue } from "@/shared/presentation/stats/metric-stat-value.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import type { MatchHighlight, MatchHighlightKind } from "./provider-match-detail-model.ts";

const HIGHLIGHT_TITLE_KEYS = {
  mvp: "player.matchDetail.highlights.mvp",
  scorer: "player.matchDetail.highlights.scorer",
  rival: "player.matchDetail.highlights.rival",
} as const satisfies Record<MatchHighlightKind, ParameterlessMessageKey>;

export const SUMMARY_CARD_HEADER_CLASS = "space-y-2 px-5 pt-5 pb-4";
export const SUMMARY_CARD_CONTENT_CLASS = "px-5 pb-5";

export function MatchHighlightsCard({
  highlights,
  numberFormat,
  t,
}: {
  readonly highlights: readonly MatchHighlight[];
  readonly numberFormat: Intl.NumberFormat;
  readonly t: Translator;
}) {
  return (
    <Card className="flex h-full min-w-0 flex-col" data-match-highlights="">
      <CardHeader className={SUMMARY_CARD_HEADER_CLASS}>
        <h2 className="typo-label">{t("player.matchDetail.highlights")}</h2>
      </CardHeader>
      <CardContent className={`${SUMMARY_CARD_CONTENT_CLASS} flex flex-1 flex-col`}>
        {highlights.length === 0 ? (
          <p className="typo-caption m-auto max-w-prose text-pretty text-center text-muted-foreground">
            {t("player.matchDetail.highlights.empty")}
          </p>
        ) : (
          <ul className="grid flex-1 grid-cols-1 content-stretch gap-4 sm:grid-cols-2">
            {highlights.map((item) => (
              <HighlightItem
                item={item}
                key={`${item.kind}:${item.player.externalPlayerId}`}
                numberFormat={numberFormat}
                t={t}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function HighlightItem({
  item,
  numberFormat,
  t,
}: {
  readonly item: MatchHighlight;
  readonly numberFormat: Intl.NumberFormat;
  readonly t: Translator;
}) {
  const primary = highlightPrimary(item, numberFormat, t);
  const secondary = highlightSecondary(item, numberFormat, t);
  return (
    <li
      className="flex h-full min-w-0 items-center justify-center gap-4 rounded-lg border border-border bg-surface px-4 py-4 odd:last:col-span-2"
      data-highlight={item.kind}
    >
      <Stat align="center" className="shrink-0">
        <MetricStatValue emptyLabel={t("player.noData")} value={primary.value} />
        <StatLabel className="text-pretty text-center">{primary.label}</StatLabel>
      </Stat>
      <div className="flex min-w-0 flex-col items-center gap-1 text-center">
        <Badge className="shrink-0" variant="outline">
          {item.kind === "mvp" ? <StarIcon aria-hidden="true" weight="fill" /> : null}
          {t(HIGHLIGHT_TITLE_KEYS[item.kind])}
        </Badge>
        <p className="typo-body min-w-0 max-w-full truncate font-semibold">
          {item.player.displayName}
        </p>
        {secondary ? (
          <p className="typo-caption text-pretty text-muted-foreground">{secondary}</p>
        ) : null}
      </div>
    </li>
  );
}

interface HighlightPrimary {
  readonly label: string;
  readonly value: string | null;
}

function highlightPrimary(
  item: MatchHighlight,
  numberFormat: Intl.NumberFormat,
  t: Translator,
): HighlightPrimary {
  switch (item.kind) {
    case "mvp":
    case "rival": {
      const primary: HighlightPrimary = {
        label: t("player.metric.rating"),
        value: item.rating === null ? null : numberFormat.format(item.rating),
      };
      return primary;
    }
    case "scorer": {
      const primary: HighlightPrimary = {
        label: t("player.metric.goals"),
        value: item.goals === null ? null : numberFormat.format(item.goals),
      };
      return primary;
    }
    default: {
      const _exhaustive: never = item;
      return _exhaustive;
    }
  }
}

function highlightSecondary(
  item: MatchHighlight,
  numberFormat: Intl.NumberFormat,
  t: Translator,
): string | null {
  switch (item.kind) {
    case "mvp":
      return joinHighlightLines([
        item.assists === null
          ? null
          : t("player.matchDetail.highlights.assists", { count: item.assists }),
        passLine(item.passesMade, item.passAttempts, numberFormat, t),
      ]);
    case "scorer":
      return joinHighlightLines([
        item.shots === null
          ? null
          : t("player.matchDetail.highlights.shots", { count: item.shots }),
        item.rating === null
          ? null
          : t("player.matchDetail.highlights.rating", {
              rating: numberFormat.format(item.rating),
            }),
      ]);
    case "rival":
      return joinHighlightLines([
        passLine(item.passesMade, item.passAttempts, numberFormat, t),
        item.tacklesMade === null
          ? null
          : t("player.matchDetail.highlights.tackles", { count: item.tacklesMade }),
      ]);
    default: {
      const _exhaustive: never = item;
      return _exhaustive;
    }
  }
}

function passLine(
  made: number | null,
  attempts: number | null,
  numberFormat: Intl.NumberFormat,
  t: Translator,
): string | null {
  if (made === null || attempts === null) return null;
  return t("player.matchDetail.highlights.passes", {
    made: numberFormat.format(made),
    attempts: numberFormat.format(attempts),
  });
}

function joinHighlightLines(parts: readonly (string | null)[]): string | null {
  const lines = parts.filter((part): part is string => part !== null);
  return lines.length === 0 ? null : lines.join(" · ");
}
