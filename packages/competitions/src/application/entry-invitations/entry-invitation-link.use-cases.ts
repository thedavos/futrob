import {
  err,
  ok,
  type AuthorizationPort,
  type ClockPort,
  type IdGeneratorPort,
  type Result,
} from "@futrob/shared-kernel";
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
  EntryInvitationNotFound,
  EntryInvitationRevoked,
  type ManageEntryInvitationsError,
  type PublicEntryInvitationLinkError,
} from "../../domain/errors/entry-invitation.errors.ts";
import { canEditParticipants } from "../../domain/policies/competition-lifecycle.ts";
import type {
  CompetitionDraft,
  CompetitionRepository,
} from "../../domain/ports/competition.repository.ts";
import type { EntryInvitationCodePort } from "../../domain/ports/entry-invitation-code.port.ts";
import type { EntryInvitationRepository } from "../../domain/ports/entry-invitation.repository.ts";
import {
  requireInvitableCompetition,
  type EntryInvitationScope,
} from "./manage-entry-invitations.guard.ts";

interface LinkDeps {
  readonly authorization: AuthorizationPort;
  readonly competitions: CompetitionRepository;
  readonly invitations: EntryInvitationRepository;
  readonly codes: EntryInvitationCodePort;
  readonly clock: ClockPort;
  readonly ids: IdGeneratorPort;
}

function createLink(deps: LinkDeps, scope: EntryInvitationScope): Promise<EntryInvitation> {
  return deps.invitations.create({
    id: deps.ids.generate(),
    organizationId: scope.organizationId,
    competitionId: scope.competitionId,
    channel: ENTRY_INVITATION_CHANNEL.link,
    inviteeActorId: null,
    inviteeLabel: null,
    code: deps.codes.generateCode(),
    message: null,
    status: ENTRY_INVITATION_STATUS.pending,
    invitedByActorId: scope.actorId,
    createdAt: deps.clock.now(),
    expiresAt: null,
    respondedAt: null,
    acceptedEntryId: null,
  });
}

/** Returns the competition's active invitation link, creating it the first time. */
export class EnsureEntryInvitationLinkUseCase {
  constructor(private readonly deps: LinkDeps) {}

  async execute(
    input: EntryInvitationScope,
  ): Promise<Result<EntryInvitation, ManageEntryInvitationsError>> {
    const competition = await requireInvitableCompetition(this.deps, input);
    if (!competition.isOk()) return err(competition.error);
    const active = await this.deps.invitations.findActiveLink(
      input.organizationId,
      input.competitionId,
    );
    return ok(active ?? (await createLink(this.deps, input)));
  }
}

/** Revokes the active link and issues a new one; the old code stops working. */
export class RegenerateEntryInvitationLinkUseCase {
  constructor(private readonly deps: LinkDeps) {}

  async execute(
    input: EntryInvitationScope,
  ): Promise<Result<EntryInvitation, ManageEntryInvitationsError>> {
    const competition = await requireInvitableCompetition(this.deps, input);
    if (!competition.isOk()) return err(competition.error);
    const active = await this.deps.invitations.findActiveLink(
      input.organizationId,
      input.competitionId,
    );
    if (active) {
      await this.deps.invitations.updatePending({
        ...active,
        status: ENTRY_INVITATION_STATUS.revoked,
        respondedAt: this.deps.clock.now(),
      });
    }
    return ok(await createLink(this.deps, input));
  }
}

/**
 * Read-only and actor-free: the competition behind a shareable link while it still admits
 * teams. Backs the public landing a visitor sees before signing in; accepting still goes
 * through the actor-bound resolution.
 */
export class ResolvePublicEntryInvitationLinkUseCase {
  constructor(
    private readonly deps: {
      readonly invitations: EntryInvitationRepository;
      readonly competitions: CompetitionRepository;
    },
  ) {}

  async execute(input: {
    readonly code: string;
  }): Promise<Result<CompetitionDraft, PublicEntryInvitationLinkError>> {
    const invitation = await this.deps.invitations.findLinkByCode(input.code.trim());
    if (!invitation || invitation.channel !== ENTRY_INVITATION_CHANNEL.link) {
      return err(
        new EntryInvitationNotFound({
          code: "competitions.entry_invitation_not_found",
          message: "Invitation not found",
        }),
      );
    }
    if (invitation.status !== ENTRY_INVITATION_STATUS.pending) {
      return err(
        new EntryInvitationRevoked({
          code: "competitions.entry_invitation_revoked",
          message: "The invitation was revoked",
        }),
      );
    }
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
    if (!canEditParticipants(competition.competition.status)) {
      return err(
        new CompetitionNotEditable({
          code: "competitions.not_editable",
          message: "The competition no longer accepts teams",
        }),
      );
    }
    return ok(competition);
  }
}
