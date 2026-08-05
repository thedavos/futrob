import { err, ok, type OrganizationId, type Result } from "@futrob/shared-kernel";
import type { CompetitionEntry } from "../../domain/entities/competition-entry.ts";
import {
  EntryAlreadyDecided,
  EntryNotFound,
  type RejectCompetitionEntryError,
} from "../../domain/errors/competition.errors.ts";
import type { CompetitionEntryRepository } from "../../domain/ports/competition-entry.repository.ts";

export interface RejectCompetitionEntryInput {
  readonly organizationId: OrganizationId;
  readonly entryId: string;
}

export class RejectCompetitionEntryUseCase {
  constructor(private readonly entries: CompetitionEntryRepository) {}

  async execute(
    input: RejectCompetitionEntryInput,
  ): Promise<Result<CompetitionEntry, RejectCompetitionEntryError>> {
    const entry = await this.entries.findById(input.organizationId, input.entryId);
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

    return ok(
      await this.entries.save({
        ...entry,
        status: "rejected",
      }),
    );
  }
}
