import {
  err,
  type ClockPort,
  type CompetitionId,
  type IdGeneratorPort,
  type OrganizationId,
  type Result,
  type TeamId,
} from "@futrob/shared-kernel";
import type { CompetitionEntry } from "../../domain/entities/competition-entry.ts";
import {
  type CompetitionCapacityReached,
  type CompetitionPlanLimitReached,
  CompetitionNotEditable,
  CompetitionNotFound,
  type EntryCreationKeyConflict,
} from "../../domain/errors/competition.errors.ts";
import { canEditParticipants } from "../../domain/policies/competition-lifecycle.ts";
import type { CompetitionEntryRepository } from "../../domain/ports/competition-entry.repository.ts";
import type { CompetitionRepository } from "../../domain/ports/competition.repository.ts";
import type { CompetitionPlanLimitsPort } from "../../domain/ports/competition-plan-limits.port.ts";
import { approvedTeamCapacityError } from "../team-capacity.ts";
import { registerTeamEntryUnchecked } from "../register-team-entry/register-team-entry.use-case.ts";

export type RegisterInvitedEntryError =
  | CompetitionNotFound
  | CompetitionNotEditable
  | CompetitionCapacityReached
  | CompetitionPlanLimitReached
  | EntryCreationKeyConflict;

/**
 * Trusted flow: registers the team an invited captain brings as `approved`. The organizer
 * already chose it, so it skips `participants.manage`; the caller must first resolve an
 * invitation the actor may accept. Idempotent under `creationKey`.
 */
export class RegisterInvitedEntryUseCase {
  constructor(
    private readonly deps: {
      readonly competitions: CompetitionRepository;
      readonly entries: CompetitionEntryRepository;
      readonly planLimits: CompetitionPlanLimitsPort;
      readonly clock: ClockPort;
      readonly ids: IdGeneratorPort;
    },
  ) {}

  async execute(input: {
    readonly organizationId: OrganizationId;
    readonly competitionId: CompetitionId;
    readonly teamId: TeamId;
    readonly creationKey: string;
  }): Promise<Result<CompetitionEntry, RegisterInvitedEntryError>> {
    const retried = await this.deps.entries.findByCreationKey(input.creationKey);
    if (retried) return registerTeamEntryUnchecked(this.deps, { ...input, approved: true });
    const draft = await this.deps.competitions.findById(input.organizationId, input.competitionId);
    if (!draft) {
      return err(
        new CompetitionNotFound({
          code: "competitions.not_found",
          message: "Competition not found",
        }),
      );
    }
    if (!canEditParticipants(draft.competition.status)) {
      return err(
        new CompetitionNotEditable({
          code: "competitions.not_editable",
          message: "The competition no longer accepts teams",
        }),
      );
    }
    const approved = await this.deps.entries.countApprovedByCompetition(
      input.organizationId,
      input.competitionId,
    );
    const full = await approvedTeamCapacityError(this.deps.planLimits, draft.competition, approved);
    if (full) return err(full);
    return registerTeamEntryUnchecked(this.deps, { ...input, approved: true });
  }
}
