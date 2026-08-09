import type { ActorId, CompetitionId } from "@futrob/shared-kernel";
import type { CompetitionMembership } from "../entities/competition-membership.ts";

export interface CompetitionMembershipRepository {
  add(membership: CompetitionMembership): Promise<CompetitionMembership>;
  updateRole(membership: CompetitionMembership): Promise<CompetitionMembership>;
  findByCompetitionAndActor(
    competitionId: CompetitionId,
    actorId: ActorId,
  ): Promise<CompetitionMembership | null>;
  listByActor(actorId: ActorId): Promise<readonly CompetitionMembership[]>;
}
