import type { Competition } from "@futrob/competitions";
import type { CompetitionDisputeCase, ListCompetitionDisputesUseCase } from "@futrob/results";
import type { ActorId, CompetitionId, OrganizationId, TeamId } from "@futrob/shared-kernel";
import type { Team } from "@futrob/teams";

type NamedTeam = { readonly teamId: TeamId; readonly name: string | null };

export type CompetitionDispute = Omit<CompetitionDisputeCase, "homeTeamId" | "awayTeamId"> & {
  readonly home: NamedTeam;
  readonly away: NamedTeam;
};

export type CompetitionDisputes = {
  readonly competition: {
    readonly id: CompetitionId;
    readonly name: string;
    readonly timeZone: string;
  };
  readonly disputes: readonly CompetitionDispute[];
};

export type ListCompetitionDisputesQueryDependencies = {
  readonly disputes: Pick<ListCompetitionDisputesUseCase, "execute">;
  readonly competitions: {
    findById(
      organizationId: OrganizationId,
      competitionId: CompetitionId,
    ): Promise<{ readonly competition: Competition } | null>;
  };
  readonly teams: {
    findById(organizationId: OrganizationId, teamId: TeamId): Promise<Team | null>;
  };
};

/**
 * The operator queue of a competition named for display. Null hides a missing
 * competition and an actor who may not review its disputes alike. A Team that
 * cannot be read keeps its case listed without a name: the queue never drops work.
 */
export class ListCompetitionDisputesQuery {
  constructor(private readonly deps: ListCompetitionDisputesQueryDependencies) {}

  async execute(input: {
    readonly actorId: ActorId;
    readonly organizationId: OrganizationId;
    readonly competitionId: CompetitionId;
  }): Promise<CompetitionDisputes | null> {
    const draft = await this.deps.competitions.findById(input.organizationId, input.competitionId);
    if (!draft) return null;
    const result = await this.deps.disputes.execute(input);
    if (result.isErr()) return null;

    const names = await this.teamNames(input.organizationId, result.value);
    const named = (teamId: TeamId): NamedTeam => ({ teamId, name: names.get(teamId) ?? null });
    return {
      competition: {
        id: input.competitionId,
        name: draft.competition.name,
        timeZone: draft.competition.timeZone,
      },
      disputes: result.value.map(({ homeTeamId, awayTeamId, ...rest }) => ({
        ...rest,
        home: named(homeTeamId),
        away: named(awayTeamId),
      })),
    };
  }

  private async teamNames(
    organizationId: OrganizationId,
    cases: readonly CompetitionDisputeCase[],
  ): Promise<Map<TeamId, string>> {
    const ids = [...new Set(cases.flatMap((row) => [row.homeTeamId, row.awayTeamId]))];
    const teams = await Promise.all(ids.map((id) => this.deps.teams.findById(organizationId, id)));
    return new Map(
      teams.flatMap((team): [TeamId, string][] => (team ? [[team.id, team.name]] : [])),
    );
  }
}
