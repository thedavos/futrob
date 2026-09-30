import {
  err,
  ok,
  type ActorId,
  type AuthorizationPort,
  type ClockPort,
  type EncounterId,
  type EventPublisherPort,
  type IdGeneratorPort,
  type OrganizationId,
  type Result,
  type TeamId,
} from "@futrob/shared-kernel";
import type { ExternalReference } from "@futrob/game-data";
import type { MatchDispute } from "../../domain/entities/match-dispute.ts";
import type {
  OfficialMatchSelection,
  OfficialSelectionProposal,
} from "../../domain/entities/official-match-selection.ts";
import {
  ReferenceAlreadyClaimed,
  type ProposeAlternativeOfficialSelectionError,
} from "../../domain/errors/official-selection.errors.ts";
import {
  CandidateNotAssociated,
  DuplicateProviderMatch,
  InvalidSelection,
} from "../../domain/errors/select-official-matches.errors.ts";
import type { EncounterCandidateAssociationRepository } from "../../domain/ports/encounter-candidate-association.repository.ts";
import type { EncounterReaderPort } from "../../domain/ports/encounter-reader.port.ts";
import type {
  OfficialMatchSelectionRepository,
  OfficialResultRepository,
} from "../../domain/ports/official-result.repository.ts";
import type { ProviderMatchReaderPort } from "../../domain/ports/provider-match-reader.port.ts";
import type { TeamRepresentationPort } from "../../domain/ports/team-representation.port.ts";
import {
  equivalentSlotSelections,
  normalizeSlotSelection,
  selectionReferences,
} from "../../domain/policies/slot-selection.ts";
import { confirmProposal } from "../confirm-proposal.ts";
import type { OfficialSelectionCommandOutput } from "../official-selection-output.ts";
import {
  buildAction,
  commandFingerprint,
  conflictOrReplay,
  rawSlotsKey,
  requireReason,
} from "../selection-command-support.ts";
import { prepareTeamResponse } from "../team-response-support.ts";

export interface ProposeAlternativeOfficialSelectionInput {
  readonly actorId: ActorId;
  readonly organizationId: OrganizationId;
  readonly encounterId: EncounterId;
  readonly actingTeamId: TeamId;
  /** Proposal being answered. */
  readonly proposalId: string;
  readonly expectedVersion: number;
  readonly selections: ReadonlyArray<{
    readonly officialSlot: 1 | 2;
    readonly providerMatchRef: ExternalReference;
  }>;
  readonly reason: string;
  readonly commandKey: string;
}

/**
 * The rival Team answers with its own complete selection. The same slot →
 * reference pairs (in any order) are a confirmation of the pending proposal;
 * anything else keeps both proposals on one dispute and approves neither.
 */
export class ProposeAlternativeOfficialSelectionUseCase {
  constructor(
    private readonly deps: {
      readonly encounterReader: EncounterReaderPort;
      readonly selections: OfficialMatchSelectionRepository;
      readonly results: OfficialResultRepository;
      readonly associations: EncounterCandidateAssociationRepository;
      readonly providerMatches: ProviderMatchReaderPort;
      readonly teamRepresentation: TeamRepresentationPort;
      readonly eventPublisher: EventPublisherPort;
      readonly authorization: AuthorizationPort;
      readonly ids: IdGeneratorPort;
      readonly clock: ClockPort;
    },
  ) {}

