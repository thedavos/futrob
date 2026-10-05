import {
  err,
  ok,
  Panic,
  type ActorId,
  type AuthorizationPort,
  type ClockPort,
  type EncounterId,
  type EventPublisherPort,
  type IdGeneratorPort,
  type OrganizationId,
  type Result,
} from "@futrob/shared-kernel";
import type { MatchDispute } from "../../domain/entities/match-dispute.ts";
import type { OfficialMatchSelection } from "../../domain/entities/official-match-selection.ts";
import type { OfficialResult } from "../../domain/entities/official-result.ts";
import { redactAuditReason } from "../../domain/policies/audit-reason.ts";
import {
  OfficialResultForbidden,
  SelectionNotFound,
} from "../../domain/errors/official-result.errors.ts";
import {
  IntegrityFlagsNotAcknowledged,
  ProposalNotFound,
  ReferenceAlreadyClaimed,
  type ResolveMatchDisputeError,
} from "../../domain/errors/official-selection.errors.ts";
import {
  CandidateNotAssociated,
  EncounterNotFound,
} from "../../domain/errors/select-official-matches.errors.ts";
import type { EncounterCandidateAssociationRepository } from "../../domain/ports/encounter-candidate-association.repository.ts";
import type { EncounterReaderPort } from "../../domain/ports/encounter-reader.port.ts";
import type {
  OfficialMatchSelectionRepository,
  OfficialResultRepository,
  SelectionTransition,
} from "../../domain/ports/official-result.repository.ts";
import type { ProviderMatchReaderPort } from "../../domain/ports/provider-match-reader.port.ts";
import { selectionReferences } from "../../domain/policies/slot-selection.ts";
import {
  protectOfficialSelectionCommandOutput,
  type OfficialSelectionCommandOutput,
} from "../official-selection-output.ts";
import {
  activeDispute,
  approvedGuard,
  authorizeOperator,
  buildAction,
  buildApprovedResult,
  commandFingerprint,
  requireReason,
  snapshotProposal,
  statusConflict,
  versionConflict,
} from "../selection-command-support.ts";
import { conflictOrReplay, lookupReplay, replayOutput } from "../selection-replay.ts";

export type MatchDisputeDecision =
  | {
      readonly type: "approve_proposal";
      readonly proposalId: string;
      /** Required to approve while blocking integrity flags are present. */
      readonly acknowledgeIntegrityFlags?: boolean;
    }
  | { readonly type: "return_to_selection" };

export interface ResolveMatchDisputeInput {
  readonly actorId: ActorId;
  readonly organizationId: OrganizationId;
  readonly encounterId: EncounterId;
  readonly expectedVersion: number;
  readonly decision: MatchDisputeDecision;
  /** Justification, mandatory for every decision. */
  readonly reason: string;
  readonly commandKey: string;
}

/**
 * The operator closes a case under review: approve one of the proposals of the
 * current round (which produces the official snapshot) or send the case back to
 * selection, which creates no result and needs a fresh agreement. Reference
 * uniqueness and candidate eligibility cannot be waived.
 */
export class ResolveMatchDisputeUseCase {
  constructor(
    private readonly deps: {
      readonly encounterReader: EncounterReaderPort;
      readonly selections: OfficialMatchSelectionRepository;
      readonly results: OfficialResultRepository;
      readonly associations: EncounterCandidateAssociationRepository;
      readonly providerMatches: ProviderMatchReaderPort;
      readonly eventPublisher: EventPublisherPort;
      readonly authorization: AuthorizationPort;
      readonly ids: IdGeneratorPort;
      readonly clock: ClockPort;
    },
  ) {}

