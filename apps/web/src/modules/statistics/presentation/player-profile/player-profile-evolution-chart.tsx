import type { PlayerGameProfileDto } from "@futrob/api-contracts";
import * as stylex from "@stylexjs/stylex";
import {
  applyProps,
  applyStyles,
  Body,
  Caption,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  Heading,
  vis,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import {
  EvolutionPointLabel,
  evolutionPointLabelLayoutSchema,
} from "./player-profile-evolution-point-label.tsx";
import {
  chartTooltipContentSchema,
  chartTooltipFromParsed,
} from "./player-profile-chart-tooltip.ts";
import { preventChartMouseFocus } from "./player-profile-chart-focus.ts";
import { outcomeLabel, outcomeShortLabel } from "./player-profile-copy.ts";
import {
  CHART_COLORS,
  outcomeColor,
  ratingAxisScale,
  ratingEvolutionView,
  type MatchOutcome,
  type RatingEvolutionView,
} from "./player-profile-model.ts";

type EvolutionPoint = PlayerGameProfileDto["evolution"][number];

type ChartPoint = {
  readonly occurredAt: string;
  readonly label: string;
  readonly outcomeShort: string;
  readonly rating: number | null;
  readonly outcome: MatchOutcome;
};

const styles = stylex.create({
  header: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    width: "100%",
  },
  heading: {
    display: "inline-block",
  },
  description: {
    display: "inline-block",
  },
  chart: {
    width: "100%",
    height: "18rem",
    overflow: "visible",
  },
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

export function PlayerProfileEvolutionChart({
  dateFormat,
  numberFormat,
  profile,
  t,
}: {
  readonly dateFormat: Intl.DateTimeFormat;
  readonly numberFormat: Intl.NumberFormat;
  readonly profile: PlayerGameProfileDto;
  readonly t: Translator;
}) {
  const view = ratingEvolutionView(profile.evolution);
  const points = profile.evolution.map((point) => toChartPoint(point, dateFormat, t));

  return (
    <Card>
      <CardHeader className={styles.header}>
        <Heading as="h2" {...applyProps(undefined, undefined, styles.heading)}>
          {t("player.statistics.evolution")}
        </Heading>
        <CardDescription className={styles.description}>
          {t("player.statistics.evolution.description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <EvolutionChartBody numberFormat={numberFormat} points={points} t={t} view={view} />
      </CardContent>
    </Card>
  );
}

function EvolutionChartBody({
  numberFormat,
  points,
  t,
  view,
}: {
  readonly numberFormat: Intl.NumberFormat;
  readonly points: readonly ChartPoint[];
  readonly t: Translator;
  readonly view: RatingEvolutionView;
}) {
  switch (view) {
    case "empty":
      return <Caption>{t("player.statistics.evolution.empty")}</Caption>;
    case "unavailable":
      return <Caption>{t("player.statistics.evolution.ratingUnavailable")}</Caption>;
    case "ready":
      return <ReadyEvolutionChart numberFormat={numberFormat} points={points} t={t} />;
    default: {
      const _exhaustive: never = view;
      return _exhaustive;
    }
  }
}

function ReadyEvolutionChart({
  numberFormat,
  points,
  t,
}: {
  readonly numberFormat: Intl.NumberFormat;
  readonly points: readonly ChartPoint[];
  readonly t: Translator;
}) {
  const axis = ratingAxisScale(points.map((point) => point.rating));
  return (
    <>
      <div
        data-slot="player-chart"
        onMouseDown={preventChartMouseFocus}
        {...applyStyles(styles.chart)}
      >
        <ResponsiveContainer height="100%" width="100%">
          <LineChart
            accessibilityLayer={false}
            data={points}
            margin={{ top: 24, right: 20, bottom: 8, left: 0 }}
            style={{ outline: "none" }}
          >
            <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis
              dataKey="label"
              height={44}
              interval="preserveStartEnd"
              padding={{ left: 16, right: 8 }}
              stroke={CHART_COLORS.axis}
              tick={<OutcomeTick points={points} />}
              tickLine={false}
            />
            <YAxis
              domain={[axis.domain[0], axis.domain[1]]}
              stroke={CHART_COLORS.axis}
              tickFormatter={(value: number) => numberFormat.format(value)}
              tickLine={false}
              ticks={[...axis.ticks]}
              width={44}
            />
            <Tooltip
              content={(props) => {
                const parsed = chartTooltipContentSchema.safeParse(props);
                if (!parsed.success) return null;
                const tip = chartTooltipFromParsed(parsed.data);
                return (
                  <EvolutionTooltip
                    label={tip.label}
                    numberFormat={numberFormat}
                    t={t}
                    value={tip.value}
                  />
                );
              }}
              isAnimationActive={false}
            />
            <Line
              activeDot={{ r: 5 }}
              connectNulls={false}
              dataKey="rating"
              dot={(props) => <OutcomeDot {...props} />}
              isAnimationActive={false}
              stroke={CHART_COLORS.line}
              strokeWidth={2}
              type="monotone"
            >
              <LabelList
                content={(props) => {
                  const parsed = evolutionPointLabelLayoutSchema.safeParse({
                    value: props.value,
                    x: props.x,
                    y: props.y,
                  });
                  if (!parsed.success) return null;
                  return (
                    <EvolutionPointLabel
                      numberFormat={numberFormat}
                      value={parsed.data.value}
                      x={parsed.data.x}
                      y={parsed.data.y}
                    />
                  );
                }}
                dataKey="rating"
                offset={12}
                position="top"
                zIndex={0}
              />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ol aria-label={t("player.statistics.evolution.listLabel")} {...applyStyles(vis.srOnly)}>
        {points.map((point) => (
          <li key={point.occurredAt}>
            {`${point.label} · ${
              point.rating === null ? t("player.noData") : numberFormat.format(point.rating)
            } · ${outcomeLabel(point.outcome, t)}`}
          </li>
        ))}
      </ol>
    </>
  );
}

function toChartPoint(
  point: EvolutionPoint,
  dateFormat: Intl.DateTimeFormat,
  t: Translator,
): ChartPoint {
  return {
    occurredAt: point.occurredAt,
    label: dateFormat.format(new Date(point.occurredAt)),
    outcomeShort: outcomeShortLabel(point.outcome, t),
    rating: point.rating,
    outcome: point.outcome,
  };
}

function OutcomeTick({
  points,
  x = 0,
  y = 0,
  payload,
}: {
  readonly points: readonly ChartPoint[];
  readonly x?: number;
  readonly y?: number;
  readonly payload?: { readonly value?: string; readonly index?: number };
}) {
  const point = payload?.index === undefined ? undefined : points[payload.index];
  if (point === undefined) return null;
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        dy={14}
        fill={outcomeColor(point.outcome)}
        fontSize={11}
        fontWeight={600}
        textAnchor="middle"
      >
        {point.outcomeShort}
      </text>
      <text dy={28} fill="var(--muted-foreground)" fontSize={10} textAnchor="middle">
        {point.label}
      </text>
    </g>
  );
}

function OutcomeDot({
  cx,
  cy,
  payload,
}: {
  readonly cx?: number;
  readonly cy?: number;
  readonly payload?: ChartPoint;
}) {
  if (cx === undefined || cy === undefined || payload === undefined || payload.rating === null) {
    return null;
  }
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        fill={outcomeColor(payload.outcome)}
        r={4}
        stroke="var(--surface)"
        strokeWidth={2}
      >
        <title>{payload.outcomeShort}</title>
      </circle>
    </g>
  );
}

function EvolutionTooltip({
  label,
  numberFormat,
  t,
  value,
}: {
  readonly label: string;
  readonly numberFormat: Intl.NumberFormat;
  readonly t: Translator;
  readonly value: number | undefined;
}) {
  if (value === undefined) return null;
  return (
    <div {...applyStyles(styles.tooltip)}>
      <Caption>{label}</Caption>
      <Body as="span" weight="medium" {...applyStyles(styles.tooltipValue)}>
        {t("player.statistics.evolution.rating")} {numberFormat.format(value)}
      </Body>
    </div>
  );
}
