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
  CompetitionCapacityReached,
  CompetitionNotFound,
  CompetitionNotEditable,
  EntryCreationKeyConflict,
  type RegisterTeamEntryError,
} from "../../domain/errors/competition.errors.ts";
import type { CompetitionEntryRepository } from "../../domain/ports/competition-entry.repository.ts";
import type { CompetitionRepository } from "../../domain/ports/competition.repository.ts";
import { hasCapacityFor } from "../../domain/value-objects/team-range.ts";
import { canEditParticipants } from "../../domain/policies/competition-lifecycle.ts";
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
    if (!canEditParticipants(competition.competition.status)) {
      return err(
        new CompetitionNotEditable({
          code: "competitions.not_editable",
          message: "Competition participants can only change in draft or registration",
        }),
      );
    }

    if (input.approved) {
      const existing = await this.deps.entries.findByCompetitionAndTeam(
        input.organizationId,
        input.competitionId,
        input.teamId,
      );
      const approved = await this.deps.entries.countApprovedByCompetition(
        input.organizationId,
        input.competitionId,
      );
      if (
        existing?.status !== "approved" &&
        !hasCapacityFor(competition.competition.teams, approved)
      ) {
        return err(
          new CompetitionCapacityReached({
            code: "competitions.capacity_reached",
            message: "Competition has reached its team capacity",
          }),
        );
      }
    }

    return registerTeamEntryUnchecked(this.deps, input);
  }
}

/**
 * Package-internal core: idempotent entry persistence without authorization or status checks.
 * Callers own both (staff registration, or a trusted application during registration).
 */
export async function registerTeamEntryUnchecked(
  deps: {
    readonly entries: CompetitionEntryRepository;
    readonly clock: ClockPort;
    readonly ids: IdGeneratorPort;
  },
  input: Omit<RegisterTeamEntryInput, "actorId">,
): Promise<Result<CompetitionEntry, EntryCreationKeyConflict>> {
  if (input.creationKey) {
    const byKey = await deps.entries.findByCreationKey(input.creationKey);
    if (byKey) {
      if (
        byKey.organizationId !== input.organizationId ||
        byKey.competitionId !== input.competitionId ||
        byKey.teamId !== input.teamId
      ) {
        return err(
          new EntryCreationKeyConflict({
            code: "competitions.entry_creation_key_conflict",
            message: "Creation key belongs to another competition or team",
          }),
        );
      }
      return ok(
        input.approved && byKey.status === "pending"
          ? await deps.entries.save({ ...byKey, status: "approved" })
          : byKey,
      );
    }
  }

  const existing = await deps.entries.findByCompetitionAndTeam(
    input.organizationId,
    input.competitionId,
    input.teamId,
  );
  if (existing) {
    return ok(
      input.approved && existing.status === "pending"
        ? await deps.entries.save({ ...existing, status: "approved" })
        : existing,
    );
  }

  return ok(
    await deps.entries.save({
      id: deps.ids.generate(),
      organizationId: input.organizationId,
      competitionId: input.competitionId,
      teamId: input.teamId,
      status: input.approved ? "approved" : "pending",
      createdAt: deps.clock.now(),
      creationKey: input.creationKey ?? null,
    }),
  );
}
