import { useState } from "react";
import type { PlayerGameProfileDto } from "@futrob/api-contracts";
import {
  LightningIcon,
  PersonSimpleThrowIcon,
  ScalesIcon,
  ShieldIcon,
  SwordIcon,
} from "@phosphor-icons/react";
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
  Progress,
  ProgressIndicator,
  ProgressTrack,
  Separator,
  type Icon,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import {
  CATEGORY_KEYS,
  COMPONENT_KEYS,
  categoryLabel,
  formatComponentRaw,
} from "./player-profile-copy.ts";
import { preventChartMouseFocus } from "./player-profile-chart-focus.ts";
import {
  CHART_COLORS,
  attributeExtremes,
  defaultAttributeCategory,
  type AttributeCategory,
} from "./player-profile-model.ts";
import { RadarAxisTick } from "./player-profile-radar-tick.tsx";

const CATEGORY_ICONS = {
  attack: SwordIcon,
  pass: PersonSimpleThrowIcon,
  defense: ShieldIcon,
  impact: LightningIcon,
  discipline: ScalesIcon,
} as const satisfies Record<AttributeCategory["category"], Icon>;

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
  layout: {
    display: "grid",
    gap: "1.5rem",
    alignItems: "start",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.lg]: "minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1fr)",
    },
  },
  columnDivider: {
    display: {
      default: "none",
      [media.lg]: "block",
    },
    alignSelf: "stretch",
    height: "auto",
  },
  rowDivider: {
    display: {
      default: "block",
      [media.lg]: "none",
    },
  },
  radar: {
    width: "100%",
    height: "17rem",
    overflow: "visible",
    alignSelf: {
      default: null,
      [media.lg]: "center",
    },
  },
  categories: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    margin: 0,
    padding: 0,
    listStyleType: "none",
  },
  category: {
    display: "flex",
    width: "100%",
    minHeight: "2.75rem",
    alignItems: "center",
    gap: "0.75rem",
    borderRadius: "var(--corner-lg)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: {
      default: colors.border,
      ":hover": colors.borderStrong,
    },
    backgroundColor: {
      default: colors.surface,
      ":hover": colors.muted,
    },
    paddingBlock: "0.5rem",
    paddingInline: "0.75rem",
    textAlign: "start",
    cursor: "pointer",
    outlineWidth: 0,
    outlineStyle: "none",
    boxShadow: {
      default: null,
      ":focus-visible": "0 0 0 2px color-mix(in oklab, var(--ring) 25%, transparent)",
    },
  },
  categorySelected: {
    borderColor: colors.primary,
    backgroundColor: colors.accent,
  },
  categoryLead: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
    gap: "var(--space-1)",
  },
  categoryIcon: {
    width: "1.25rem",
    height: "1.25rem",
    flexShrink: 0,
    color: colors.mutedForeground,
  },
  progress: {
    display: "block",
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "0%",
    minWidth: 0,
    width: "auto",
    gridTemplateColumns: "minmax(0, 1fr)",
    columnGap: 0,
    rowGap: 0,
  },
  categoryValue: {
    flexShrink: 0,
    fontVariantNumeric: "tabular-nums",
  },
  detail: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    minWidth: 0,
  },
  components: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    margin: 0,
    padding: 0,
    listStyleType: "none",
  },
  component: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: "0.5rem",
  },
  componentValue: {
    fontVariantNumeric: "tabular-nums",
  },
  highlights: {
    display: "grid",
    gap: "0.75rem",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "repeat(2, minmax(0, 1fr))",
      [media.lg]: "minmax(0, 1fr)",
    },
  },
  highlight: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
    borderRadius: "var(--corner-md)",
    paddingBlock: "0.75rem",
    paddingInline: "0.75rem",
  },
  strength: {
    backgroundColor: "color-mix(in oklab, var(--success) 12%, transparent)",
  },
  improve: {
    backgroundColor: "color-mix(in oklab, var(--warning) 12%, transparent)",
  },
});

