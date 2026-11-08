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
import type { MatchDispute } from "../../domain/entities/match-dispute.ts";
import type { OfficialMatchSelection } from "../../domain/entities/official-match-selection.ts";
import type { SelectionVersionConflict } from "../../domain/errors/official-selection.errors.ts";
import type { OfficialMatchSelectionRepository } from "../../domain/ports/official-result.repository.ts";
import type { OfficialSelectionCommandOutput } from "../official-selection-output.ts";
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

export type CancelOpenSelectionOutput =
  | { readonly status: "nothing_open" }
  /** `output` lets the caller project activity like any selection command. */
  | { readonly status: "voided"; readonly output: OfficialSelectionCommandOutput };

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
    const voided: OfficialMatchSelection = {
      ...selection,
      status: "voided",
      version,
      updatedAt: now,
    };
    const action = buildAction(
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
    );
    const resolved: MatchDispute | null = open
      ? {
          ...open,
          status: "resolved",
          resolvedByActorId: actor.actorId,
          resolvedAt: now,
          resolution: "returned_to_selection",
          resolutionProposalId: null,
          resolutionReason: reason,
        }
      : null;
    const committed = await this.deps.selections.commitTransition({
      expectedVersion: selection.version,
      selection: voided,
      newProposals: [],
      actions: [action],
      dispute: resolved ? { kind: "update", dispute: resolved } : null,
      references: { acquire: [], release: "all" },
    });
    if (committed.status === "version_conflict") {
      return err(versionConflict(selection.version, committed.currentVersion));
    }
    return ok({
      status: "voided",
      output: {
        selection: voided,
        proposal: null,
        actions: [action],
        dispute: resolved,
        approvedResult: null,
        integrityFlags: [],
        replayed: false,
      },
    });
  }
}
