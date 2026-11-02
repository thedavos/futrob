import type { OfficialResult, OfficialResultReaderPort } from "@futrob/results";
import type {
  FixtureParticipantSlot,
  FixturePlan,
  FixturePlanRepository,
} from "@futrob/scheduling";
import type { CompetitionPlayoffSpotsReaderPort } from "@futrob/statistics";
import type { CompetitionId, OrganizationId } from "@futrob/shared-kernel";

/**
 * The plan does not persist the requested playoff size, so it is read back from the
 * league ranks the playoffs stage draws from. An advanced Team keeps its rank in `advancedFrom`.
 *
 * The standings snapshot sums every official result of the competition. Once a playoffs
 * result is approved the table is no longer the league ranking, so a cut drawn on it could
 * mark an eliminated Team as qualified: no spots are reported from then on.
 */
export class FixturePlayoffSpotsReader implements CompetitionPlayoffSpotsReaderPort {
  constructor(
    private readonly deps: {
      readonly fixturePlans: Pick<FixturePlanRepository, "listActive">;
      readonly results: Pick<OfficialResultReaderPort, "listByCompetition">;
    },
  ) {}

  async find(organizationId: OrganizationId, competitionId: CompetitionId): Promise<number | null> {
    const plans = await this.deps.fixturePlans.listActive(organizationId, competitionId);
    const current = plans.reduce<FixturePlan | null>(
      (latest, plan) =>
        latest && latest.generationVersion >= plan.generationVersion ? latest : plan,
      null,
    );
    if (!current) return null;
    const stages = playoffStagesOf(current);
    if (!stages) return null;
    const results = await this.deps.results.listByCompetition(competitionId, organizationId);
    if (hasApprovedResultIn(stages.playoffEncounterIds, results)) return null;
    return stages.spots;
  }
}

function playoffStagesOf(
  plan: FixturePlan,
): { readonly spots: number; readonly playoffEncounterIds: ReadonlySet<string> } | null {
  const league = plan.stages.find((stage) => stage.kind === "league");
  const playoffs = plan.stages.find((stage) => stage.kind === "playoffs");
  if (!league || !playoffs || playoffs.order <= league.order) return null;
  const ranks = new Set<number>();
  const playoffEncounterIds = new Set<string>();
  for (const round of playoffs.rounds) {
    for (const encounter of round.encounters) {
      playoffEncounterIds.add(encounter.id);
      for (const slot of [encounter.home, encounter.away]) {
        const rank = leagueRankOf(slot, league.id);
        if (rank !== null) ranks.add(rank);
      }
    }
  }
  return ranks.size > 0 ? { spots: ranks.size, playoffEncounterIds } : null;
}

function leagueRankOf(slot: FixtureParticipantSlot, leagueStageId: string): number | null {
  const source = slot.kind === "team" ? slot.advancedFrom : slot;
  if (source?.kind !== "stage-rank" || source.stageId !== leagueStageId) return null;
  return source.rank;
}

/** Only the latest revision of an Encounter counts: a voided playoffs result restores the cut. */
function hasApprovedResultIn(
  encounterIds: ReadonlySet<string>,
  results: readonly OfficialResult[],
): boolean {
  const latest = new Map<string, OfficialResult>();
  for (const result of results) {
    if (!encounterIds.has(result.encounterId)) continue;
    const previous = latest.get(result.encounterId);
    if (!previous || result.revision > previous.revision) latest.set(result.encounterId, result);
  }
  return [...latest.values()].some((result) => result.status === "approved");
}
