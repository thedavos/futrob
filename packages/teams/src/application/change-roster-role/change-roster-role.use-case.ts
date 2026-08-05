import { err, ok, type Result } from "@futrob/shared-kernel";
import type {
  CompetitionRosterMembership,
  RosterMembershipRole,
} from "../../domain/entities/competition-roster-membership.ts";
import {
  RosterMembershipNotFound,
  type ChangeRosterRoleError,
} from "../../domain/errors/team.errors.ts";
import type { CompetitionRosterMembershipRepository } from "../../domain/ports/competition-roster-membership.repository.ts";

export interface ChangeRosterRoleInput {
  readonly rosterMembershipId: string;
  readonly role: RosterMembershipRole;
}

export class ChangeRosterRoleUseCase {
  constructor(private readonly rosters: CompetitionRosterMembershipRepository) {}

  async execute(
    input: ChangeRosterRoleInput,
  ): Promise<Result<CompetitionRosterMembership, ChangeRosterRoleError>> {
    const membership = await this.rosters.findById(input.rosterMembershipId);
    if (!membership) {
      return err(
        new RosterMembershipNotFound({
          code: "teams.roster_membership_not_found",
          message: "Roster membership not found",
        }),
      );
    }

    if (input.role === "captain") {
      const teamMembers = await this.rosters.listByTeam(
        membership.organizationId,
        membership.competitionId,
        membership.teamId,
      );
      const previousCaptain = teamMembers.find(
        (member) => member.role === "captain" && member.id !== membership.id,
      );
      if (previousCaptain) {
        await this.rosters.update({ ...previousCaptain, role: "player" });
      }
    }

    return ok(await this.rosters.update({ ...membership, role: input.role }));
  }
}
