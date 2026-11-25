import { fixtureStageLabel } from "@/modules/scheduling/presentation/competition-fixture-labels.ts";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import type { EncounterRoundOption } from "./competition-encounters-model.ts";

/**
 * «Jornada 1 de 3», or «Playoffs · Jornada 1 de 2» when the list holds rounds of several
 * stages, which restart their numbers.
 */
export function encounterRoundLabel(
  round: EncounterRoundOption,
  withStage: boolean,
  t: Translator,
): string {
  const label = round.total
    ? t("encounter.roundOf", { number: round.number, total: round.total })
    : t("encounter.round", { number: round.number });
  return withStage && round.stage
    ? t("encounters.list.stageRound", {
        stage: fixtureStageLabel(round.stage.kind, t),
        round: label,
      })
    : label;
}
