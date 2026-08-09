import {
  err,
  ok,
  type ActorId,
  type AuthorizationPort,
  type CompetitionId,
  type OrganizationId,
  type Result,
  type TeamId,
} from "@futrob/shared-kernel";
import type {
  CompetitionRosterMembership,
  RosterMembershipRole,
} from "../../domain/entities/competition-roster-membership.ts";
import {
  RosterMembershipNotFound,
  TeamAuthorizationForbidden,
  type ChangeRosterRoleError,
} from "../../domain/errors/team.errors.ts";
import type { CompetitionRosterMembershipRepository } from "../../domain/ports/competition-roster-membership.repository.ts";
import { TEAM_PERMISSION } from "../../domain/policies/team-permissions.ts";

export interface ChangeRosterRoleInput {
  readonly actorId: ActorId;
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly teamId: TeamId;
  readonly rosterMembershipId: string;
  readonly role: RosterMembershipRole;
}

export class ChangeRosterRoleUseCase {
  constructor(
    private readonly deps: {
      readonly authorization: AuthorizationPort;
      readonly rosters: CompetitionRosterMembershipRepository;
    },
  ) {}

  async execute(
    input: ChangeRosterRoleInput,
  ): Promise<Result<CompetitionRosterMembership, ChangeRosterRoleError>> {
    const decision = await this.deps.authorization.decide({
      actorId: input.actorId,
      permission: TEAM_PERMISSION.rosterRolesManage,
      scope: {
        organizationId: input.organizationId,
        competitionId: input.competitionId,
        teamId: input.teamId,
      },
    });
    if (!decision.allowed) {
      return err(
        new TeamAuthorizationForbidden({
          code: "authorization.forbidden",
          message: "Cannot manage roster roles in this Team",
          permission: TEAM_PERMISSION.rosterRolesManage,
        }),
      );
    }
    const membership = await this.deps.rosters.findByIdInScope(
      input.organizationId,
      input.competitionId,
      input.teamId,
      input.rosterMembershipId,
    );
    if (!membership) {
      return err(
        new RosterMembershipNotFound({
          code: "teams.roster_membership_not_found",
          message: "Roster membership not found",
        }),
      );
    }

    if (input.role === "captain") {
      const teamMembers = await this.deps.rosters.listByTeam(
        input.organizationId,
        input.competitionId,
        input.teamId,
      );
      const previousCaptain = teamMembers.find(
        (member) => member.role === "captain" && member.id !== membership.id,
      );
      if (previousCaptain) {
        await this.deps.rosters.update({ ...previousCaptain, role: "player" });
      }
    }

    return ok(await this.deps.rosters.update({ ...membership, role: input.role }));
  }
}
