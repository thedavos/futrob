import type {
  AcceptRosterInvitationUseCase,
  CreateRosterInvitationUseCase,
  RespondToRosterInvitationUseCase,
  RosterInvitationRepository,
  RosterInvitationTokenPort,
} from "@futrob/teams";
import type { PublishCompetitionUseCase } from "@futrob/competitions";
import type { TransactionPort } from "@futrob/shared-kernel";
import type { ActivityWriter } from "@/di/notifications.module.ts";
import { competitionName, teamName, type ActivitySubjectReaders } from "./activity-subjects.ts";

type PublishInput = Parameters<PublishCompetitionUseCase["execute"]>[0];
type CreateInvitationInput = Parameters<CreateRosterInvitationUseCase["execute"]>[0];
type AcceptInvitationInput = Parameters<AcceptRosterInvitationUseCase["execute"]>[0];
type RespondInvitationInput = Parameters<RespondToRosterInvitationUseCase["execute"]>[0];

/**
 * Commands of other contexts composed with their activity in one transaction. The
 * command runs first; its activity is written only when it succeeded, and a failed write
 * throws so the command rolls back with it.
 */
export function createActivityCommands(deps: {
  readonly writer: ActivityWriter;
  readonly transaction: TransactionPort;
  readonly readers: ActivitySubjectReaders;
  readonly competitions: { readonly publish: PublishCompetitionUseCase };
  readonly teams: {
    readonly createRosterInvitation: CreateRosterInvitationUseCase;
    readonly acceptRosterInvitation: AcceptRosterInvitationUseCase;
    readonly respondToRosterInvitation: RespondToRosterInvitationUseCase;
  };
  readonly invitations: RosterInvitationRepository;
  readonly invitationTokens: RosterInvitationTokenPort;
}) {
  const { writer, transaction, readers } = deps;

  return {
    /** A publication is a fact that is over when it happens: born closed. */
    publishCompetition: {
      execute: (input: PublishInput) =>
        transaction.runInTransaction(async () => {
          const result = await deps.competitions.publish.execute(input);
          if (!result.isOk()) return result;
          const { competition } = result.value;
          await writer.record({
            organizationId: competition.organizationId,
            competitionId: competition.id,
            kind: "competition_published",
            source: { name: "competition", id: competition.id },
            resource: { type: "competition", id: competition.id },
            subject: { competitionName: competition.name },
            actorId: input.actorId,
            occurredAt: competition.updatedAt,
            bornClosed: true,
            recipients: [
              {
                audience: "organization",
                audienceId: competition.organizationId,
                requiresAction: false,
              },
            ],
          });
          return result;
        }),
    },

    /** Only a directed invitation has someone to act; a link-only one writes no activity. */
    createRosterInvitation: {
      execute: (input: CreateInvitationInput) =>
        transaction.runInTransaction(async () => {
          const result = await deps.teams.createRosterInvitation.execute(input);
          if (!result.isOk()) return result;
          const invitation = await deps.invitations.findById(result.value.invitationId);
          if (!invitation?.inviteeActorId) return result;
          const [competition, team] = await Promise.all([
            competitionName(readers, invitation.organizationId, invitation.competitionId),
            teamName(readers, invitation.organizationId, invitation.teamId),
          ]);
          await writer.record({
            organizationId: invitation.organizationId,
            competitionId: invitation.competitionId,
            kind: "roster_invitation",
            source: { name: "roster_invitation", id: invitation.id },
            resource: { type: "roster_invitation", id: invitation.id },
            subject: { competitionName: competition, teamName: team },
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
          return result;
        }),
    },

    acceptRosterInvitation: {
      execute: (input: AcceptInvitationInput) =>
        transaction.runInTransaction(async () => {
          const invitation = await deps.invitations.findByTokenHash(
            deps.invitationTokens.hashToken(input.token),
          );
          const result = await deps.teams.acceptRosterInvitation.execute(input);
          if (result.isOk() && invitation) {
            await writer.close({
              source: { name: "roster_invitation", id: invitation.id },
              closedByActorId: input.actorId,
            });
          }
          return result;
        }),
    },

    respondToRosterInvitation: {
      execute: (input: RespondInvitationInput) =>
        transaction.runInTransaction(async () => {
          const result = await deps.teams.respondToRosterInvitation.execute(input);
          if (result.isOk()) {
            await writer.close({
              source: { name: "roster_invitation", id: input.invitationId },
              closedByActorId: input.actorId,
            });
          }
          return result;
        }),
    },
  };
}

export type ActivityCommands = ReturnType<typeof createActivityCommands>;
