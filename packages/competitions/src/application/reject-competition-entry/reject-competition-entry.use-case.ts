import {
  err,
  ok,
  type ActorId,
  type AuthorizationPort,
  type CompetitionId,
  type OrganizationId,
  type Result,
} from "@futrob/shared-kernel";
import type { CompetitionEntry } from "../../domain/entities/competition-entry.ts";
import {
  EntryAlreadyDecided,
  EntryNotFound,
  CompetitionAuthorizationForbidden,
  type RejectCompetitionEntryError,
} from "../../domain/errors/competition.errors.ts";
import type { CompetitionEntryRepository } from "../../domain/ports/competition-entry.repository.ts";
import { COMPETITION_PERMISSION } from "../../domain/policies/competition-permissions.ts";

export interface RejectCompetitionEntryInput {
  readonly actorId: ActorId;
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly entryId: string;
}

export class RejectCompetitionEntryUseCase {
  constructor(
    private readonly deps: {
      readonly entries: CompetitionEntryRepository;
      readonly authorization: AuthorizationPort;
    },
  ) {}

  async execute(
    input: RejectCompetitionEntryInput,
  ): Promise<Result<CompetitionEntry, RejectCompetitionEntryError>> {
    const decision = await this.deps.authorization.decide({
      actorId: input.actorId,
      permission: COMPETITION_PERMISSION.participantsManage,
      scope: { organizationId: input.organizationId, competitionId: input.competitionId },
    });
    if (!decision.allowed) {
      return err(
        new CompetitionAuthorizationForbidden({
          code: "authorization.forbidden",
          message: "Cannot reject entries in this competition",
          permission: COMPETITION_PERMISSION.participantsManage,
        }),
      );
    }
    const entry = await this.deps.entries.findById(input.organizationId, input.entryId);
    if (!entry || entry.competitionId !== input.competitionId) {
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
      await this.deps.entries.save({
        ...entry,
        status: "rejected",
      }),
    );
  }
}