export function PlayerProfileAttributes({
  numberFormat,
  percentFormat,
  profile,
  t,
}: {
  readonly numberFormat: Intl.NumberFormat;
  readonly percentFormat: Intl.NumberFormat;
  readonly profile: PlayerGameProfileDto;
  readonly t: Translator;
}) {
  const [selectedKey, setSelectedKey] = useState<AttributeCategory["category"] | null>(
    defaultAttributeCategory(profile.attributes)?.category ?? null,
  );
  const selected =
    profile.attributes.find((category) => category.category === selectedKey) ??
    defaultAttributeCategory(profile.attributes);
  const extremes = attributeExtremes(profile.attributes);
  const radarData = profile.attributes.map((category) => ({
    category: categoryLabel(category.category, t),
    score: category.score,
  }));

  if (profile.attributes.length === 0) return null;

  const columnDivider = applyStyles(styles.columnDivider);
  const rowDivider = applyStyles(styles.rowDivider);

  return (
    <Card>
      <CardHeader className={styles.header}>
        <Heading as="h2" {...applyProps(undefined, undefined, styles.heading)}>
          {t("player.statistics.attributes")}
        </Heading>
        <CardDescription className={styles.description}>
          {t("player.statistics.attributes.description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div {...applyStyles(styles.layout)}>
          <div
            aria-hidden
            data-slot="player-chart"
            onMouseDown={preventChartMouseFocus}
            {...applyStyles(styles.radar)}
          >
            <ResponsiveContainer height="100%" width="100%">
              <RadarChart
                accessibilityLayer={false}
                cx="50%"
                cy="50%"
                data={radarData}
                outerRadius="75%"
                style={{ outline: "none" }}
              >
                <PolarGrid stroke={CHART_COLORS.grid} />
                <PolarAngleAxis
                  dataKey="category"
                  stroke={CHART_COLORS.axis}
                  tick={<RadarAxisTick points={radarData} />}
                  tickLine={false}
                />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  dataKey="score"
                  fill={CHART_COLORS.radarFill}
                  isAnimationActive={false}
                  stroke={CHART_COLORS.radarStroke}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <Separator
            className={columnDivider.className}
            orientation="vertical"
            style={columnDivider.style}
          />
          <Separator className={rowDivider.className} style={rowDivider.style} />
          <ul
            aria-label={t("player.statistics.attributes.select")}
            {...applyStyles(styles.categories)}
          >
            {profile.attributes.map((category) => {
              const selectedCategory = category.category === selected?.category;
              const CategoryIcon = CATEGORY_ICONS[category.category];
              return (
                <li key={category.category}>
                  <button
                    aria-controls="player-profile-attribute-detail"
                    aria-label={`${t(CATEGORY_KEYS[category.category])} ${category.score}`}
                    aria-pressed={selectedCategory}
                    onClick={() => setSelectedKey(category.category)}
                    type="button"
                    {...applyStyles(styles.category, selectedCategory && styles.categorySelected)}
                  >
                    <div {...applyStyles(styles.categoryLead)}>
                      <CategoryIcon
                        aria-hidden
                        size={20}
                        weight="regular"
                        {...applyStyles(styles.categoryIcon)}
                      />
                      <Caption as="span" tone="default">
                        {t(CATEGORY_KEYS[category.category])}
                      </Caption>
                    </div>
                    <Progress
                      aria-hidden
                      value={category.score}
                      {...applyProps(undefined, undefined, styles.progress)}
                    >
                      <ProgressTrack>
                        <ProgressIndicator />
                      </ProgressTrack>
                    </Progress>
                    <Caption as="span" {...applyProps(undefined, undefined, styles.categoryValue)}>
                      {category.score}
                    </Caption>
                  </button>
                </li>
              );
            })}
          </ul>
          <Separator
            className={columnDivider.className}
            orientation="vertical"
            style={columnDivider.style}
          />
          <Separator className={rowDivider.className} style={rowDivider.style} />
          {selected === null ? null : (
            <div id="player-profile-attribute-detail" {...applyStyles(styles.detail)}>
              <Heading as="h4">
                {`${categoryLabel(selected.category, t)} · ${selected.score}`}
              </Heading>
              <ul {...applyStyles(styles.components)}>
                {selected.components.map((component) => (
                  <li key={component.key} {...applyStyles(styles.component)}>
                    <Caption as="span">{t(COMPONENT_KEYS[component.key])}</Caption>
                    <Body as="span" {...applyStyles(styles.componentValue)}>
                      {`${formatComponentRaw(component, numberFormat, percentFormat, t)} · ${t(
                        "player.statistics.component.points",
                        { points: component.points },
                      )}`}
                    </Body>
                  </li>
                ))}
              </ul>
              {extremes === null ? null : (
                <div {...applyStyles(styles.highlights)}>
                  <div {...applyStyles(styles.highlight, styles.strength)}>
                    <Caption>{t("player.statistics.strength")}</Caption>
                    <Body as="span" weight="medium">
                      {categoryLabel(extremes.strength.category, t)}
                    </Body>
                  </div>
                  <div {...applyStyles(styles.highlight, styles.improve)}>
                    <Caption>{t("player.statistics.toImprove")}</Caption>
                    <Body as="span" weight="medium">
                      {categoryLabel(extremes.toImprove.category, t)}
                    </Body>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
