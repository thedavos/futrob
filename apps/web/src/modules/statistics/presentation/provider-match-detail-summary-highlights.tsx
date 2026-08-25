"use client";

import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  Badge,
  Card,
  CardContent,
  CardHeader,
  Stat,
  StatLabel,
  typography,
} from "@futrob/ui";
import { colors, media } from "@futrob/ui/styles/public.stylex";
import { StarIcon } from "@phosphor-icons/react";
import type { ParameterlessMessageKey } from "@/shared/presentation/i18n/catalogs.ts";
import { MetricStatValue } from "@/shared/presentation/stats/metric-stat-value.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import type { MatchHighlight, MatchHighlightKind } from "./provider-match-detail-model.ts";

const HIGHLIGHT_TITLE_KEYS = {
  mvp: "player.matchDetail.highlights.mvp",
  scorer: "player.matchDetail.highlights.scorer",
  playmaker: "player.matchDetail.highlights.playmaker",
  rival: "player.matchDetail.highlights.rival",
} as const satisfies Record<MatchHighlightKind, ParameterlessMessageKey>;

const styles = stylex.create({
  card: {
    display: "flex",
    height: "100%",
    minWidth: 0,
    flexDirection: "column",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    paddingInline: "1.25rem",
    paddingTop: "1.25rem",
    paddingBottom: "1rem",
  },
  content: {
    paddingInline: "1.25rem",
    paddingBottom: "1.25rem",
    display: "flex",
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "0%",
    flexDirection: "column",
  },
  empty: {
    margin: "auto",
    maxWidth: "65ch",
    textAlign: "center",
    color: colors.mutedForeground,
  },
  list: {
    display: "grid",
    flexGrow: 1,
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "repeat(2, minmax(0, 1fr))",
    },
    alignContent: "stretch",
    gap: "1rem",
  },
  item: {
    display: "flex",
    height: "100%",
    minWidth: 0,
    flexDirection: "column",
    justifyContent: "center",
    gap: "0.5rem",
    borderRadius: "var(--corner-lg)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingInline: "1rem",
    paddingBlock: "1rem",
    gridColumn: {
      default: null,
      ":nth-child(odd):last-child": "span 2",
    },
  },
  itemHeader: {
    display: "flex",
    minWidth: 0,
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "0.75rem",
  },
  itemCopy: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "0.25rem",
    textAlign: "start",
  },
  badge: {
    flexShrink: 0,
  },
  name: {
    minWidth: 0,
    maxWidth: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontWeight: 600,
  },
  stat: {
    flexShrink: 0,
  },
  secondary: {
    textAlign: "start",
    color: colors.mutedForeground,
    overflow: "hidden",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
  },
  pretty: {
    textWrap: "pretty",
  },
});

export const summaryCardHeader = styles.header;
export const summaryCardContent = styles.content;
export const summaryCard = styles.card;

export function MatchHighlightsCard({
  highlights,
  numberFormat,
  percentFormat,
  t,
}: {
  readonly highlights: readonly MatchHighlight[];
  readonly numberFormat: Intl.NumberFormat;
  readonly percentFormat: Intl.NumberFormat;
  readonly t: Translator;
}) {
  const card = applyStyles(styles.card);
  const header = applyStyles(styles.header);
  const content = applyStyles(styles.content);
  return (
    <Card className={card.className} data-match-highlights="" style={card.style}>
      <CardHeader className={header.className} style={header.style}>
        <h2 {...applyStyles(typography.label)}>{t("player.matchDetail.highlights")}</h2>
      </CardHeader>
      <CardContent className={content.className} style={content.style}>
        {highlights.length === 0 ? (
          <p {...applyStyles(typography.caption, styles.empty)}>
            {t("player.matchDetail.highlights.empty")}
          </p>
        ) : (
          <ul {...applyStyles(styles.list)}>
            {highlights.map((item) => (
              <HighlightItem
                item={item}
                key={`${item.kind}:${item.player.externalPlayerId}`}
                numberFormat={numberFormat}
                percentFormat={percentFormat}
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
  percentFormat,
  t,
}: {
  readonly item: MatchHighlight;
  readonly numberFormat: Intl.NumberFormat;
  readonly percentFormat: Intl.NumberFormat;
  readonly t: Translator;
}) {
  const primary = highlightPrimary(item, numberFormat, t);
  const secondary = highlightSecondary(item, numberFormat, percentFormat, t);
  const badge = applyStyles(styles.badge);
  const stat = applyStyles(styles.stat);
  return (
    <li data-highlight={item.kind} {...applyStyles(styles.item)}>
      <header {...applyStyles(styles.itemHeader)}>
        <div {...applyStyles(styles.itemCopy)}>
          <Badge className={badge.className} style={badge.style} variant="outline">
            {item.kind === "mvp" ? <StarIcon aria-hidden="true" weight="fill" /> : null}
            {t(HIGHLIGHT_TITLE_KEYS[item.kind])}
          </Badge>
          <p {...applyStyles(typography.body, styles.name)}>{item.player.displayName}</p>
        </div>
        <Stat align="end" className={stat.className} style={stat.style}>
          <MetricStatValue emptyLabel={t("player.noData")} value={primary.value} />
          <StatLabel {...applyStyles(styles.pretty)}>{primary.label}</StatLabel>
        </Stat>
      </header>
      {secondary ? <p {...applyStyles(typography.caption, styles.secondary)}>{secondary}</p> : null}
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
    case "playmaker": {
      const primary: HighlightPrimary = {
        label: t("player.metric.assists"),
        value: item.assists === null ? null : numberFormat.format(item.assists),
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
  percentFormat: Intl.NumberFormat,
  t: Translator,
): string | null {
  switch (item.kind) {
    case "mvp":
      return joinHighlightLines([
        item.assists === null
          ? null
          : t("player.matchDetail.highlights.assists", { count: item.assists }),
        passLine(item.passesMade, item.passAttempts, percentFormat, t),
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
    case "playmaker":
      return joinHighlightLines([
        passLine(item.passesMade, item.passAttempts, percentFormat, t),
        item.rating === null
          ? null
          : t("player.matchDetail.highlights.rating", {
              rating: numberFormat.format(item.rating),
            }),
      ]);
    case "rival":
      return joinHighlightLines([
        passLine(item.passesMade, item.passAttempts, percentFormat, t),
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
  percentFormat: Intl.NumberFormat,
  t: Translator,
): string | null {
  if (made === null || attempts === null || attempts === 0) return null;
  return t("player.matchDetail.highlights.passAccuracy", {
    percent: percentFormat.format(made / attempts),
  });
}

function joinHighlightLines(parts: readonly (string | null)[]): string | null {
  const lines = parts.filter((part): part is string => part !== null);
  return lines.length === 0 ? null : lines.join(" · ");
}
