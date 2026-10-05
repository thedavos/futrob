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
  type TeamId,
} from "@futrob/shared-kernel";
import type { MatchDispute } from "../../domain/entities/match-dispute.ts";
import type { OfficialMatchSelection } from "../../domain/entities/official-match-selection.ts";
import { redactAuditReason } from "../../domain/policies/audit-reason.ts";
import type { RejectOfficialSelectionError } from "../../domain/errors/official-selection.errors.ts";
import type { EncounterReaderPort } from "../../domain/ports/encounter-reader.port.ts";
import type { SelectionCommandDigestPort } from "../../domain/ports/selection-command-digest.port.ts";
import { commandFingerprint } from "../command-fingerprint.ts";
import type {
  OfficialMatchSelectionRepository,
  OfficialResultRepository,
} from "../../domain/ports/official-result.repository.ts";
import type { TeamRepresentationPort } from "../../domain/ports/team-representation.port.ts";
import {
  protectOfficialSelectionCommandOutput,
  type OfficialSelectionCommandOutput,
} from "../official-selection-output.ts";
import { buildAction, requireReason } from "../selection-command-support.ts";
import { conflictOrReplay } from "../selection-replay.ts";
import { prepareTeamResponse } from "../team-response-support.ts";

export interface RejectOfficialSelectionInput {
  readonly actorId: ActorId;
  readonly organizationId: OrganizationId;
  readonly encounterId: EncounterId;
  readonly actingTeamId: TeamId;
  readonly proposalId: string;
  readonly expectedVersion: number;
  readonly reason: string;
  readonly commandKey: string;
}

/**
 * The rival Team refuses the pending proposal. The case becomes `disputed`
 * with a dispute on file; the proposal and the reason are kept and nothing
 * becomes official.
 */
export class RejectOfficialSelectionUseCase {
  constructor(
    private readonly deps: {
      readonly encounterReader: EncounterReaderPort;
      readonly commandDigest: SelectionCommandDigestPort;
      readonly selections: OfficialMatchSelectionRepository;
      readonly results: Pick<OfficialResultRepository, "findById">;
      readonly teamRepresentation: TeamRepresentationPort;
      readonly eventPublisher: EventPublisherPort;
      readonly authorization: AuthorizationPort;
      readonly ids: IdGeneratorPort;
      readonly clock: ClockPort;
    },
  ) {}

  async execute(
    input: RejectOfficialSelectionInput,
  ): Promise<Result<OfficialSelectionCommandOutput, RejectOfficialSelectionError>> {
    const reason = requireReason(input.reason, "reason");
    const fingerprint = commandFingerprint(this.deps.commandDigest, input, {
      type: "reject",
      actingTeamId: input.actingTeamId,
      proposalId: input.proposalId,
      expectedVersion: input.expectedVersion,
      reason: reason.isOk() ? reason.value : null,
    });
    const prepared = await prepareTeamResponse(this.deps, {
      ...input,
      command: "reject",
      fingerprint,
    });
    if (prepared.isErr()) return err(prepared.error);
    if (prepared.value.kind === "replay") return ok(prepared.value.output);
    if (reason.isErr()) return err(reason.error);
    const auditReason = redactAuditReason(reason.value);

    const { encounter, selection, proposal } = prepared.value;
    const now = prepared.value.evaluatedAt;
    const nextVersion = selection.version + 1;
    const nextSelection: OfficialMatchSelection = {
      ...selection,
      status: "disputed",
      version: nextVersion,
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
      openedReason: auditReason,
      openedAt: now,
      reviewStartedByActorId: null,
      reviewStartedAt: null,
      resolvedByActorId: null,
      resolvedAt: null,
      resolution: null,
      resolutionProposalId: null,
      resolutionReason: null,
    };
    const action = buildAction(
      {
        ids: this.deps.ids,
        clock: this.deps.clock,
        organizationId: encounter.organizationId,
        competitionId: encounter.competitionId,
        encounterId: encounter.encounterId,
        actor: { capacity: "team", actorId: input.actorId, teamId: input.actingTeamId },
        commandKey: input.commandKey,
        fingerprint,
      },
      {
        type: "rejected",
        selectionId: selection.id,
        proposalId: proposal.id,
        fromStatus: selection.status,
        toStatus: "disputed",
        versionBefore: selection.version,
        versionAfter: nextVersion,
        reason: auditReason,
        details: { disputeId: dispute.id },
        occurredAt: now,
      },
    );
    const committed = await this.deps.selections.commitTransition({
      expectedVersion: selection.version,
      selection: nextSelection,
      newProposals: [],
      actions: [action],
      dispute: { kind: "open", dispute },
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
      throw new Panic("A rejection never acquires references");
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
    return ok(
      protectOfficialSelectionCommandOutput({
        selection: nextSelection,
        proposal,
        actions: [action],
        dispute,
        approvedResult: null,
        integrityFlags: [],
        replayed: false,
      }),
    );
  }
}
