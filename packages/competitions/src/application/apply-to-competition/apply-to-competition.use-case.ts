import {
  err,
  ok,
  type ClockPort,
  type CompetitionId,
  type IdGeneratorPort,
  type OrganizationId,
  type Result,
  type TeamId,
} from "@futrob/shared-kernel";
import type { CompetitionEntry } from "../../domain/entities/competition-entry.ts";
import {
  CompetitionCapacityReached,
  CompetitionNotFound,
  CompetitionRegistrationClosed,
  type ApplyToCompetitionError,
} from "../../domain/errors/competition.errors.ts";
import type { CompetitionEntryRepository } from "../../domain/ports/competition-entry.repository.ts";
import type { CompetitionRepository } from "../../domain/ports/competition.repository.ts";
import { hasCapacityFor } from "../../domain/value-objects/team-range.ts";
import { registerTeamEntryUnchecked } from "../register-team-entry/register-team-entry.use-case.ts";

export interface ApplyToCompetitionInput {
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly teamId: TeamId;
  readonly creationKey: string;
}

/**
 * Self-service application: records a `pending` entry while the competition is in
 * `registration`. Requires no staff permission; staff later approves or rejects the entry.
 */
export class ApplyToCompetitionUseCase {
  constructor(
    private readonly deps: {
      readonly competitions: CompetitionRepository;
      readonly entries: CompetitionEntryRepository;
      readonly clock: ClockPort;
      readonly ids: IdGeneratorPort;
    },
  ) {}

  /** Read-only guard the orchestrating flow runs before creating anything. */
  async ensureAcceptingApplications(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
  ): Promise<
    Result<void, CompetitionNotFound | CompetitionRegistrationClosed | CompetitionCapacityReached>
  > {
    const competition = await this.deps.competitions.findById(organizationId, competitionId);
    if (!competition)
      return err(
        new CompetitionNotFound({
          code: "competitions.not_found",
          message: "Competition not found",
        }),
      );
    if (competition.competition.status !== "registration")
      return err(
        new CompetitionRegistrationClosed({
          code: "competitions.registration_closed",
          message: "Competition is not accepting applications",
        }),
      );
    const approved = await this.deps.entries.countApprovedByCompetition(
      organizationId,
      competitionId,
    );
    if (!hasCapacityFor(competition.competition.teams, approved))
      return err(
        new CompetitionCapacityReached({
          code: "competitions.capacity_reached",
          message: "Competition has reached its team capacity",
        }),
      );
    return ok(undefined);
  }

  async execute(
    input: ApplyToCompetitionInput,
  ): Promise<Result<CompetitionEntry, ApplyToCompetitionError>> {
    const accepting = await this.ensureAcceptingApplications(
      input.organizationId,
      input.competitionId,
    );
    if (!accepting.isOk()) return err(accepting.error);
    return registerTeamEntryUnchecked(this.deps, { ...input, approved: false });
  }
}
