import {
  err,
  ok,
  type ClockPort,
  type ActorId,
  type AuthorizationPort,
  type CompetitionId,
  type IdGeneratorPort,
  type OrganizationId,
  type Result,
  type TeamId,
} from "@futrob/shared-kernel";
import type { CompetitionEntry } from "../../domain/entities/competition-entry.ts";
import {
  CompetitionNotFound,
  CompetitionNotEditable,
  EntryCreationKeyConflict,
  type RegisterTeamEntryError,
} from "../../domain/errors/competition.errors.ts";
import type { CompetitionEntryRepository } from "../../domain/ports/competition-entry.repository.ts";
import type { CompetitionRepository } from "../../domain/ports/competition.repository.ts";
import { COMPETITION_PERMISSION } from "../../domain/policies/competition-permissions.ts";
import { competitionPermissionError } from "../require-competition-permission.ts";

export interface RegisterTeamEntryInput {
  readonly actorId: ActorId;
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly teamId: TeamId;
  readonly creationKey?: string;
  readonly approved?: boolean;
}

export class RegisterTeamEntryUseCase {
  constructor(
    private readonly deps: {
      readonly competitions: CompetitionRepository;
      readonly entries: CompetitionEntryRepository;
      readonly clock: ClockPort;
      readonly ids: IdGeneratorPort;
      readonly authorization: AuthorizationPort;
    },
  ) {}

  async execute(
    input: RegisterTeamEntryInput,
  ): Promise<Result<CompetitionEntry, RegisterTeamEntryError>> {
    const forbidden = await competitionPermissionError({
      authorization: this.deps.authorization,
      actorId: input.actorId,
      permission: COMPETITION_PERMISSION.participantsManage,
      scope: { organizationId: input.organizationId, competitionId: input.competitionId },
    });
    if (forbidden) return err(forbidden);
    const competition = await this.deps.competitions.findById(
      input.organizationId,
      input.competitionId,
    );
    if (!competition) {
      return err(
        new CompetitionNotFound({
          code: "competitions.not_found",
          message: "Competition not found",
        }),
      );
    }
    if (competition.competition.status !== "draft") {
      return err(
        new CompetitionNotEditable({
          code: "competitions.not_editable",
          message: "Competition participants cannot be changed after publication",
        }),
      );
    }

    if (input.creationKey) {
      const byKey = await this.deps.entries.findByCreationKey(input.creationKey);
      if (byKey) {
        if (byKey.organizationId !== input.organizationId) {
          return err(
            new EntryCreationKeyConflict({
              code: "competitions.entry_creation_key_conflict",
              message: "Creation key belongs to another organization",
            }),
          );
        }
        return ok(
          input.approved && byKey.status === "pending"
            ? await this.deps.entries.save({ ...byKey, status: "approved" })
            : byKey,
        );
      }
    }

    const existing = await this.deps.entries.findByCompetitionAndTeam(
      input.organizationId,
      input.competitionId,
      input.teamId,
    );
    if (existing) {
      return ok(
        input.approved && existing.status === "pending"
          ? await this.deps.entries.save({ ...existing, status: "approved" })
          : existing,
      );
    }

    return ok(
      await this.deps.entries.save({
        id: this.deps.ids.generate(),
        organizationId: input.organizationId,
        competitionId: input.competitionId,
        teamId: input.teamId,
        status: input.approved ? "approved" : "pending",
        createdAt: this.deps.clock.now(),
        creationKey: input.creationKey ?? null,
      }),
    );
  }
}
