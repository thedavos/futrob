import {
  err,
  ok,
  Panic,
  type ActorId,
  type AuthorizationPort,
  type ClockPort,
  type EncounterId,
  type IdGeneratorPort,
  type OrganizationId,
  type Result,
} from "@futrob/shared-kernel";
import type { MatchDispute } from "../../domain/entities/match-dispute.ts";
import type { OfficialMatchSelection } from "../../domain/entities/official-match-selection.ts";
import {
  OfficialResultForbidden,
  SelectionNotFound,
} from "../../domain/errors/official-result.errors.ts";
import {
  SelectionStateConflict,
  type ReviewMatchDisputeError,
} from "../../domain/errors/official-selection.errors.ts";
import { EncounterNotFound } from "../../domain/errors/select-official-matches.errors.ts";
import type { EncounterReaderPort } from "../../domain/ports/encounter-reader.port.ts";
import type { SelectionCommandDigestPort } from "../../domain/ports/selection-command-digest.port.ts";
import { commandFingerprint } from "../command-fingerprint.ts";
import type {
  OfficialMatchSelectionRepository,
  OfficialResultRepository,
} from "../../domain/ports/official-result.repository.ts";
import {
  protectOfficialSelectionCommandOutput,
  type OfficialSelectionCommandOutput,
} from "../official-selection-output.ts";
import {
  activeDispute,
  approvedGuard,
  authorizeOperator,
  buildAction,
  normalizeReason,
  statusConflict,
  versionConflict,
} from "../selection-command-support.ts";
import { conflictOrReplay, lookupReplay, replayOutput } from "../selection-replay.ts";

export interface ReviewMatchDisputeInput {
  readonly actorId: ActorId;
  readonly organizationId: OrganizationId;
  readonly encounterId: EncounterId;
  readonly expectedVersion: number;
  readonly reason?: string;
  readonly commandKey: string;
}

/**
 * An operator with `results.approve` takes a disputed case: `disputed` becomes
 * `organizer_review`. Taking a case approves nothing and Teams can no longer
 * change it.
 */
export class ReviewMatchDisputeUseCase {
  constructor(
    private readonly deps: {
      readonly encounterReader: EncounterReaderPort;
      readonly commandDigest: SelectionCommandDigestPort;
      readonly selections: OfficialMatchSelectionRepository;
      readonly results: Pick<OfficialResultRepository, "findById">;
      readonly authorization: AuthorizationPort;
      readonly ids: IdGeneratorPort;
      readonly clock: ClockPort;
    },
  ) {}

  async execute(
    input: ReviewMatchDisputeInput,
  ): Promise<Result<OfficialSelectionCommandOutput, ReviewMatchDisputeError>> {
    const encounter = await this.deps.encounterReader.getById(input.encounterId);
    if (!encounter || encounter.organizationId !== input.organizationId) {
      return err(
        new EncounterNotFound({
          code: "results.encounter_not_found",
          message: "Encounter not found",
          encounterId: input.encounterId,
        }),
      );
    }
    if (!(await authorizeOperator(this.deps, { actorId: input.actorId, encounter }))) {
      return err(
        new OfficialResultForbidden({
          code: "results.official_result_forbidden",
          message: "The actor cannot review disputes for this encounter",
        }),
      );
    }

    const reason = normalizeReason(input.reason);
    const fingerprint = commandFingerprint(this.deps.commandDigest, input, {
      type: "review_dispute",
      expectedVersion: input.expectedVersion,
      reason,
    });
    const replay = await lookupReplay(this.deps.selections, { ...input, fingerprint });
    if (replay.kind === "reused") return err(replay.error);
    if (replay.kind === "replay") {
      const output = await replayOutput(this.deps, input.encounterId, replay.actions);
      if (output) return ok(output);
    }

    const selection = await this.deps.selections.findLatestByEncounter(input.encounterId);
    if (!selection) {
      return err(
        new SelectionNotFound({
          code: "results.selection_not_found",
          message: "No official selection to review",
          encounterId: input.encounterId,
        }),
      );
    }
    const approved = approvedGuard(selection, "review_dispute", input.encounterId);
    if (approved) return err(approved);
    if (selection.version !== input.expectedVersion) {
      return err(versionConflict(input.expectedVersion, selection.version));
    }
    const conflict = statusConflict(selection, "review_dispute", input.encounterId);
    if (conflict) return err(conflict);
    const disputes = await this.deps.selections.listDisputes(selection.id);
    const open = activeDispute(disputes);
    if (!open) {
      return err(
        new SelectionStateConflict({
          code: "results.selection_state_conflict",
          message: "The selection has no active dispute to review",
          command: "review_dispute",
          status: selection.status,
        }),
      );
    }

    const now = this.deps.clock.now();
    const nextVersion = selection.version + 1;
    const nextSelection: OfficialMatchSelection = {
      ...selection,
      status: "organizer_review",
      version: nextVersion,
      updatedAt: now,
    };
    const dispute: MatchDispute = {
      ...open,
      status: "under_review",
      reviewStartedByActorId: input.actorId,
      reviewStartedAt: now,
    };
    const action = buildAction(
      {
        ids: this.deps.ids,
        clock: this.deps.clock,
        organizationId: encounter.organizationId,
        competitionId: encounter.competitionId,
        encounterId: encounter.encounterId,
        actor: { capacity: "operator", actorId: input.actorId },
        commandKey: input.commandKey,
        fingerprint,
      },
      {
        type: "review_started",
        selectionId: selection.id,
        proposalId: selection.currentProposalId,
        fromStatus: selection.status,
        toStatus: "organizer_review",
        versionBefore: selection.version,
        versionAfter: nextVersion,
        reason,
        details: { disputeId: dispute.id },
        occurredAt: now,
      },
    );
    const committed = await this.deps.selections.commitTransition({
      expectedVersion: selection.version,
      selection: nextSelection,
      newProposals: [],
      actions: [action],
      dispute: { kind: "update", dispute },
      references: { acquire: [], release: "none" },
    });
    if (committed.status === "version_conflict") {
      return conflictOrReplay(this.deps, {
        encounterId: input.encounterId,
        actorId: input.actorId,
        commandKey: input.commandKey,
        fingerprint,
        expectedVersion: selection.version,
        currentVersion: committed.currentVersion,
      });
    }
    if (committed.status === "reference_claimed") {
      throw new Panic("Reviewing a dispute never acquires references");
    }
    const proposals = await this.deps.selections.listProposals(selection.id);
    return ok(
      protectOfficialSelectionCommandOutput({
        selection: nextSelection,
        proposal: proposals.find((row) => row.id === selection.currentProposalId) ?? null,
        actions: [action],
        dispute,
        approvedResult: null,
        integrityFlags: [],
        replayed: false,
      }),
    );
  }
}
