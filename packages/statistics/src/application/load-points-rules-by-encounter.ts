import type { EncounterReaderPort } from "@futrob/results";
import type { CompetitionId } from "@futrob/shared-kernel";
import type { TeamMatchContribution } from "../domain/entities/team-match-contribution.ts";
import type {
  CompetitionMatchPointsRules,
  CompetitionMatchRulesReaderPort,
} from "../domain/ports/competition-match-rules-reader.port.ts";
import { DEFAULT_COMPETITION_MATCH_POINTS } from "../domain/policies/build-competition-standings.ts";

export async function loadPointsRulesByEncounter(input: {
  readonly competitionId: CompetitionId;
  readonly contributions: readonly TeamMatchContribution[];
  readonly matchRules: CompetitionMatchRulesReaderPort;
  readonly encounterReader?: EncounterReaderPort;
}): Promise<ReadonlyMap<string, CompetitionMatchPointsRules>> {
  const rules = new Map<string, CompetitionMatchPointsRules>();
  for (const contribution of input.contributions) {
    if (rules.has(contribution.encounterId)) continue;
    const encounter = (await input.encounterReader?.getById(contribution.encounterId)) ?? null;
    rules.set(
      contribution.encounterId,
      (await input.matchRules.getPointsRules({
        competitionId: input.competitionId,
        stageId: encounter?.stageId,
      })) ?? DEFAULT_COMPETITION_MATCH_POINTS,
    );
  }
  return rules;
}
