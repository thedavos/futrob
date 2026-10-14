import {
  err,
  ok,
  type AuthorizationPort,
  type ClockPort,
  type Result,
} from "@futrob/shared-kernel";
import {
  ENTRY_INVITATION_STATUS,
  type EntryInvitation,
} from "../../domain/entities/entry-invitation.ts";
import {
  EntryInvitationAlreadyDecided,
  EntryInvitationNotFound,
  type RevokeEntryInvitationError,
} from "../../domain/errors/entry-invitation.errors.ts";
import { COMPETITION_PERMISSION } from "../../domain/policies/competition-permissions.ts";
import type { EntryInvitationRepository } from "../../domain/ports/entry-invitation.repository.ts";
import { competitionPermissionError } from "../require-competition-permission.ts";
import type { EntryInvitationScope } from "./manage-entry-invitations.guard.ts";

export interface RevokeEntryInvitationInput extends EntryInvitationScope {
  readonly invitationId: string;
}

/** Withdraws a pending invitation of the competition, directed or link. */
export class RevokeEntryInvitationUseCase {
  constructor(
    private readonly deps: {
      readonly authorization: AuthorizationPort;
      readonly invitations: EntryInvitationRepository;
      readonly clock: ClockPort;
    },
  ) {}

  async execute(
    input: RevokeEntryInvitationInput,
  ): Promise<Result<EntryInvitation, RevokeEntryInvitationError>> {
    const forbidden = await competitionPermissionError({
      authorization: this.deps.authorization,
      actorId: input.actorId,
      permission: COMPETITION_PERMISSION.invitationsManage,
      scope: { organizationId: input.organizationId, competitionId: input.competitionId },
    });
    if (forbidden) return err(forbidden);
    const invitation = await this.deps.invitations.findById(input.invitationId);
    if (
      !invitation ||
      invitation.organizationId !== input.organizationId ||
      invitation.competitionId !== input.competitionId
    ) {
      return err(
        new EntryInvitationNotFound({
          code: "competitions.entry_invitation_not_found",
          message: "Invitation not found",
        }),
      );
    }
    const revoked = await this.deps.invitations.updatePending({
      ...invitation,
      status: ENTRY_INVITATION_STATUS.revoked,
      respondedAt: this.deps.clock.now(),
    });
    if (!revoked) {
      return err(
        new EntryInvitationAlreadyDecided({
          code: "competitions.entry_invitation_already_decided",
          message: "The invitation is no longer pending",
        }),
      );
    }
    return ok(revoked);
  }
}
