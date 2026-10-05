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
import { SelectionNotFound } from "../../domain/errors/official-result.errors.ts";
import type { OpenMatchDisputeError } from "../../domain/errors/official-selection.errors.ts";
import {
  EncounterNotFound,
  OfficialSelectionForbidden,
} from "../../domain/errors/select-official-matches.errors.ts";
import type { EncounterReaderPort } from "../../domain/ports/encounter-reader.port.ts";
import type {
  OfficialMatchSelectionRepository,
  OfficialResultRepository,
} from "../../domain/ports/official-result.repository.ts";
import type { TeamRepresentationPort } from "../../domain/ports/team-representation.port.ts";
import { RESULT_PERMISSION } from "../../domain/policies/result-permissions.ts";
import { isUnderDispute } from "../../domain/policies/selection-transitions.ts";
import {
  protectOfficialSelectionCommandOutput,
  type OfficialSelectionCommandOutput,
} from "../official-selection-output.ts";
import {
  activeDispute,
  authorizeTeamActor,
  buildAction,
  commandFingerprint,
  requireReason,
  statusConflict,
  approvedGuard,
  versionConflict,
} from "../selection-command-support.ts";
import { conflictOrReplay, lookupReplay, replayOutput } from "../selection-replay.ts";

export interface OpenMatchDisputeInput {
  readonly actorId: ActorId;
  readonly organizationId: OrganizationId;
  readonly encounterId: EncounterId;
  /** Either participating Team may open a dispute while the proposal is pending. */
  readonly actingTeamId: TeamId;
  readonly expectedVersion: number;
  readonly reason: string;
  readonly commandKey: string;
}

/**
 * Explicit dispute over a pending proposal. Opening is idempotent: once the case
 * is disputed or under review, asking again returns the existing dispute and
 * writes no second opening fact.
 */
export class OpenMatchDisputeUseCase {
  constructor(
    private readonly deps: {
      readonly encounterReader: EncounterReaderPort;
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
    input: OpenMatchDisputeInput,
  ): Promise<Result<OfficialSelectionCommandOutput, OpenMatchDisputeError>> {
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
          message: "The actor cannot open a dispute for this team and encounter",
        }),
      );
    }

    const reason = requireReason(input.reason, "reason");
    const fingerprint = commandFingerprint([
      "open_dispute",
      input.actingTeamId,
      input.expectedVersion,
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
          message: "No official selection to dispute",
          encounterId: input.encounterId,
        }),
      );
    }
    if (isUnderDispute(selection.status)) {
      const disputes = await this.deps.selections.listDisputes(selection.id);
      const proposals = await this.deps.selections.listProposals(selection.id);
      return ok(
        protectOfficialSelectionCommandOutput({
          selection,
          proposal: proposals.find((row) => row.id === selection.currentProposalId) ?? null,
          actions: [],
          dispute: activeDispute(disputes),
          approvedResult: null,
          integrityFlags: [],
          replayed: true,
        }),
      );
    }
    const approved = approvedGuard(selection, "open_dispute", input.encounterId);
    if (approved) return err(approved);
    if (selection.version !== input.expectedVersion) {
      return err(versionConflict(input.expectedVersion, selection.version));
    }
    const conflict = statusConflict(selection, "open_dispute", input.encounterId);
    if (conflict) return err(conflict);

    const now = this.deps.clock.now();
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
        type: "dispute_opened",
        selectionId: selection.id,
        proposalId: selection.currentProposalId,
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
      throw new Panic("Opening a dispute never acquires references");
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
