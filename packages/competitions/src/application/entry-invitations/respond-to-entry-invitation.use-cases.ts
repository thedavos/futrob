import { err, ok, type ActorId, type ClockPort, type Result } from "@futrob/shared-kernel";
import {
  ENTRY_INVITATION_CHANNEL,
  ENTRY_INVITATION_STATUS,
  type EntryInvitation,
} from "../../domain/entities/entry-invitation.ts";
import {
  CompetitionNotEditable,
  CompetitionNotFound,
} from "../../domain/errors/competition.errors.ts";
import {
  EntryInvitationAlreadyDecided,
  EntryInvitationNotFound,
  type DeclineEntryInvitationError,
  type EntryInvitationEligibilityError,
  type ResolveEntryInvitationError,
} from "../../domain/errors/entry-invitation.errors.ts";
import { canEditParticipants } from "../../domain/policies/competition-lifecycle.ts";
import { assessEntryInvitation } from "../../domain/policies/entry-invitation-eligibility.ts";
import type {
  CompetitionDraft,
  CompetitionRepository,
} from "../../domain/ports/competition.repository.ts";
import type { EntryInvitationRepository } from "../../domain/ports/entry-invitation.repository.ts";

/** A directed invitation is addressed by id; a link by its shareable code. */
export type EntryInvitationReference =
  | { readonly invitationId: string }
  | { readonly code: string };

export interface ResolvedEntryInvitation {
  readonly invitation: EntryInvitation;
  readonly competition: CompetitionDraft;
}

function notFound(): EntryInvitationNotFound {
  return new EntryInvitationNotFound({
    code: "competitions.entry_invitation_not_found",
    message: "Invitation not found",
  });
}

/**
 * Read-only: the invitation and its competition when `actorId` may accept it now. An
 * invitation the actor already accepted resolves even after the competition closed, so a
 * retried acceptance can return the same entry.
 */
export class ResolveEntryInvitationUseCase {
  constructor(
    private readonly deps: {
      readonly invitations: EntryInvitationRepository;
      readonly competitions: CompetitionRepository;
      readonly clock: ClockPort;
    },
  ) {}

  async execute(input: {
    readonly actorId: ActorId;
    readonly reference: EntryInvitationReference;
  }): Promise<Result<ResolvedEntryInvitation, ResolveEntryInvitationError>> {
    const invitation =
      "code" in input.reference
        ? await this.deps.invitations.findLinkByCode(input.reference.code.trim())
        : await this.deps.invitations.findById(input.reference.invitationId);
    if (!invitation) return err(notFound());
    const eligible = assessEntryInvitation({
      invitation,
      actorId: input.actorId,
      now: this.deps.clock.now(),
    });
    if (!eligible.isOk()) return err(eligible.error);
    const competition = await this.deps.competitions.findById(
      invitation.organizationId,
      invitation.competitionId,
    );
    if (!competition) {
      return err(
        new CompetitionNotFound({
          code: "competitions.not_found",
          message: "Competition not found",
        }),
      );
    }
    if (
      invitation.status === ENTRY_INVITATION_STATUS.pending &&
      !canEditParticipants(competition.competition.status)
    ) {
      return err(
        new CompetitionNotEditable({
          code: "competitions.not_editable",
          message: "The competition no longer accepts teams",
        }),
      );
    }
    return ok({ invitation, competition });
  }
}

/**
 * Closes a directed invitation as accepted with the entry it produced. A link stays
 * pending for the next team. Runs inside the acceptance transaction.
 */
export class RecordEntryInvitationAcceptanceUseCase {
  constructor(
    private readonly deps: {
      readonly invitations: EntryInvitationRepository;
      readonly clock: ClockPort;
    },
  ) {}

  async execute(input: {
    readonly invitation: EntryInvitation;
    readonly entryId: string;
  }): Promise<Result<EntryInvitation, EntryInvitationAlreadyDecided>> {
    const { invitation } = input;
    if (
      invitation.channel === ENTRY_INVITATION_CHANNEL.link ||
      invitation.status === ENTRY_INVITATION_STATUS.accepted
    ) {
      return ok(invitation);
    }
    const accepted = await this.deps.invitations.updatePending({
      ...invitation,
      status: ENTRY_INVITATION_STATUS.accepted,
      respondedAt: this.deps.clock.now(),
      acceptedEntryId: input.entryId,
    });
    if (!accepted) {
      return err(
        new EntryInvitationAlreadyDecided({
          code: "competitions.entry_invitation_already_decided",
          message: "The invitation is no longer pending",
        }),
      );
    }
    return ok(accepted);
  }
}

/** The recipient turns down a directed invitation. */
export class DeclineEntryInvitationUseCase {
  constructor(
    private readonly deps: {
      readonly invitations: EntryInvitationRepository;
      readonly clock: ClockPort;
    },
  ) {}

  async execute(input: {
    readonly actorId: ActorId;
    readonly invitationId: string;
  }): Promise<Result<EntryInvitation, DeclineEntryInvitationError>> {
    const invitation = await this.deps.invitations.findById(input.invitationId);
    if (!invitation || invitation.channel !== ENTRY_INVITATION_CHANNEL.directed) {
      return err(notFound());
    }
    const now = this.deps.clock.now();
    const eligible = assessEntryInvitation({ invitation, actorId: input.actorId, now });
    if (!eligible.isOk()) return err(eligible.error);
    const declined =
      invitation.status === ENTRY_INVITATION_STATUS.pending
        ? await this.deps.invitations.updatePending({
            ...invitation,
            status: ENTRY_INVITATION_STATUS.declined,
            respondedAt: now,
          })
        : null;
    if (!declined) return err(alreadyDecided());
    return ok(declined);
  }
}

function alreadyDecided(): EntryInvitationEligibilityError {
  return new EntryInvitationAlreadyDecided({
    code: "competitions.entry_invitation_already_decided",
    message: "The invitation is no longer pending",
  });
}
