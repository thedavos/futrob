import type { PlayerGameProfileDto } from "@futrob/api-contracts";
import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  Progress,
  ProgressIndicator,
  ProgressLabel,
  ProgressTrack,
  ProgressValue,
  typography,
} from "@futrob/ui";
import { colors, media } from "@futrob/ui/styles/public.stylex";
import type { ParameterlessMessageKey } from "@/shared/presentation/i18n/catalogs.ts";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";

type AttributeCategory = PlayerGameProfileDto["attributes"][number];
type AttributeComponent = AttributeCategory["components"][number];

const CATEGORY_KEYS = {
  attack: "player.statistics.attribute.attack",
  pass: "player.statistics.attribute.pass",
  defense: "player.statistics.attribute.defense",
  impact: "player.statistics.attribute.impact",
  discipline: "player.statistics.attribute.discipline",
} as const satisfies Record<AttributeCategory["category"], ParameterlessMessageKey>;

const COMPONENT_KEYS = {
  goalsPerMatch: "player.statistics.component.goalsPerMatch",
  shotsPerMatch: "player.statistics.component.shotsPerMatch",
  shotAccuracy: "player.statistics.component.shotAccuracy",
  offensiveRoleRating: "player.statistics.component.offensiveRoleRating",
  passSuccess: "player.statistics.component.passSuccess",
  passVolume: "player.statistics.component.passVolume",
  tacklesMadePerMatch: "player.statistics.component.tacklesMadePerMatch",
  tackleSuccess: "player.statistics.component.tackleSuccess",
  defensiveRoleRating: "player.statistics.component.defensiveRoleRating",
  averageRating: "player.statistics.component.averageRating",
  winRate: "player.statistics.component.winRate",
  goalsAssistsPerMatch: "player.statistics.component.goalsAssistsPerMatch",
  fewerRedsPerMatch: "player.statistics.component.fewerRedsPerMatch",
} as const satisfies Record<AttributeComponent["key"], ParameterlessMessageKey>;

const styles = stylex.create({
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  grid: {
    display: "grid",
    gap: "1rem",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.lg]: "repeat(2, minmax(0, 1fr))",
    },
  },
  card: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    borderRadius: "var(--corner-lg)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: "1rem",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  item: {
    color: colors.mutedForeground,
  },
});

export function PlayerGameProfileAttributes({
  profile,
  numberFormat,
  percentFormat,
  t,
}: {
  readonly profile: PlayerGameProfileDto;
  readonly numberFormat: Intl.NumberFormat;
  readonly percentFormat: Intl.NumberFormat;
  readonly t: Translator;
}) {
  return (
    <section aria-label={t("player.statistics.attributes")} {...applyStyles(styles.section)}>
      <h2 {...applyStyles(typography.label)}>{t("player.statistics.attributes")}</h2>
      <div {...applyStyles(styles.grid)}>
        {profile.attributes.map((category) => (
          <article key={category.category} {...applyStyles(styles.card)}>
            <Progress value={category.score}>
              <ProgressLabel>{t(CATEGORY_KEYS[category.category])}</ProgressLabel>
              <ProgressValue>{() => String(category.score)}</ProgressValue>
              <ProgressTrack>
                <ProgressIndicator />
              </ProgressTrack>
            </Progress>
            <ul {...applyStyles(styles.list)}>
              {category.components.map((component) => (
                <li key={component.key} {...applyStyles(typography.caption, styles.item)}>
                  {formatComponentLine(component, numberFormat, percentFormat, t)}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

function formatComponentLine(
  component: AttributeComponent,
  numberFormat: Intl.NumberFormat,
  percentFormat: Intl.NumberFormat,
  t: Translator,
): string {
  const weight = `${Math.round(component.weight * 100)}%`;
  const raw = formatRaw(component, numberFormat, percentFormat);
  const detail =
    component.confidence < 1
      ? `${raw} · ${t("player.statistics.component.confidence", {
          percent: Math.round(component.confidence * 100),
        })}${
          component.sampleCount > 0
            ? ` (${t("player.statistics.component.weightedMatches", {
                count: component.sampleCount,
              })})`
            : ""
        }`
      : raw;
  return `${t(COMPONENT_KEYS[component.key])}: ${weight} → ${detail} (${t(
    "player.statistics.component.points",
    { points: component.points },
  )})`;
}

function formatRaw(
  component: AttributeComponent,
  numberFormat: Intl.NumberFormat,
  percentFormat: Intl.NumberFormat,
): string {
  if (component.raw === null) return "—";
  switch (component.rawKind) {
    case "percent":
      return percentFormat.format(component.raw);
    case "rating":
    case "perMatch":
    case "score":
      return numberFormat.format(component.raw);
    default: {
      const _exhaustive: never = component.rawKind;
      return _exhaustive;
    }
  }
}
