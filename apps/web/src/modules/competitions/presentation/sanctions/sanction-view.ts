import type { CompetitionSanctionDto, SanctionTypeDto } from "@futrob/api-contracts";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";

export const SANCTION_TYPES = [
  "warning",
  "points_deduction",
  "match_suspension",
  "administrative_defeat",
] as const satisfies readonly SanctionTypeDto[];

/** Only these types can fall on a single player (ADR-0028). */
export const PLAYER_SANCTION_TYPES: readonly SanctionTypeDto[] = ["warning", "match_suspension"];

export function sanctionTypeLabel(type: SanctionTypeDto, t: Translator): string {
  switch (type) {
    case "warning":
      return t("sanctions.type.warning");
    case "points_deduction":
      return t("sanctions.type.pointsDeduction");
    case "match_suspension":
      return t("sanctions.type.matchSuspension");
    case "administrative_defeat":
      return t("sanctions.type.administrativeDefeat");
  }
}

/** The type-specific figure: points, matches or the match decided. */
export function sanctionDetail(sanction: CompetitionSanctionDto, t: Translator): string | null {
  if (sanction.pointsDeducted !== null) {
    return t("sanctions.detail.points", { count: sanction.pointsDeducted });
  }
  if (sanction.suspensionMatches !== null) {
    return t("sanctions.detail.matches", { count: sanction.suspensionMatches });
  }
  if (sanction.encounterId !== null) return t("sanctions.detail.encounter");
  return null;
}

export function sanctionTeamName(sanction: CompetitionSanctionDto, t: Translator): string {
  return sanction.teamName ?? t("sanctions.target.unnamedTeam");
}

export function sanctionPlayerName(sanction: CompetitionSanctionDto, t: Translator): string {
  return sanction.playerName ?? t("sanctions.target.unnamedPlayer");
}
