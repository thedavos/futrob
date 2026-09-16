import type { EncounterReaderPort } from "@futrob/results";
import type { CompetitionMatchRulesReaderPort, StandingResolutionMode } from "@futrob/statistics";
import { asCompetitionId, asEncounterId } from "@futrob/shared-kernel";
import {
  encodedStandingResolutionMode,
  type TeamContributionRow,
} from "@/adapters/statistics/team-postgres-rows.ts";

export async function historicalResolutionModeByEncounter(input: {
  readonly rows: readonly TeamContributionRow[];
  readonly encounterReader?: EncounterReaderPort;
  readonly matchRules?: CompetitionMatchRulesReaderPort;
}): Promise<ReadonlyMap<string, StandingResolutionMode>> {
  const modes = new Map<string, StandingResolutionMode>();
  for (const row of input.rows) {
    if (encodedStandingResolutionMode(row) !== null) continue;
    if (modes.has(row.encounter_id)) continue;
    const encounter =
      (await input.encounterReader?.getById(asEncounterId(row.encounter_id))) ?? null;
    if (encounter === null) {
      throw new RangeError(
        `Cannot rehydrate team contribution ${row.id}: encounter ${row.encounter_id} is missing for historical resolutionMode`,
      );
    }
    const rules =
      (await input.matchRules?.getPointsRules({
        competitionId: asCompetitionId(row.competition_id),
        stageId: encounter.stageId,
      })) ?? null;
    if (rules === null) {
      throw new RangeError(
        `Cannot rehydrate team contribution ${row.id}: competition match rules are missing for historical resolutionMode`,
      );
    }
    modes.set(row.encounter_id, rules.resolutionMode);
  }
  return modes;
}
