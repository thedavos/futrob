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
import type {
  OfficialMatchSelection,
  OfficialSelectionProposal,
} from "../../domain/entities/official-match-selection.ts";
import {
  ReferenceAlreadyClaimed,
  type ProposeOfficialSelectionError,
} from "../../domain/errors/official-selection.errors.ts";
import {
  CandidateNotAssociated,
  DuplicateProviderMatch,
  EncounterNotFound,
  InvalidSelection,
  OfficialSelectionForbidden,
} from "../../domain/errors/select-official-matches.errors.ts";
import type { EncounterCandidateAssociationRepository } from "../../domain/ports/encounter-candidate-association.repository.ts";
import type { EncounterReaderPort } from "../../domain/ports/encounter-reader.port.ts";
import type {
  OfficialMatchSelectionRepository,
  OfficialResultRepository,
} from "../../domain/ports/official-result.repository.ts";
import type { TeamRepresentationPort } from "../../domain/ports/team-representation.port.ts";
import { RESULT_PERMISSION } from "../../domain/policies/result-permissions.ts";
import {
  normalizeSlotSelection,
  selectionReferences,
} from "../../domain/policies/slot-selection.ts";
import {
  protectOfficialSelectionCommandOutput,
  type OfficialSelectionCommandOutput,
} from "../official-selection-output.ts";
import {
  authorizeTeamActor,
  buildAction,
  commandFingerprint,
  rawSlotsKey,
  statusConflict,
  versionConflict,
} from "../selection-command-support.ts";
import { conflictOrReplay, lookupReplay, replayOutput } from "../selection-replay.ts";

export interface SelectOfficialMatchesInput {
  readonly actorId: ActorId;
  readonly organizationId: OrganizationId;
  readonly encounterId: EncounterId;
  /** Team the actor speaks for; verified against rosters on the server. */
  readonly actingTeamId: TeamId;
  readonly selections: ReadonlyArray<{
    readonly officialSlot: 1 | 2;
    readonly providerMatchRef: ExternalReference;
  }>;
  /** Version of the selection the caller read; `0` when none exists yet. */
  readonly expectedVersion: number;
  /** Client-chosen key that makes a retry return the original outcome. */
  readonly commandKey: string;
}

/**
 * A Team puts forward a complete selection and consents to it. The rival then
 * confirms, rejects or answers with an alternative. Proposing never approves
 * and cannot replace a proposal that is still pending.
 */
export class SelectOfficialMatchesUseCase {
  constructor(
    private readonly deps: {
      readonly encounterReader: EncounterReaderPort;
      readonly selections: OfficialMatchSelectionRepository;
      readonly results: Pick<OfficialResultRepository, "findById">;
      readonly associations: EncounterCandidateAssociationRepository;
      readonly teamRepresentation: TeamRepresentationPort;
      readonly eventPublisher: EventPublisherPort;
      readonly authorization: AuthorizationPort;
      readonly ids: IdGeneratorPort;
      readonly clock: ClockPort;
    },
  ) {}

  async execute(
    input: SelectOfficialMatchesInput,
  ): Promise<Result<OfficialSelectionCommandOutput, ProposeOfficialSelectionError>> {
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

    const allowed = await authorizeTeamActor(this.deps, {
      actorId: input.actorId,
      actingTeamId: input.actingTeamId,
      encounter,
      permission: RESULT_PERMISSION.officialSelectionPropose,
    });
    if (!allowed) {
      return err(
        new OfficialSelectionForbidden({
          code: "results.official_selection_forbidden",
          message: "The actor cannot propose an official selection for this team and encounter",
        }),
      );
    }

    const fingerprint = commandFingerprint([
      "propose",
      input.actingTeamId,
      input.expectedVersion,
      rawSlotsKey(input.selections),
    ]);
    const replay = await lookupReplay(this.deps.selections, { ...input, fingerprint });
    if (replay.kind === "reused") return err(replay.error);
    if (replay.kind === "replay") {
      const output = await replayOutput(this.deps, input.encounterId, replay.actions);
      if (output) return ok(output);
    }

    const current = await this.deps.selections.findLatestByEncounter(input.encounterId);
    const currentVersion = current?.version ?? 0;
    if (input.expectedVersion !== currentVersion) {
      return err(versionConflict(input.expectedVersion, currentVersion));
    }
    const conflict = statusConflict(current, "propose", input.encounterId);
    if (conflict) return err(conflict);

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

    const now = this.deps.clock.now();
    const round = current ? (current.status === "voided" ? current.round + 1 : current.round) : 1;
    const selectionId = current?.id ?? this.deps.ids.generate();
    const priorProposals = current ? await this.deps.selections.listProposals(current.id) : [];
    const proposal: OfficialSelectionProposal = {
      id: this.deps.ids.generate(),
      selectionId,
      organizationId: encounter.organizationId,
      competitionId: encounter.competitionId,
      encounterId: encounter.encounterId,
      round,
      sequence: priorProposals.reduce((max, row) => Math.max(max, row.sequence), 0) + 1,
      proposingTeamId: input.actingTeamId,
      proposedByActorId: input.actorId,
      slots: normalized.slots,
      supersedesProposalId: null,
      reason: null,
      createdAt: now,
    };
    const nextVersion = currentVersion + 1;
    const selection: OfficialMatchSelection = {
      id: selectionId,
      encounterId: encounter.encounterId,
      organizationId: encounter.organizationId,
      competitionId: encounter.competitionId,
      status: "awaiting_opponent_confirmation",
      version: nextVersion,
      round,
      currentProposalId: proposal.id,
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
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
      type: "proposed",
      selectionId,
      proposalId: proposal.id,
      fromStatus: current?.status ?? null,
      toStatus: "awaiting_opponent_confirmation",
      versionBefore: currentVersion,
      versionAfter: nextVersion,
      occurredAt: now,
    });

    const refs = selectionReferences(normalized.slots);
    const persisted = await this.deps.associations.writeIfEligible(
      encounter.organizationId,
      encounter.encounterId,
      refs,
      () =>
        this.deps.selections.commitTransition({
          expectedVersion: currentVersion,
          selection,
          newProposals: [proposal],
          actions: [action],
          dispute: null,
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
        expectedVersion: currentVersion,
        currentVersion: committed.currentVersion,
      });
    }
    if (committed.status === "reference_claimed") {
      await this.deps.selections.recordAudit(
        buildAction(context, {
          type: "reference_reuse_rejected",
          selectionId: current?.id ?? null,
          proposalId: null,
          fromStatus: current?.status ?? null,
          toStatus: current?.status ?? null,
          versionBefore: currentVersion,
          versionAfter: currentVersion,
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
      eventName: "results.official-matches-selected",
      occurredAt: now.toISOString(),
      payload: {
        encounterId: input.encounterId,
        organizationId: encounter.organizationId,
        competitionId: encounter.competitionId,
        selectionId,
        proposalId: proposal.id,
        version: nextVersion,
      },
    });
    return ok(
      protectOfficialSelectionCommandOutput({
        selection,
        proposal,
        actions: [action],
        dispute: null,
        approvedResult: null,
        integrityFlags: [],
        replayed: false,
      }),
    );
  }
}
