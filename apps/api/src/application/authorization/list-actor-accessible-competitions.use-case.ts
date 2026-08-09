import type {
  CompetitionMembershipRepository,
  CompetitionMembershipRole,
  CompetitionRepository,
  CompetitionEntryRepository,
} from "@futrob/competitions";
import type { ActorId } from "@futrob/shared-kernel";
import type {
  CompetitionRosterMembershipRepository,
  PlayerProfileRepository,
  RosterMembershipRole,
} from "@futrob/teams";

export interface ActorAccessibleCompetition {
  readonly competition: NonNullable<
    Awaited<ReturnType<CompetitionRepository["findById"]>>
  >["competition"];
  readonly role: CompetitionMembershipRole | RosterMembershipRole;
}

/** Cross-BC query use case: competition membership OR roster participation grants discovery. */
export class ListActorAccessibleCompetitionsUseCase {
  constructor(
    private readonly deps: {
      readonly competitions: CompetitionRepository;
      readonly competitionMemberships: CompetitionMembershipRepository;
      readonly profiles: PlayerProfileRepository;
      readonly rosters: CompetitionRosterMembershipRepository;
      readonly entries: CompetitionEntryRepository;
    },
  ) {}

  async execute(input: {
    readonly actorId: ActorId;
  }): Promise<readonly ActorAccessibleCompetition[]> {
    const direct = await this.deps.competitionMemberships.listByActor(input.actorId);
    const profile = await this.deps.profiles.findByActor(input.actorId);
    const rosterMemberships = profile
      ? await this.deps.rosters.listByPlayerProfile(profile.id)
      : [];

    const access = new Map<
      string,
      {
        readonly organizationId: (typeof direct)[number]["organizationId"];
        readonly competitionId: (typeof direct)[number]["competitionId"];
        readonly role: CompetitionMembershipRole | RosterMembershipRole;
      }
    >();
    for (const membership of rosterMemberships) {
      const entry = await this.deps.entries.findByCompetitionAndTeam(
        membership.organizationId,
        membership.competitionId,
        membership.teamId,
      );
      if (entry?.status === "approved") access.set(membership.competitionId, membership);
    }
    for (const membership of direct) {
      access.set(membership.competitionId, membership);
    }

    const resolved = await Promise.all(
      [...access.values()].map(async (membership) => {
        const draft = await this.deps.competitions.findById(
          membership.organizationId,
          membership.competitionId,
        );
        return draft ? { competition: draft.competition, role: membership.role } : null;
      }),
    );
    return resolved.filter((item): item is ActorAccessibleCompetition => item !== null);
  }
}