  async execute(
    input: ProposeAlternativeOfficialSelectionInput,
  ): Promise<Result<OfficialSelectionCommandOutput, ProposeAlternativeOfficialSelectionError>> {
    const fingerprint = commandFingerprint([
      "alternative",
      input.actingTeamId,
      input.proposalId,
      input.expectedVersion,
      rawSlotsKey(input.selections),
    ]);
    const prepared = await prepareTeamResponse(this.deps, {
      ...input,
      command: "propose_alternative",
      fingerprint,
    });
    if (prepared.isErr()) return err(prepared.error);
    if (prepared.value.kind === "replay") return ok(prepared.value.output);
    const { encounter, selection, proposal } = prepared.value;

    const normalized = normalizeSlotSelection(input.selections, encounter.officialMatchCount);
    if (!normalized.ok) {
      const { issue } = normalized;
      if (issue.kind === "duplicate_reference") {
        return err(
          new DuplicateProviderMatch({
            code: "results.duplicate_provider_match",
            message: "The same provider match cannot fill two official slots",
          }),
        );
      }
      return err(
        new InvalidSelection({
          code: "results.invalid_selection",
          message:
            issue.kind === "count"
              ? "Selection count must match official match slots"
              : "Selection must fill each official slot exactly once",
          expected: issue.expected,
          received: issue.kind === "count" ? issue.received : input.selections.length,
        }),
      );
    }

    if (equivalentSlotSelections(normalized.slots, proposal.slots)) {
      return confirmProposal(this.deps, {
        encounter,
        selection,
        proposal,
        actorId: input.actorId,
        teamId: input.actingTeamId,
        commandKey: input.commandKey,
        fingerprint,
      });
    }

    const reason = requireReason(input.reason, "reason");
    if (reason.isErr()) return err(reason.error);

    const now = this.deps.clock.now();
    const proposals = await this.deps.selections.listProposals(selection.id);
    const alternative: OfficialSelectionProposal = {
      id: this.deps.ids.generate(),
      selectionId: selection.id,
      organizationId: encounter.organizationId,
      competitionId: encounter.competitionId,
      encounterId: encounter.encounterId,
      round: selection.round,
      sequence: proposals.reduce((max, row) => Math.max(max, row.sequence), 0) + 1,
      proposingTeamId: input.actingTeamId,
      proposedByActorId: input.actorId,
      slots: normalized.slots,
      supersedesProposalId: proposal.id,
      reason: reason.value,
      createdAt: now,
    };
    const nextVersion = selection.version + 1;
    const nextSelection: OfficialMatchSelection = {
      ...selection,
      status: "disputed",
      version: nextVersion,
      currentProposalId: alternative.id,
      updatedAt: now,
    };
    const dispute: MatchDispute = {
      id: this.deps.ids.generate(),
      selectionId: selection.id,
      organizationId: encounter.organizationId,
      competitionId: encounter.competitionId,
      encounterId: encounter.encounterId,
      status: "open",
      openedByActorId: input.actorId,
      openedByTeamId: input.actingTeamId,
      openedReason: reason.value,
      openedAt: now,
      reviewStartedByActorId: null,
      reviewStartedAt: null,
      resolvedByActorId: null,
      resolvedAt: null,
      resolution: null,
      resolutionProposalId: null,
      resolutionReason: null,
    };
    const context = {
      ids: this.deps.ids,
      clock: this.deps.clock,
      organizationId: encounter.organizationId,
      competitionId: encounter.competitionId,
      encounterId: encounter.encounterId,
      actor: { capacity: "team", actorId: input.actorId, teamId: input.actingTeamId } as const,
      commandKey: input.commandKey,
      fingerprint,
    };
    const action = buildAction(context, {
      type: "alternative_proposed",
      selectionId: selection.id,
      proposalId: alternative.id,
      fromStatus: selection.status,
      toStatus: "disputed",
      versionBefore: selection.version,
      versionAfter: nextVersion,
      reason: reason.value,
      occurredAt: now,
    });

    const refs = selectionReferences(normalized.slots);
    const persisted = await this.deps.associations.writeIfEligible(
      encounter.organizationId,
      encounter.encounterId,
      refs,
      () =>
        this.deps.selections.commitTransition({
          expectedVersion: selection.version,
          selection: nextSelection,
          newProposals: [alternative],
          actions: [action],
          dispute: { kind: "open", dispute },
          references: { acquire: refs, release: "none" },
        }),
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
          proposalId: null,
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
      eventName: "results.match-dispute-opened",
      occurredAt: now.toISOString(),
      payload: {
        encounterId: encounter.encounterId,
        organizationId: encounter.organizationId,
        competitionId: encounter.competitionId,
        selectionId: selection.id,
        disputeId: dispute.id,
        version: nextVersion,
      },
    });
    return ok({
      selection: nextSelection,
      proposal: alternative,
      actions: [action],
      dispute,
      approvedResult: null,
      integrityFlags: [],
      replayed: false,
    });
  }
}
