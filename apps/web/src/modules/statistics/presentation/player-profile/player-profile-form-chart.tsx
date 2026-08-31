import type { PlayerGameProfileDto } from "@futrob/api-contracts";
import * as stylex from "@stylexjs/stylex";
import {
  applyProps,
  applyStyles,
  Badge,
  Body,
  Caption,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  Heading,
  Separator,
  StatValue,
  vis,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { preventChartMouseFocus } from "./player-profile-chart-focus.ts";
import { outcomeLabel, outcomeShortLabel } from "./player-profile-copy.ts";
import {
  chartTooltipContentSchema,
  chartTooltipFromParsed,
} from "./player-profile-chart-tooltip.ts";
import {
  lastOutcomes,
  outcomeColor,
  winPercent,
  type MatchOutcome,
} from "./player-profile-model.ts";

const LAST_FIVE = 5;

const styles = stylex.create({
  header: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    width: "100%",
    textAlign: "start",
  },
  heading: {
    display: "inline-block",
  },
  description: {
    display: "inline-block",
  },
  card: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
  },
  cardContent: {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
  },
  body: {
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    justifyContent: "space-between",
    flexGrow: 1,
    gap: "1.25rem",
  },
  summary: {
    display: "flex",
    flexWrap: "wrap",
    flexDirection: {
      default: "row",
      [media.maxSm]: "column",
    },
    alignItems: {
      default: "center",
      [media.maxSm]: "flex-start",
    },
    justifyContent: {
      default: "center",
      [media.maxSm]: "flex-start",
    },
    gap: "1.25rem",
    width: "100%",
  },
  chart: {
    position: "relative",
    width: "13rem",
    height: "13rem",
    flexShrink: 0,
  },
  chartSurface: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    height: "100%",
  },
  center: {
    position: "absolute",
    inset: 0,
    zIndex: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  },
  centerCopy: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    maxWidth: "5.5rem",
  },
  legend: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    flexGrow: 1,
    minWidth: "8rem",
    gap: "0.5rem",
    margin: 0,
    padding: 0,
    listStyleType: "none",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.375rem",
  },
  swatch: {
    width: "0.625rem",
    height: "0.625rem",
    borderRadius: "var(--corner-full)",
    flexShrink: 0,
  },
  lastFive: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "0.5rem",
    width: "100%",
  },
  formRow: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    gap: "0.375rem",
  },
  formBadge: {
    minWidth: {
      default: "2.25rem",
      [media.maxSm]: "2.75rem",
    },
    minHeight: {
      default: "2.25rem",
      [media.maxSm]: "2.75rem",
    },
    justifyContent: "center",
    borderRadius: "var(--corner-md)",
    fontVariantNumeric: "tabular-nums",
  },
  swatchWin: { backgroundColor: colors.success },
  swatchDraw: { backgroundColor: colors.warning },
  swatchLoss: { backgroundColor: colors.danger },
  swatchUnknown: { backgroundColor: colors.mutedForeground },
  tooltip: {
    display: "flex",
    flexDirection: "column",
    gap: "0.125rem",
    borderRadius: "var(--corner-md)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingBlock: "0.5rem",
    paddingInline: "0.75rem",
  },
  tooltipValue: {
    fontVariantNumeric: "tabular-nums",
  },
});

const swatchTone = {
  win: styles.swatchWin,
  draw: styles.swatchDraw,
  loss: styles.swatchLoss,
} as const;

