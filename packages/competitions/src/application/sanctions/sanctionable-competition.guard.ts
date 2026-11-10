import {
  err,
  ok,
  type ActorId,
  type AuthorizationPort,
  type CompetitionId,
  type OrganizationId,
  type Permission,
  type Result,
} from "@futrob/shared-kernel";
import {
  CompetitionNotFound,
  type CompetitionAuthorizationForbidden,
} from "../../domain/errors/competition.errors.ts";
import { SanctionsClosed } from "../../domain/errors/sanction.errors.ts";
import { canSanction } from "../../domain/policies/competition-lifecycle.ts";
import { COMPETITION_PERMISSION } from "../../domain/policies/competition-permissions.ts";
import type {
  CompetitionDraft,
  CompetitionRepository,
} from "../../domain/ports/competition.repository.ts";
import { competitionPermissionError } from "../require-competition-permission.ts";

export interface SanctionScope {
  readonly actorId: ActorId;
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
}

/** Permission first, then the competition in this organization. */
export async function requireCompetitionAccess(
  deps: {
    readonly authorization: AuthorizationPort;
    readonly competitions: Pick<CompetitionRepository, "findById">;
  },
  scope: SanctionScope,
  permission: Permission,
): Promise<Result<CompetitionDraft, CompetitionAuthorizationForbidden | CompetitionNotFound>> {
  const forbidden = await competitionPermissionError({
    authorization: deps.authorization,
    actorId: scope.actorId,
    permission,
    scope: { organizationId: scope.organizationId, competitionId: scope.competitionId },
  });
  if (forbidden) return err(forbidden);
  const draft = await deps.competitions.findById(scope.organizationId, scope.competitionId);
  if (!draft) {
    return err(
      new CompetitionNotFound({ code: "competitions.not_found", message: "Competition not found" }),
    );
  }
  return ok(draft);
}

/** Imposing or revoking needs `sanctions.manage` and a competition in a sanctionable status. */
export async function requireSanctionableCompetition(
  deps: {
    readonly authorization: AuthorizationPort;
    readonly competitions: Pick<CompetitionRepository, "findById">;
  },
  scope: SanctionScope,
): Promise<
  Result<CompetitionDraft, CompetitionAuthorizationForbidden | CompetitionNotFound | SanctionsClosed>
> {
  const draft = await requireCompetitionAccess(deps, scope, COMPETITION_PERMISSION.sanctionsManage);
  if (draft.isErr()) return draft;
  if (!canSanction(draft.value.competition.status)) {
    return err(
      new SanctionsClosed({
        code: "competitions.sanctions_closed",
        message: "Sanctions can only change once the competition is open and before it is archived",
      }),
    );
  }
  return draft;
}
