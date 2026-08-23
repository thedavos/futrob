import type { PlayerGameProfileDto } from "@futrob/api-contracts";
import {
  Progress,
  ProgressIndicator,
  ProgressLabel,
  ProgressTrack,
  ProgressValue,
} from "@futrob/ui";
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
    <section className="space-y-4" aria-label={t("player.statistics.attributes")}>
      <h2 className="typo-label">{t("player.statistics.attributes")}</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        {profile.attributes.map((category) => (
          <article
            className="space-y-3 rounded-lg border border-border bg-surface p-4"
            key={category.category}
          >
            <Progress value={category.score}>
              <ProgressLabel>{t(CATEGORY_KEYS[category.category])}</ProgressLabel>
              <ProgressValue>{() => String(category.score)}</ProgressValue>
              <ProgressTrack>
                <ProgressIndicator />
              </ProgressTrack>
            </Progress>
            <ul className="space-y-1">
              {category.components.map((component) => (
                <li className="typo-caption text-muted-foreground" key={component.key}>
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
