import type {
  DeclineEntryInvitationUseCase,
  EntryInvitation,
  InviteTeamCaptainUseCase,
  RevokeEntryInvitationUseCase,
} from "@futrob/competitions";
import type { ActorId, TransactionPort } from "@futrob/shared-kernel";
import type { ActivityWriter } from "@/di/notifications.module.ts";
import { competitionName, type ActivitySubjectReaders } from "./activity-subjects.ts";

const SOURCE = "entry_invitation";

/**
 * Activity of directed entry invitations: open for the invited player while pending,
 * closed when answered or revoked. A link has no one to act, so it writes nothing.
 */
export class EntryInvitationActivity {
  constructor(
    private readonly deps: {
      readonly writer: ActivityWriter;
      readonly readers: ActivitySubjectReaders;
    },
  ) {}

  async invited(invitation: EntryInvitation): Promise<void> {
    if (!invitation.inviteeActorId) return;
    await this.deps.writer.record({
      organizationId: invitation.organizationId,
      competitionId: invitation.competitionId,
      kind: "entry_invitation",
      source: { name: SOURCE, id: invitation.id },
      resource: { type: "entry_invitation", id: invitation.id },
      subject: {
        competitionName: await competitionName(
          this.deps.readers,
          invitation.organizationId,
          invitation.competitionId,
        ),
      },
      actorId: invitation.invitedByActorId,
      occurredAt: invitation.createdAt,
      expiresAt: invitation.expiresAt,
      recipients: [
        { audience: "actor", audienceId: invitation.inviteeActorId, requiresAction: true },
        {
          audience: "organization",
          audienceId: invitation.organizationId,
          requiresAction: false,
        },
      ],
    });
  }

  async answered(invitation: EntryInvitation, actorId: ActorId): Promise<void> {
    if (!invitation.inviteeActorId) return;
    await this.deps.writer.close({
      source: { name: SOURCE, id: invitation.id },
      closedByActorId: actorId,
    });
  }
}

type InviteInput = Parameters<InviteTeamCaptainUseCase["execute"]>[0];
type RevokeInput = Parameters<RevokeEntryInvitationUseCase["execute"]>[0];
type DeclineInput = Parameters<DeclineEntryInvitationUseCase["execute"]>[0];

/** Entry invitation commands composed with their activity in one transaction. */
export function createEntryInvitationCommands(deps: {
  readonly transaction: TransactionPort;
  readonly activity: EntryInvitationActivity;
  readonly invite: InviteTeamCaptainUseCase;
  readonly revoke: RevokeEntryInvitationUseCase;
  readonly decline: DeclineEntryInvitationUseCase;
}) {
  const { transaction, activity } = deps;
  return {
    invite: {
      execute: (input: InviteInput) =>
        transaction.runInTransaction(async () => {
          const result = await deps.invite.execute(input);
          if (result.isOk()) await activity.invited(result.value);
          return result;
        }),
    },
    revoke: {
      execute: (input: RevokeInput) =>
        transaction.runInTransaction(async () => {
          const result = await deps.revoke.execute(input);
          if (result.isOk()) await activity.answered(result.value, input.actorId);
          return result;
        }),
    },
    decline: {
      execute: (input: DeclineInput) =>
        transaction.runInTransaction(async () => {
          const result = await deps.decline.execute(input);
          if (result.isOk()) await activity.answered(result.value, input.actorId);
          return result;
        }),
    },
  };
}

export type EntryInvitationCommands = ReturnType<typeof createEntryInvitationCommands>;
