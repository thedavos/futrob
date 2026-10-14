import {
  addDays,
  err,
  ok,
  type ActorId,
  type AuthorizationPort,
  type ClockPort,
  type IdGeneratorPort,
  type Result,
} from "@futrob/shared-kernel";
import {
  DIRECTED_ENTRY_INVITATION_TTL_DAYS,
  ENTRY_INVITATION_CHANNEL,
  ENTRY_INVITATION_MESSAGE_MAX_LENGTH,
  ENTRY_INVITATION_STATUS,
  type EntryInvitation,
} from "../../domain/entities/entry-invitation.ts";
import {
  EntryInvitationPendingConflict,
  InvalidEntryInvitationMessage,
  type InviteTeamCaptainError,
} from "../../domain/errors/entry-invitation.errors.ts";
import type { CompetitionRepository } from "../../domain/ports/competition.repository.ts";
import type { EntryInvitationRepository } from "../../domain/ports/entry-invitation.repository.ts";
import {
  requireInvitableCompetition,
  type EntryInvitationScope,
} from "./manage-entry-invitations.guard.ts";

export interface InviteTeamCaptainInput extends EntryInvitationScope {
  readonly inviteeActorId: ActorId;
  readonly inviteeLabel: string;
  readonly message?: string | null;
}

/** Invites one player to bring a team; they become its captain when they accept. */
export class InviteTeamCaptainUseCase {
  constructor(
    private readonly deps: {
      readonly authorization: AuthorizationPort;
      readonly competitions: CompetitionRepository;
      readonly invitations: EntryInvitationRepository;
      readonly clock: ClockPort;
      readonly ids: IdGeneratorPort;
    },
  ) {}

  async execute(
    input: InviteTeamCaptainInput,
  ): Promise<Result<EntryInvitation, InviteTeamCaptainError>> {
    const message = input.message?.trim() || null;
    if (message && message.length > ENTRY_INVITATION_MESSAGE_MAX_LENGTH) {
      return err(
        new InvalidEntryInvitationMessage({
          code: "competitions.invalid_entry_invitation_message",
          message: `The message cannot exceed ${ENTRY_INVITATION_MESSAGE_MAX_LENGTH} characters`,
        }),
      );
    }
    const competition = await requireInvitableCompetition(this.deps, input);
    if (!competition.isOk()) return err(competition.error);
    const pending = await this.deps.invitations.findPendingDirected(
      input.organizationId,
      input.competitionId,
      input.inviteeActorId,
    );
    if (pending) {
      return err(
        new EntryInvitationPendingConflict({
          code: "competitions.entry_invitation_pending_conflict",
          message: "The player already has a pending invitation to this competition",
        }),
      );
    }
    const now = this.deps.clock.now();
    return ok(
      await this.deps.invitations.create({
        id: this.deps.ids.generate(),
        organizationId: input.organizationId,
        competitionId: input.competitionId,
        channel: ENTRY_INVITATION_CHANNEL.directed,
        inviteeActorId: input.inviteeActorId,
        inviteeLabel: input.inviteeLabel.trim() || null,
        code: null,
        message,
        status: ENTRY_INVITATION_STATUS.pending,
        invitedByActorId: input.actorId,
        createdAt: now,
        expiresAt: addDays(now, DIRECTED_ENTRY_INVITATION_TTL_DAYS),
        respondedAt: null,
        acceptedEntryId: null,
      }),
    );
  }
}