  async execute(
    input: ResolveMatchDisputeInput,
  ): Promise<Result<OfficialSelectionCommandOutput, ResolveMatchDisputeError>> {
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
          message: "The actor cannot resolve disputes for this encounter",
        }),
      );
    }

    const reason = requireReason(input.reason, "reason");
    const fingerprint = commandFingerprint([
      "resolve_dispute",
      input.expectedVersion,
      input.decision.type,
      input.decision.type === "approve_proposal" ? input.decision.proposalId : null,
      input.decision.type === "approve_proposal"
        ? String(input.decision.acknowledgeIntegrityFlags === true)
        : null,
      reason.isOk() ? reason.value : "",
    ]);
    const replay = await lookupReplay(this.deps.selections, { ...input, fingerprint });
    if (replay.kind === "reused") return err(replay.error);
    if (replay.kind === "replay") {
      const output = await replayOutput(this.deps, input.encounterId, replay.actions);
      if (output) return ok(output);
    }
    if (reason.isErr()) return err(reason.error);
    const auditReason = redactAuditReason(reason.value);

    const selection = await this.deps.selections.findLatestByEncounter(input.encounterId);
    if (!selection) {
      return err(
        new SelectionNotFound({
          code: "results.selection_not_found",
          message: "No official selection to resolve",
          encounterId: input.encounterId,
        }),
      );
    }
    const approved = approvedGuard(selection, "resolve_dispute", input.encounterId);
    if (approved) return err(approved);
    if (selection.version !== input.expectedVersion) {
      return err(versionConflict(input.expectedVersion, selection.version));
    }
    const conflict = statusConflict(selection, "resolve_dispute", input.encounterId);
    if (conflict) return err(conflict);

    const [proposals, disputes] = await Promise.all([
      this.deps.selections.listProposals(selection.id),
      this.deps.selections.listDisputes(selection.id),
    ]);
    const openDispute = activeDispute(disputes);
    const now = this.deps.clock.now();
    const nextVersion = selection.version + 1;
    const context = {
      ids: this.deps.ids,
      clock: this.deps.clock,
      organizationId: encounter.organizationId,
      competitionId: encounter.competitionId,
      encounterId: encounter.encounterId,
      actor: { capacity: "operator", actorId: input.actorId } as const,
      commandKey: input.commandKey,
      fingerprint,
    };

    if (input.decision.type === "return_to_selection") {
      const nextSelection: OfficialMatchSelection = {
        ...selection,
        status: "selection_in_progress",
        version: nextVersion,
        round: selection.round + 1,
        currentProposalId: null,
        updatedAt: now,
      };
      const dispute: MatchDispute | null = openDispute
        ? {
            ...openDispute,
            status: "resolved",
            resolvedByActorId: input.actorId,
            resolvedAt: now,
            resolution: "returned_to_selection",
            resolutionProposalId: null,
            resolutionReason: auditReason,
          }
        : null;
      const action = buildAction(context, {
        type: "returned_to_selection",
        selectionId: selection.id,
        proposalId: selection.currentProposalId,
        fromStatus: selection.status,
        toStatus: "selection_in_progress",
        versionBefore: selection.version,
        versionAfter: nextVersion,
        reason: auditReason,
        details: dispute ? { disputeId: dispute.id } : null,
        occurredAt: now,
      });
      const committed = await this.deps.selections.commitTransition({
        expectedVersion: selection.version,
        selection: nextSelection,
        newProposals: [],
        actions: [action],
        dispute: dispute ? { kind: "update", dispute } : null,
        references: { acquire: [], release: "all" },
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
        throw new Panic("Returning a case to selection never acquires references");
      }
      return ok(
        protectOfficialSelectionCommandOutput({
          selection: nextSelection,
          proposal: null,
          actions: [action],
          dispute,
          approvedResult: null,
          integrityFlags: [],
          replayed: false,
        }),
      );
    }

    const { proposalId, acknowledgeIntegrityFlags } = input.decision;
    const proposal = proposals.find(
      (row) => row.id === proposalId && row.round === selection.round,
    );
    if (!proposal) {
      return err(
        new ProposalNotFound({
          code: "results.proposal_not_found",
          message: "The proposal does not belong to the current round of this selection",
          proposalId,
        }),
      );
    }
    const snapshots = await snapshotProposal(this.deps.providerMatches, proposal);
    if (!snapshots.ok) return err(snapshots.error);
    if (snapshots.flags.length > 0 && acknowledgeIntegrityFlags !== true) {
      return err(
        new IntegrityFlagsNotAcknowledged({
          code: "results.integrity_flags_not_acknowledged",
          message: "Blocking integrity flags must be acknowledged to approve",
          flags: snapshots.flags,
        }),
      );
    }

    const latest = await this.deps.results.findLatestByEncounter(encounter.encounterId);
    const result: OfficialResult = buildApprovedResult({
      id: this.deps.ids.generate(),
      encounter,
      previousRevision: latest?.revision ?? 0,
      slots: snapshots.slots,
      approvedAt: now,
      approvedBy: input.actorId,
      selectionId: selection.id,
      proposalId: proposal.id,
      basis: "operator_resolution",
    });
    const nextSelection: OfficialMatchSelection = {
      ...selection,
      status: "approved",
      version: nextVersion,
      currentProposalId: proposal.id,
      updatedAt: now,
    };
    const dispute: MatchDispute | null = openDispute
      ? {
          ...openDispute,
          status: "resolved",
          resolvedByActorId: input.actorId,
          resolvedAt: now,
          resolution: "approved_proposal",
          resolutionProposalId: proposal.id,
          resolutionReason: auditReason,
        }
      : null;
    const action = buildAction(context, {
      type: "dispute_resolved_approved",
      selectionId: selection.id,
      proposalId: proposal.id,
      fromStatus: selection.status,
      toStatus: "approved",
      versionBefore: selection.version,
      versionAfter: nextVersion,
      reason: auditReason,
      officialResultId: result.id,
      details: {
        selectedProposalId: proposal.id,
        disputeId: dispute?.id,
        acknowledgedFlags: snapshots.flags.length > 0 ? snapshots.flags : undefined,
      },
      occurredAt: now,
    });
    const refs = selectionReferences(proposal.slots);
    const transition: SelectionTransition = {
      expectedVersion: selection.version,
      selection: nextSelection,
      newProposals: [],
      actions: [action],
      dispute: dispute ? { kind: "update", dispute } : null,
      references: { acquire: refs, release: { keep: refs } },
    };
    const persisted = await this.deps.associations.writeIfEligible(
      encounter.organizationId,
      encounter.encounterId,
      refs,
      async () => {
        const committed = await this.deps.selections.commitTransition(transition);
        if (committed.status === "committed") await this.deps.results.append(result);
        return committed;
      },
    );
    if (persisted.status === "ineligible") {
      return err(
        new CandidateNotAssociated({
          code: "results.candidate_not_associated",
          message: "Official selection requires an eligible associated candidate",
          providerKey: persisted.providerMatchRef.providerKey,
          externalId: persisted.providerMatchRef.externalId,
        }),
      );
    }
    const committed = persisted.value;
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
      await this.deps.selections.recordAudit(
        buildAction(context, {
          type: "reference_reuse_rejected",
          selectionId: selection.id,
          proposalId: proposal.id,
          fromStatus: selection.status,
          toStatus: selection.status,
          versionBefore: selection.version,
          versionAfter: selection.version,
          commandKey: null,
          details: { conflictingReference: committed.providerMatchRef },
        }),
      );
      return err(
        new ReferenceAlreadyClaimed({
          code: "results.reference_already_claimed",
          message: "The provider match is already claimed by another official match",
          providerKey: committed.providerMatchRef.providerKey,
          externalId: committed.providerMatchRef.externalId,
        }),
      );
    }

    await this.deps.eventPublisher.publish({
      eventName: "results.official-result-approved",
      occurredAt: now.toISOString(),
      payload: {
        encounterId: encounter.encounterId,
        organizationId: encounter.organizationId,
        competitionId: encounter.competitionId,
        approvedBy: input.actorId,
        officialResultId: result.id,
        revision: result.revision,
      },
    });
    return ok(
      protectOfficialSelectionCommandOutput({
        selection: nextSelection,
        proposal,
        actions: [action],
        dispute,
        approvedResult: result,
        integrityFlags: snapshots.flags,
        replayed: false,
      }),
    );
  }
}
