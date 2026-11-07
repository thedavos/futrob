import {
  err,
  ok,
  type ActorId,
  type ClockPort,
  type CompetitionId,
  type EncounterId,
  type IdGeneratorPort,
  type OrganizationId,
  type Result,
} from "@futrob/shared-kernel";
import type { SelectionVersionConflict } from "../../domain/errors/official-selection.errors.ts";
import type { OfficialMatchSelectionRepository } from "../../domain/ports/official-result.repository.ts";
import {
  activeDispute,
  buildAction,
  normalizeReason,
  versionConflict,
} from "../selection-command-support.ts";

export interface CancelOpenSelectionInput {
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly encounterId: EncounterId;
  /** Organizer behind the cancellation. */
  readonly actorId: ActorId;
  readonly reason: string;
}

export interface CancelOpenSelectionOutput {
  readonly status: "voided" | "nothing_open";
}

/**
 * Voids a selection that was still being negotiated because its Encounter will no longer be played.
 * An approved selection is terminal here: its official result is only ever voided on purpose, by
 * `VoidOfficialResultUseCase`. The caller holds the Encounter lock and has already authorized.
 */
export class CancelOpenSelectionUseCase {
  constructor(
    private readonly deps: {
      readonly selections: OfficialMatchSelectionRepository;
      readonly ids: IdGeneratorPort;
      readonly clock: ClockPort;
    },
  ) {}

  async execute(
    input: CancelOpenSelectionInput,
  ): Promise<Result<CancelOpenSelectionOutput, SelectionVersionConflict>> {
    const selection = await this.deps.selections.findLatestByEncounter(input.encounterId);
    if (
      !selection ||
      selection.organizationId !== input.organizationId ||
      selection.competitionId !== input.competitionId ||
      selection.status === "approved" ||
      selection.status === "voided"
    ) {
      return ok({ status: "nothing_open" });
    }

    const actor = { capacity: "operator", actorId: input.actorId } as const;
    const now = this.deps.clock.now();
    const reason = normalizeReason(input.reason);
    const version = selection.version + 1;
    const disputes = await this.deps.selections.listDisputes(selection.id);
    const open = activeDispute(disputes);
    const committed = await this.deps.selections.commitTransition({
      expectedVersion: selection.version,
      selection: { ...selection, status: "voided", version, updatedAt: now },
      newProposals: [],
      actions: [
        buildAction(
          {
            ids: this.deps.ids,
            clock: this.deps.clock,
            organizationId: selection.organizationId,
            competitionId: selection.competitionId,
            encounterId: selection.encounterId,
            actor,
            commandKey: null,
            fingerprint: null,
          },
          {
            type: "voided",
            selectionId: selection.id,
            proposalId: selection.currentProposalId,
            fromStatus: selection.status,
            toStatus: "voided",
            versionBefore: selection.version,
            versionAfter: version,
            reason,
            details: open ? { disputeId: open.id } : null,
            occurredAt: now,
          },
        ),
      ],
      dispute: open
        ? {
            kind: "update",
            dispute: {
              ...open,
              status: "resolved",
              resolvedByActorId: actor.actorId,
              resolvedAt: now,
              resolution: "returned_to_selection",
              resolutionProposalId: null,
              resolutionReason: reason,
            },
          }
        : null,
      references: { acquire: [], release: "all" },
    });
    if (committed.status === "version_conflict") {
      return err(versionConflict(selection.version, committed.currentVersion));
    }
    return ok({ status: "voided" });
  }
}
