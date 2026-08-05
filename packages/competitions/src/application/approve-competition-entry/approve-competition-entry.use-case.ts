import { err, ok, type OrganizationId, type Result } from "@futrob/shared-kernel";
import type { CompetitionEntry } from "../../domain/entities/competition-entry.ts";
import {
  CompetitionNotFound,
  EntryAlreadyDecided,
  EntryNotFound,
  ExternalClubVerificationRequired,
  type ApproveCompetitionEntryError,
} from "../../domain/errors/competition.errors.ts";
import type { CompetitionEntryRepository } from "../../domain/ports/competition-entry.repository.ts";
import type { CompetitionRepository } from "../../domain/ports/competition.repository.ts";
import type { TeamExternalClubVerificationPort } from "../../domain/ports/team-external-club-verification.port.ts";

export interface ApproveCompetitionEntryInput {
  readonly organizationId: OrganizationId;
  readonly entryId: string;
}

export class ApproveCompetitionEntryUseCase {
  constructor(
    private readonly deps: {
      readonly entries: CompetitionEntryRepository;
      readonly competitions: CompetitionRepository;
      readonly externalClubVerification: TeamExternalClubVerificationPort;
    },
  ) {}

  async execute(
    input: ApproveCompetitionEntryInput,
  ): Promise<Result<CompetitionEntry, ApproveCompetitionEntryError>> {
    const entry = await this.deps.entries.findById(input.organizationId, input.entryId);
    if (!entry) {
      return err(
        new EntryNotFound({
          code: "competitions.entry_not_found",
          message: "Competition entry not found",
        }),
      );
    }

    if (entry.status !== "pending") {
      return err(
        new EntryAlreadyDecided({
          code: "competitions.entry_already_decided",
          message: "Competition entry is no longer pending",
        }),
      );
    }

    const draft = await this.deps.competitions.findById(input.organizationId, entry.competitionId);
    if (!draft) {
      return err(
        new CompetitionNotFound({
          code: "competitions.not_found",
          message: "Competition not found",
        }),
      );
    }

    if (draft.rules.requireVerifiedExternalClub) {
      const verified = await this.deps.externalClubVerification.isVerified(
        input.organizationId,
        entry.teamId,
      );
      if (!verified) {
        return err(
          new ExternalClubVerificationRequired({
            code: "competitions.external_club_verification_required",
            message: "Team external club must be verified before approval",
          }),
        );
      }
    }

    return ok(
      await this.deps.entries.save({
        ...entry,
        status: "approved",
      }),
    );
  }
}
