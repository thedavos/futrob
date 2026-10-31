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
 */
export class FixturePlayoffSpotsReader implements CompetitionPlayoffSpotsReaderPort {
  constructor(private readonly fixturePlans: Pick<FixturePlanRepository, "listActive">) {}

  async find(organizationId: OrganizationId, competitionId: CompetitionId): Promise<number | null> {
    const plans = await this.fixturePlans.listActive(organizationId, competitionId);
    const current = plans.reduce<FixturePlan | null>(
      (latest, plan) =>
        latest && latest.generationVersion >= plan.generationVersion ? latest : plan,
      null,
    );
    return current ? playoffSpotsOf(current) : null;
  }
}

function playoffSpotsOf(plan: FixturePlan): number | null {
  const league = plan.stages.find((stage) => stage.kind === "league");
  const playoffs = plan.stages.find((stage) => stage.kind === "playoffs");
  if (!league || !playoffs || playoffs.order <= league.order) return null;
  const ranks = new Set<number>();
  for (const round of playoffs.rounds) {
    for (const encounter of round.encounters) {
      for (const slot of [encounter.home, encounter.away]) {
        const rank = leagueRankOf(slot, league.id);
        if (rank !== null) ranks.add(rank);
      }
    }
  }
  return ranks.size > 0 ? ranks.size : null;
}

function leagueRankOf(slot: FixtureParticipantSlot, leagueStageId: string): number | null {
  const source = slot.kind === "team" ? slot.advancedFrom : slot;
  if (source?.kind !== "stage-rank" || source.stageId !== leagueStageId) return null;
  return source.rank;
}
