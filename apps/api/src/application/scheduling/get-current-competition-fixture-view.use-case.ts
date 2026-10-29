import type {
  FixtureParticipantSlot,
  FixturePlan,
  FixturePlanNotFound,
  GetCurrentCompetitionFixtureUseCase,
} from "@futrob/scheduling";
import {
  err,
  ok,
  type ActorId,
  type CompetitionId,
  type OrganizationId,
  type Result,
  type TeamId,
} from "@futrob/shared-kernel";
import type { Team } from "@futrob/teams";

export type CompetitionFixtureView = {
  readonly fixture: FixturePlan | null;
  readonly teams: readonly { readonly teamId: TeamId; readonly name: string }[];
};

/**
 * The current fixture with the names of the Teams it places, so a reader can list it
 * without asking for each Team. Teams that no longer resolve are left out.
 */
export class GetCurrentCompetitionFixtureViewUseCase {
  constructor(
    private readonly deps: {
      readonly currentFixture: Pick<GetCurrentCompetitionFixtureUseCase, "execute">;
      readonly teams: {
        findById(organizationId: OrganizationId, teamId: TeamId): Promise<Team | null>;
      };
    },
  ) {}

  async execute(input: {
    readonly actorId: ActorId;
    readonly organizationId: OrganizationId;
    readonly competitionId: CompetitionId;
  }): Promise<Result<CompetitionFixtureView, FixturePlanNotFound>> {
    const current = await this.deps.currentFixture.execute(input);
    if (current.isErr()) return err(current.error);
    const fixture = current.value;
    if (!fixture) return ok({ fixture: null, teams: [] });
    const teams = await Promise.all(
      placedTeamIds(fixture).map((teamId) =>
        this.deps.teams.findById(input.organizationId, teamId),
      ),
    );
    return ok({
      fixture,
      teams: teams.flatMap((team) => (team ? [{ teamId: team.id, name: team.name }] : [])),
    });
  }
}

function placedTeamIds(fixture: FixturePlan): TeamId[] {
  const teamOf = (slot: FixtureParticipantSlot) => (slot.kind === "team" ? [slot.teamId] : []);
  const placed = fixture.stages.flatMap((stage) =>
    stage.rounds.flatMap((round) =>
      round.encounters.flatMap((encounter) => [
        ...teamOf(encounter.home),
        ...teamOf(encounter.away),
      ]),
    ),
  );
  return [...new Set([...fixture.seed, ...placed])];
}
