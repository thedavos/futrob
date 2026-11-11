import {
  err,
  ok,
  type AuthorizationPort,
  type Permission,
  type Result,
  type TeamId,
} from "@futrob/shared-kernel";
import type { CompetitionSanction } from "../../domain/entities/competition-sanction.ts";
import type { CompetitionAuthorizationForbidden } from "../../domain/errors/competition.errors.ts";
import type { ListSanctionsError } from "../../domain/errors/sanction.errors.ts";
import { COMPETITION_PERMISSION } from "../../domain/policies/competition-permissions.ts";
import type { CompetitionSanctionRepository } from "../../domain/ports/competition-sanction.repository.ts";
import type { CompetitionRepository } from "../../domain/ports/competition.repository.ts";
import { competitionPermissionError } from "../require-competition-permission.ts";
import { requireCompetitionAccess, type SanctionScope } from "./sanctionable-competition.guard.ts";

/** Every sanction of the competition, active and revoked, for its organizer and staff. */
export class ListCompetitionSanctionsUseCase {
  constructor(
    private readonly deps: {
      readonly authorization: AuthorizationPort;
      readonly competitions: Pick<CompetitionRepository, "findById">;
      readonly sanctions: CompetitionSanctionRepository;
    },
  ) {}

  async execute(
    input: SanctionScope,
  ): Promise<Result<readonly CompetitionSanction[], ListSanctionsError>> {
    const access = await requireCompetitionAccess(
      this.deps,
      input,
      COMPETITION_PERMISSION.sanctionsRead,
    );
    if (access.isErr()) return err(access.error);
    return ok(
      await this.deps.sanctions.listByCompetition(input.organizationId, input.competitionId),
    );
  }
}

export interface ListTeamSanctionsInput extends SanctionScope {
  readonly teamId: TeamId;
}

/**
 * Read-only view of the affected Team: sanctions on it and on its players. Authorized on
 * the Team scope, so only that Team's roster (and operators) pass. `teamReadPermission`
 * is the teams catalog's read capability, injected because `competitions` cannot import
 * `@futrob/teams`.
 */
export class ListTeamSanctionsUseCase {
  constructor(
    private readonly deps: {
      readonly authorization: AuthorizationPort;
      readonly sanctions: CompetitionSanctionRepository;
      readonly teamReadPermission: Permission;
    },
  ) {}

  async execute(
    input: ListTeamSanctionsInput,
  ): Promise<Result<readonly CompetitionSanction[], CompetitionAuthorizationForbidden>> {
    const forbidden = await competitionPermissionError({
      authorization: this.deps.authorization,
      actorId: input.actorId,
      permission: this.deps.teamReadPermission,
      scope: {
        organizationId: input.organizationId,
        competitionId: input.competitionId,
        teamId: input.teamId,
      },
    });
    if (forbidden) return err(forbidden);
    return ok(
      await this.deps.sanctions.listByTeam(input.organizationId, input.competitionId, input.teamId),
    );
  }
}
