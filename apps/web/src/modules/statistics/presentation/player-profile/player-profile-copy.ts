import type { PlayerGameProfileDto } from "@futrob/api-contracts";
import type { ParameterlessMessageKey } from "@/shared/presentation/i18n/catalogs.ts";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { providerPositionLabelKey } from "../provider-match-detail-model.ts";
import type { AttributeCategory, MatchOutcome, OutcomeSplit } from "./player-profile-model.ts";
import { primaryClubName } from "./player-profile-model.ts";

export const CATEGORY_KEYS = {
  attack: "player.statistics.attribute.attack",
  pass: "player.statistics.attribute.pass",
  defense: "player.statistics.attribute.defense",
  impact: "player.statistics.attribute.impact",
  discipline: "player.statistics.attribute.discipline",
} as const satisfies Record<AttributeCategory["category"], ParameterlessMessageKey>;

export const COMPONENT_KEYS = {
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
} as const satisfies Record<
  AttributeCategory["components"][number]["key"],
  ParameterlessMessageKey
>;

const OUTCOME_KEYS = {
  win: "player.matches.outcome.win",
  draw: "player.matches.outcome.draw",
  loss: "player.matches.outcome.loss",
  unknown: "player.matches.outcome.unknown",
} as const satisfies Record<MatchOutcome, ParameterlessMessageKey>;

const OUTCOME_SHORT_KEYS = {
  win: "player.statistics.outcome.short.win",
  draw: "player.statistics.outcome.short.draw",
  loss: "player.statistics.outcome.short.loss",
  unknown: "player.statistics.outcome.short.unknown",
} as const satisfies Record<MatchOutcome, ParameterlessMessageKey>;

export function categoryLabel(category: AttributeCategory["category"], t: Translator): string {
  return t(CATEGORY_KEYS[category]);
}

export function outcomeLabel(outcome: MatchOutcome, t: Translator): string {
  return t(OUTCOME_KEYS[outcome]);
}

export function outcomeShortLabel(outcome: MatchOutcome, t: Translator): string {
  return t(OUTCOME_SHORT_KEYS[outcome]);
}

export function positionLabel(identity: PlayerGameProfileDto["identity"], t: Translator): string {
  if (identity.preferredPosition === null) return t("player.position.unknown");
  const key = providerPositionLabelKey(identity.preferredPosition);
  return key ? t(key) : identity.preferredPosition;
}

export function identityDescription(profile: PlayerGameProfileDto, t: Translator): string {
  const parts = [
    positionLabel(profile.identity, t),
    primaryClubName(profile),
    t("player.statistics.matchesCount", { count: profile.sampleSize }),
  ].filter((part): part is string => part !== null && part.length > 0);
  return parts.join(" · ");
}

export function outcomeSplitLabel(split: OutcomeSplit, t: Translator): string {
  const parts: string[] = [];
  if (split.wins > 0) parts.push(t("player.statistics.form.wins", { count: split.wins }));
  if (split.draws > 0) parts.push(t("player.statistics.form.draws", { count: split.draws }));
  if (split.losses > 0) parts.push(t("player.statistics.form.losses", { count: split.losses }));
  if (split.unknowns > 0) {
    parts.push(t("player.statistics.form.unknowns", { count: split.unknowns }));
  }
  return parts.join(" · ");
}

export function formatComponentRaw(
  component: AttributeCategory["components"][number],
  numberFormat: Intl.NumberFormat,
  percentFormat: Intl.NumberFormat,
  t: Translator,
): string {
  if (component.raw === null) return t("player.noData");
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
