import type { ClockPort, IdGeneratorPort, Result } from "@futrob/shared-kernel";
import type { Team } from "../../domain/entities/team.ts";
import type { CreationKeyConflict, InvalidTeamName } from "../../domain/errors/team.errors.ts";
import type { TeamRepository } from "../../domain/ports/team.repository.ts";
import { createTeamUnchecked, type CreateTeamInput } from "../create-team/create-team.use-case.ts";

export type CreateApplicantTeamError = InvalidTeamName | CreationKeyConflict;

/**
 * Trusted flow: creates the Team an applicant brings to a competition with open
 * registration. The actor is not a staff member of the host organization, so this skips
 * `teams.create`; the caller must first verify the competition accepts applications.
 */
export class CreateApplicantTeamUseCase {
  constructor(
    private readonly deps: {
      readonly teams: TeamRepository;
      readonly clock: ClockPort;
      readonly ids: IdGeneratorPort;
    },
  ) {}

  execute(input: CreateTeamInput): Promise<Result<Team, CreateApplicantTeamError>> {
    return createTeamUnchecked(this.deps, input);
  }
}
