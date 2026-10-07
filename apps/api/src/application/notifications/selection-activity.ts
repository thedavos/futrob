import type {
  EncounterReaderPort,
  EncounterScheduleSnapshot,
  ExpireConfirmationWindowInput,
  OfficialSelectionCommandOutput,
} from "@futrob/results";
import type { ActorId } from "@futrob/shared-kernel";
import type { ActivityWriter } from "@/di/notifications.module.ts";
import { encounterSubject, teamName, type ActivitySubjectReaders } from "./activity-subjects.ts";

/**
 * Projects a selection command onto the activity feed inside the command's transaction.
 * It reconciles from the command output, so every command (and its replay) converges:
 * the proposal the rival must confirm stays open, every other proposal the command
 * touched is closed, and the dispute follows its own status.
 */
export class SelectionActivityProjector {
  constructor(
    private readonly deps: {
      readonly writer: ActivityWriter;
      readonly encounterReader: EncounterReaderPort;
      readonly readers: ActivitySubjectReaders;
    },
  ) {}

  async project(output: OfficialSelectionCommandOutput, actorId: ActorId): Promise<void> {
    const { selection, proposal, dispute } = output;
    const pendingProposalId =
      selection.status === "awaiting_opponent_confirmation" ? selection.currentProposalId : null;

    const touched = new Set<string>();
    if (proposal) touched.add(proposal.id);
    if (proposal?.supersedesProposalId) touched.add(proposal.supersedesProposalId);
    for (const action of output.actions) if (action.proposalId) touched.add(action.proposalId);
    if (pendingProposalId) touched.delete(pendingProposalId);
    for (const proposalId of touched) {
      await this.deps.writer.close({
        source: { name: "proposal", id: proposalId },
        closedByActorId: actorId,
        closedAt: selection.updatedAt,
      });
    }

    let encounter: EncounterScheduleSnapshot | null | undefined;
    const readEncounter = async () => {
      if (encounter === undefined) {
        encounter = await this.deps.encounterReader.getById(selection.encounterId);
      }
      return encounter;
    };

    if (proposal && proposal.id === pendingProposalId && proposal.proposingTeamId) {
      const scheduled = await readEncounter();
      if (scheduled) {
        const rivalTeamId =
          proposal.proposingTeamId === scheduled.homeTeamId
            ? scheduled.awayTeamId
            : scheduled.homeTeamId;
        const [subject, rivalName] = await Promise.all([
          encounterSubject(this.deps.readers, scheduled),
          teamName(this.deps.readers, scheduled.organizationId, rivalTeamId),
        ]);
        await this.deps.writer.record({
          organizationId: selection.organizationId,
          competitionId: selection.competitionId,
          kind: "selection_confirmation",
          source: { name: "proposal", id: proposal.id },
          resource: { type: "encounter", id: selection.encounterId },
          subject: { ...subject, teamName: rivalName },
          actorId: proposal.proposedByActorId,
          occurredAt: proposal.createdAt,
          expiresAt: proposal.confirmationDeadline,
          recipients: [
            { audience: "team", audienceId: rivalTeamId, requiresAction: true },
            {
              audience: "organization",
              audienceId: selection.organizationId,
              requiresAction: false,
            },
          ],
        });
      }
    }

    if (!dispute) return;
    if (dispute.status === "resolved") {
      await this.deps.writer.close({
        source: { name: "match_dispute", id: dispute.id },
        closedByActorId: dispute.resolvedByActorId,
        closedAt: dispute.resolvedAt ?? selection.updatedAt,
      });
      return;
    }
    const scheduled = await readEncounter();
    await this.deps.writer.record({
      organizationId: dispute.organizationId,
      competitionId: dispute.competitionId,
      kind: "match_dispute",
      source: { name: "match_dispute", id: dispute.id },
      resource: { type: "encounter", id: dispute.encounterId },
      subject: scheduled ? await encounterSubject(this.deps.readers, scheduled) : undefined,
      actorId: dispute.openedByActorId,
      occurredAt: dispute.openedAt,
      recipients: [
        { audience: "organization", audienceId: dispute.organizationId, requiresAction: true },
      ],
    });
  }

  /** The system closed the window: nobody confirmed in time. */
  async expired(input: ExpireConfirmationWindowInput, closedAt: Date): Promise<void> {
    await this.deps.writer.close({
      source: { name: "proposal", id: input.proposalId },
      closedByActorId: null,
      closedAt,
    });
  }
}
