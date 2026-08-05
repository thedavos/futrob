import {
  err,
  ok,
  type CompetitionId,
  type OrganizationId,
  type Result,
  type TeamId,
} from "@futrob/shared-kernel";
import type { CompetitionRosterState } from "../../domain/entities/competition-roster-state.ts";
import { TeamNotFound, type OpenRosterError } from "../../domain/errors/team.errors.ts";
import type { CompetitionRosterStateRepository } from "../../domain/ports/competition-roster-state.repository.ts";
import type { TeamRepository } from "../../domain/ports/team.repository.ts";

export interface OpenRosterInput {
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly teamId: TeamId;
}

export class OpenRosterUseCase {
  constructor(
    private readonly deps: {
      readonly teams: TeamRepository;
      readonly rosterStates: CompetitionRosterStateRepository;
    },
  ) {}

  async execute(input: OpenRosterInput): Promise<Result<CompetitionRosterState, OpenRosterError>> {
    const team = await this.deps.teams.findById(input.organizationId, input.teamId);
    if (!team) {
      return err(
        new TeamNotFound({
          code: "teams.not_found",
          message: "Team not found",
        }),
      );
    }

    return ok(
      await this.deps.rosterStates.save({
        organizationId: input.organizationId,
        competitionId: input.competitionId,
        teamId: input.teamId,
        lockedAt: null,
      }),
    );
  }
}
