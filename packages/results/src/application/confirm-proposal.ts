import {
  err,
  ok,
  type ActorId,
  type EventPublisherPort,
  type IdGeneratorPort,
  type ClockPort,
  type Result,
  type TeamId,
} from "@futrob/shared-kernel";
import type {
  OfficialMatchSelection,
  OfficialSelectionProposal,
} from "../domain/entities/official-match-selection.ts";
import type { OfficialResult } from "../domain/entities/official-result.ts";
import type { ProviderMatchSnapshotMissing } from "../domain/errors/official-result.errors.ts";
import { CandidateNotAssociated } from "../domain/errors/select-official-matches.errors.ts";
import {
  ReferenceAlreadyClaimed,
  type CommandKeyReused,
  type SelectionVersionConflict,
} from "../domain/errors/official-selection.errors.ts";
import type { EncounterCandidateAssociationRepository } from "../domain/ports/encounter-candidate-association.repository.ts";
import type { EncounterScheduleSnapshot } from "../domain/ports/encounter-reader.port.ts";
import type {
  OfficialMatchSelectionRepository,
  OfficialResultRepository,
  SelectionTransition,
} from "../domain/ports/official-result.repository.ts";
import type { ProviderMatchReaderPort } from "../domain/ports/provider-match-reader.port.ts";
import { selectionReferences } from "../domain/policies/slot-selection.ts";
import type { OfficialSelectionCommandOutput } from "./official-selection-output.ts";
import { buildAction, buildApprovedResult, snapshotProposal } from "./selection-command-support.ts";
import { conflictOrReplay } from "./selection-replay.ts";

export interface ConfirmProposalDeps {
  readonly selections: OfficialMatchSelectionRepository;
  readonly results: OfficialResultRepository;
  readonly associations: EncounterCandidateAssociationRepository;
  readonly providerMatches: ProviderMatchReaderPort;
  readonly eventPublisher: EventPublisherPort;
  readonly ids: IdGeneratorPort;
  readonly clock: ClockPort;
}

export type ConfirmProposalError =
  | ProviderMatchSnapshotMissing
  | CandidateNotAssociated
  | SelectionVersionConflict
  | CommandKeyReused
  | ReferenceAlreadyClaimed;

/**
 * The rival Team agrees with the proposal on the table. Records `confirmed` and,
 * when nothing blocks it, `approved` in the same commit; a blocking integrity
 * flag sends the case to `organizer_review` instead. Eligibility is re-checked
 * at the write, so a candidate that lost it since the proposal fails here.
 */
export async function confirmProposal(
  deps: ConfirmProposalDeps,
  input: {
    readonly encounter: EncounterScheduleSnapshot;
    readonly selection: OfficialMatchSelection;
    readonly proposal: OfficialSelectionProposal;
    readonly actorId: ActorId;
    readonly teamId: TeamId;
    readonly commandKey: string;
    readonly fingerprint: string;
  },
): Promise<Result<OfficialSelectionCommandOutput, ConfirmProposalError>> {
  const { encounter, selection, proposal } = input;
  const snapshots = await snapshotProposal(deps.providerMatches, proposal);
  if (!snapshots.ok) return err(snapshots.error);

  const now = deps.clock.now();
  const approves = snapshots.flags.length === 0;
  const nextVersion = selection.version + 1;
  const context = {
    ids: deps.ids,
    clock: deps.clock,
    organizationId: encounter.organizationId,
    competitionId: encounter.competitionId,
    encounterId: encounter.encounterId,
    actor: { capacity: "team", actorId: input.actorId, teamId: input.teamId } as const,
    commandKey: input.commandKey,
    fingerprint: input.fingerprint,
  };
  const latest = await deps.results.findLatestByEncounter(encounter.encounterId);
  const result: OfficialResult | null = approves
    ? buildApprovedResult({
        id: deps.ids.generate(),
        encounter,
        previousRevision: latest?.revision ?? 0,
        slots: snapshots.slots,
        approvedAt: now,
        approvedBy: input.actorId,
        selectionId: selection.id,
        proposalId: proposal.id,
        basis: "team_agreement",
      })
    : null;
  const finalStatus = approves ? "approved" : "organizer_review";
  const actions = [
    buildAction(context, {
      type: "confirmed",
      selectionId: selection.id,
      proposalId: proposal.id,
      fromStatus: selection.status,
      toStatus: "confirmed",
      versionBefore: selection.version,
      versionAfter: nextVersion,
      occurredAt: now,
    }),
    approves
      ? buildAction(context, {
          type: "approved",
          selectionId: selection.id,
          proposalId: proposal.id,
          fromStatus: "confirmed",
          toStatus: "approved",
          versionBefore: nextVersion,
          versionAfter: nextVersion,
          officialResultId: result?.id ?? null,
          occurredAt: now,
        })
      : buildAction(context, {
          type: "integrity_review_required",
          selectionId: selection.id,
          proposalId: proposal.id,
          fromStatus: "confirmed",
          toStatus: "organizer_review",
          versionBefore: nextVersion,
          versionAfter: nextVersion,
          details: { integrityFlags: snapshots.flags },
          occurredAt: now,
        }),
  ];
  const nextSelection: OfficialMatchSelection = {
    ...selection,
    status: finalStatus,
    version: nextVersion,
    updatedAt: now,
  };
  const transition: SelectionTransition = {
    expectedVersion: selection.version,
    selection: nextSelection,
    newProposals: [],
    actions,
    dispute: null,
    references: { acquire: [], release: "none" },
  };

  const refs = selectionReferences(proposal.slots);
  const persisted = await deps.associations.writeIfEligible(
    encounter.organizationId,
    encounter.encounterId,
    refs,
    async () => {
      const committed = await deps.selections.commitTransition(transition);
      if (committed.status === "committed" && result) await deps.results.append(result);
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
    return conflictOrReplay(deps, {
      encounterId: encounter.encounterId,
      actorId: input.actorId,
      commandKey: input.commandKey,
      fingerprint: input.fingerprint,
      expectedVersion: selection.version,
      currentVersion: committed.currentVersion,
    });
  }
  if (committed.status === "reference_claimed") {
    return err(
      new ReferenceAlreadyClaimed({
        code: "results.reference_already_claimed",
        message: "The provider match is already claimed by another official match",
        providerKey: committed.providerMatchRef.providerKey,
        externalId: committed.providerMatchRef.externalId,
      }),
    );
  }

  await deps.eventPublisher.publish({
    eventName: "results.official-selection-confirmed",
    occurredAt: now.toISOString(),
    payload: {
      encounterId: encounter.encounterId,
      organizationId: encounter.organizationId,
      competitionId: encounter.competitionId,
      selectionId: selection.id,
      proposalId: proposal.id,
      version: nextVersion,
    },
  });
  if (result) {
    await deps.eventPublisher.publish({
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
  }
  return ok({
    selection: nextSelection,
    proposal,
    actions,
    dispute: null,
    approvedResult: result,
    integrityFlags: snapshots.flags,
    replayed: false,
  });
}
