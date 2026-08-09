import type { ActorId } from "@futrob/shared-kernel";
import type { Competition } from "../../domain/entities/competition.ts";
import type { CompetitionMembershipRole } from "../../domain/entities/competition-membership.ts";
import type { CompetitionMembershipRepository } from "../../domain/ports/competition-membership.repository.ts";
import type { CompetitionRepository } from "../../domain/ports/competition.repository.ts";

export interface AccessibleCompetition {
  readonly competition: Competition;
  readonly role: CompetitionMembershipRole;
}

/**
 * Rebuilds contextual competition access after login from persisted membership
 * rows. It deliberately does not expose the owning organization's full catalog.
 */
export class ListAccessibleCompetitionsUseCase {
  constructor(
    private readonly deps: {
      readonly memberships: CompetitionMembershipRepository;
      readonly competitions: CompetitionRepository;
    },
  ) {}

  async execute(input: { readonly actorId: ActorId }): Promise<readonly AccessibleCompetition[]> {
    const memberships = await this.deps.memberships.listByActor(input.actorId);
    const resolved = await Promise.all(
      memberships.map(async (membership) => {
        const draft = await this.deps.competitions.findById(
          membership.organizationId,
          membership.competitionId,
        );
        return draft ? { competition: draft.competition, role: membership.role } : null;
      }),
    );
    return resolved.filter((item): item is AccessibleCompetition => item !== null);
  }
}
