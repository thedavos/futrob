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
  CompetitionNotFound,
  EntryCreationKeyConflict,
  type RegisterTeamEntryError,
} from "../../domain/errors/competition.errors.ts";
import type { CompetitionEntryRepository } from "../../domain/ports/competition-entry.repository.ts";
import type { CompetitionRepository } from "../../domain/ports/competition.repository.ts";

export interface RegisterTeamEntryInput {
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly teamId: TeamId;
  readonly creationKey?: string;
}

export class RegisterTeamEntryUseCase {
  constructor(
    private readonly deps: {
      readonly competitions: CompetitionRepository;
      readonly entries: CompetitionEntryRepository;
      readonly clock: ClockPort;
      readonly ids: IdGeneratorPort;
    },
  ) {}

  async execute(
    input: RegisterTeamEntryInput,
  ): Promise<Result<CompetitionEntry, RegisterTeamEntryError>> {
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
        return ok(byKey);
      }
    }

    const existing = await this.deps.entries.findByCompetitionAndTeam(
      input.competitionId,
      input.teamId,
    );
    if (existing) return ok(existing);

    return ok(
      await this.deps.entries.save({
        id: this.deps.ids.generate(),
        organizationId: input.organizationId,
        competitionId: input.competitionId,
        teamId: input.teamId,
        status: "pending",
        createdAt: this.deps.clock.now(),
        creationKey: input.creationKey ?? null,
      }),
    );
  }
}
