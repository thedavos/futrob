import type { OfficialResultReaderPort } from "@futrob/results";
import {
  swissByeTeam,
  swissPointsPerBye,
  swissRoundProgress,
  swissRounds,
  type CompetitionFixtureSourcePort,
  type FixturePlan,
  type FixturePlanRepository,
} from "@futrob/scheduling";
import type {
  CompetitionSwissStandingContext,
  CompetitionSwissStandingReaderPort,
} from "@futrob/statistics";
import type { CompetitionId, EncounterId, OrganizationId, TeamId } from "@futrob/shared-kernel";

/** Reads the current plan and the approved results; nothing here is persisted (ADR-0027). */
export class FixtureSwissStandingReader implements CompetitionSwissStandingReaderPort {
  constructor(
    private readonly deps: {
      readonly fixturePlans: Pick<FixturePlanRepository, "listActive">;
      readonly results: Pick<OfficialResultReaderPort, "listByCompetition">;
      readonly source: CompetitionFixtureSourcePort;
    },
  ) {}

  async find(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
  ): Promise<CompetitionSwissStandingContext | null> {
    const plans = await this.deps.fixturePlans.listActive(organizationId, competitionId);
    const current = plans.reduce<FixturePlan | null>(
      (latest, plan) =>
        latest && latest.generationVersion >= plan.generationVersion ? latest : plan,
      null,
    );
    if (current?.format !== "swiss") return null;
    const source = await this.deps.source.load({ organizationId, competitionId });
    if (!source) return null;
    const results = await this.deps.results.listByCompetition(competitionId, organizationId);
    const approved = new Set<EncounterId>(
      results.filter((result) => result.status === "approved").map((result) => result.encounterId),
    );

    const opponentsByTeam = new Map<TeamId, TeamId[]>();
    const byesByTeam = new Map<TeamId, number>();
    const addOpponent = (teamId: TeamId, rival: TeamId) =>
      opponentsByTeam.set(teamId, [...(opponentsByTeam.get(teamId) ?? []), rival]);
    for (const round of swissRounds(current)) {
      for (const encounter of round.encounters) {
        const byeTeam = swissByeTeam(encounter);
        if (byeTeam) {
          byesByTeam.set(byeTeam, (byesByTeam.get(byeTeam) ?? 0) + 1);
          continue;
        }
        const { home, away } = encounter;
        if (home.kind !== "team" || away.kind !== "team" || !approved.has(encounter.id)) continue;
        addOpponent(home.teamId, away.teamId);
        addOpponent(away.teamId, home.teamId);
      }
    }

    return {
      seed: current.seed,
      opponentsByTeam,
      byesByTeam,
      withdrawnTeamIds: current.withdrawnTeamIds ?? [],
      pointsPerBye: swissPointsPerBye({
        standingPoints: source.standingPoints,
        officialMatchCount: source.officialMatchCounts.regular,
        resolutionMode: source.resolutionModes.regular,
      }),
      ...swissRoundProgress(current, (encounterId) => approved.has(encounterId)),
    };
  }
}