export function PlayerProfileFormChart({
  percentFormat,
  profile,
  t,
}: {
  readonly percentFormat: Intl.NumberFormat;
  readonly profile: PlayerGameProfileDto;
  readonly t: Translator;
}) {
  const winsShare = winPercent(profile.summary);
  const winShareLabel = winsShare === null ? null : percentFormat.format(winsShare / 100);
  const slices = formSlices(profile, t);
  const recent = lastOutcomes(profile.evolution, LAST_FIVE);
  const hasUnknown = profile.evolution.some((point) => point.outcome === "unknown");
  const hasResults = slices.some((slice) => slice.value > 0);

  return (
    <Card className={styles.card}>
      <CardHeader className={styles.header}>
        <Heading as="h2" {...applyProps(undefined, undefined, styles.heading)}>
          {t("player.statistics.form")}
        </Heading>
        <CardDescription className={styles.description}>
          {t("player.statistics.form.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className={styles.cardContent}>
        {!hasResults ? (
          <Caption>{t("player.statistics.form.empty")}</Caption>
        ) : (
          <div {...applyStyles(styles.body)}>
            <div {...applyStyles(styles.summary)}>
              <div
                data-slot="player-chart"
                onMouseDown={preventChartMouseFocus}
                {...applyStyles(styles.chart)}
              >
                <div {...applyStyles(styles.chartSurface)}>
                  <ResponsiveContainer height="100%" width="100%">
                    <PieChart accessibilityLayer={false} style={{ outline: "none" }}>
                      <Pie
                        cx="50%"
                        cy="50%"
                        data={slices}
                        dataKey="value"
                        innerRadius={56}
                        isAnimationActive={false}
                        nameKey="label"
                        outerRadius={84}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {slices.map((slice) => (
                          <Cell
                            fill={outcomeColor(slice.outcome)}
                            key={slice.outcome}
                            style={{ outline: "none" }}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        content={(props) => {
                          const parsed = chartTooltipContentSchema.safeParse(props);
                          if (!parsed.success) return null;
                          const tip = chartTooltipFromParsed(parsed.data);
                          return <FormTooltip name={tip.name} value={tip.value} />;
                        }}
                        isAnimationActive={false}
                        wrapperStyle={{ zIndex: 2 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {winShareLabel === null ? null : (
                  <div {...applyStyles(styles.center)}>
                    <div
                      aria-label={t("player.statistics.form.winShare", { percent: winShareLabel })}
                      {...applyStyles(styles.centerCopy)}
                    >
                      <StatValue size="compact">
                        {t("player.statistics.form.winShare.percent", { percent: winShareLabel })}
                      </StatValue>
                      <Caption as="span">{t("player.statistics.form.winShare.label")}</Caption>
                    </div>
                  </div>
                )}
              </div>
              <ul {...applyStyles(styles.legend)}>
                {slices.map((slice) => (
                  <li key={slice.outcome} {...applyStyles(styles.legendItem)}>
                    <span {...applyStyles(styles.swatch, swatchTone[slice.outcome])} />
                    <Caption as="span">{slice.label}</Caption>
                  </li>
                ))}
                {hasUnknown ? (
                  <li {...applyStyles(styles.legendItem)}>
                    <span {...applyStyles(styles.swatch, styles.swatchUnknown)} />
                    <Caption as="span">{outcomeLabel("unknown", t)}</Caption>
                  </li>
                ) : null}
              </ul>
            </div>
            {recent.length === 0 ? null : (
              <>
                <Separator />
                <div {...applyStyles(styles.lastFive)}>
                  <Caption>{t("player.statistics.form.lastFive")}</Caption>
                  <div {...applyStyles(styles.formRow)}>
                    {recent.map((outcome, index) => (
                      <Badge
                        key={`${outcome}-${index}`}
                        {...applyStyles(styles.formBadge)}
                        variant={formBadgeVariant(outcome)}
                      >
                        {outcomeShortLabel(outcome, t)}
                        <span {...applyStyles(vis.srOnly)}>{outcomeLabel(outcome, t)}</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formSlices(
  profile: PlayerGameProfileDto,
  t: Translator,
): readonly {
  readonly outcome: Exclude<MatchOutcome, "unknown">;
  readonly value: number;
  readonly label: string;
}[] {
  return [
    {
      outcome: "win",
      value: profile.summary.wins,
      label: t("player.statistics.form.wins", { count: profile.summary.wins }),
    },
    {
      outcome: "draw",
      value: profile.summary.draws,
      label: t("player.statistics.form.draws", { count: profile.summary.draws }),
    },
    {
      outcome: "loss",
      value: profile.summary.losses,
      label: t("player.statistics.form.losses", { count: profile.summary.losses }),
    },
  ];
}

function formBadgeVariant(
  outcome: MatchOutcome,
): "primary" | "warning" | "destructive" | "outline" {
  switch (outcome) {
    case "win":
      return "primary";
    case "draw":
      return "warning";
    case "loss":
      return "destructive";
    case "unknown":
      return "outline";
    default: {
      const _exhaustive: never = outcome;
      return _exhaustive;
    }
  }
}

function FormTooltip({
  name,
  value,
}: {
  readonly name: string | undefined;
  readonly value: number | undefined;
}) {
  if (name === undefined || value === undefined) return null;
  return (
    <div {...applyStyles(styles.tooltip)}>
      <Caption>{name}</Caption>
      <Body as="span" weight="medium" {...applyStyles(styles.tooltipValue)}>
        {value}
      </Body>
    </div>
  );
}
