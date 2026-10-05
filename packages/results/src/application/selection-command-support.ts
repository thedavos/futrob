import {
  err,
  ok,
  type ActorId,
  type AuthorizationPort,
  type ClockPort,
  type EncounterId,
  type IdGeneratorPort,
  type OrganizationId,
  type Result,
  type TeamId,
} from "@futrob/shared-kernel";
import type { ExternalReference, ProviderMatch } from "@futrob/game-data";
import type {
  ConfirmationAction,
  ConfirmationActionDetails,
  ConfirmationActionType,
  ConfirmationCapacity,
} from "../domain/entities/confirmation-action.ts";
import type { MatchDispute } from "../domain/entities/match-dispute.ts";
import type {
  OfficialMatchSelection,
  OfficialSelectionProposal,
} from "../domain/entities/official-match-selection.ts";
import type {
  OfficialResult,
  OfficialResultApprovalBasis,
  OfficialResultSlotSnapshot,
} from "../domain/entities/official-result.ts";
import {
  ReasonRequired,
  SelectionAlreadyApproved,
  SelectionProposalStale,
  SelectionStateConflict,
  SelectionVersionConflict,
} from "../domain/errors/official-selection.errors.ts";
import { ProviderMatchSnapshotMissing } from "../domain/errors/official-result.errors.ts";
import type { EncounterScheduleSnapshot } from "../domain/ports/encounter-reader.port.ts";
import type { ProviderMatchReaderPort } from "../domain/ports/provider-match-reader.port.ts";
import type { TeamRepresentationPort } from "../domain/ports/team-representation.port.ts";
import { integrityFlagsFor, type IntegrityFlag } from "../domain/policies/integrity-flags.ts";
import { redactOptionalAuditReason } from "../domain/policies/audit-reason.ts";
import { RESULT_PERMISSION } from "../domain/policies/result-permissions.ts";
import {
  canApplySelectionCommand,
  type SelectionCommand,
} from "../domain/policies/selection-transitions.ts";
import { slotSelectionKey } from "../domain/policies/slot-selection.ts";

export type SelectionActor =
  | { readonly capacity: "team"; readonly actorId: ActorId; readonly teamId: TeamId }
  | { readonly capacity: "operator"; readonly actorId: ActorId };

/** Trimmed reason, or null when it is missing or blank. */
export function normalizeReason(reason: string | null | undefined): string | null {
  const trimmed = reason?.trim();
  return trimmed ? trimmed : null;
}

export function requireReason(
  reason: string | null | undefined,
  field: string,
): Result<string, ReasonRequired> {
  const normalized = normalizeReason(reason);
  if (normalized) return ok(normalized);
  return err(
    new ReasonRequired({
      code: "results.reason_required",
      message: `A reason is required (${field})`,
    }),
  );
}

/** Stable text describing what a command asked for; a replay must match it exactly. */
export function commandFingerprint(parts: ReadonlyArray<string | number | null>): string {
  return parts.map((part) => (part === null ? "-" : String(part))).join("|");
}

export function rawSlotsKey(
  selections: ReadonlyArray<{
    readonly officialSlot: 1 | 2;
    readonly providerMatchRef: ExternalReference;
  }>,
): string {
  return slotSelectionKey(selections);
}

/** The Team must play the Encounter, be represented by the actor and be allowed by policy. */
export async function authorizeTeamActor(
  deps: {
    readonly authorization: AuthorizationPort;
    readonly teamRepresentation: TeamRepresentationPort;
  },
  input: {
    readonly actorId: ActorId;
    readonly actingTeamId: TeamId;
    readonly encounter: EncounterScheduleSnapshot;
    readonly permission:
      | typeof RESULT_PERMISSION.officialSelectionPropose
      | typeof RESULT_PERMISSION.officialSelectionResolve;
  },
): Promise<boolean> {
  const { encounter, actingTeamId } = input;
  if (actingTeamId !== encounter.homeTeamId && actingTeamId !== encounter.awayTeamId) {
    return false;
  }
  const representation = await deps.teamRepresentation.findRepresentation({
    actorId: input.actorId,
    organizationId: encounter.organizationId,
    competitionId: encounter.competitionId,
    teamId: actingTeamId,
  });
  if (!representation) return false;
  const decision = await deps.authorization.decide({
    actorId: input.actorId,
    permission: input.permission,
    scope: {
      organizationId: encounter.organizationId,
      competitionId: encounter.competitionId,
      teamId: actingTeamId,
      encounterId: encounter.encounterId,
    },
  });
  return decision.allowed;
}

/** Administrative authority is the explicit `results.approve` capability on the Encounter. */
export async function authorizeOperator(
  deps: { readonly authorization: AuthorizationPort },
  input: { readonly actorId: ActorId; readonly encounter: EncounterScheduleSnapshot },
): Promise<boolean> {
  const decision = await deps.authorization.decide({
    actorId: input.actorId,
    permission: RESULT_PERMISSION.resultApprove,
    scope: {
      organizationId: input.encounter.organizationId,
      competitionId: input.encounter.competitionId,
      encounterId: input.encounter.encounterId,
    },
  });
  return decision.allowed;
}

export function rivalTeamOf(
  encounter: EncounterScheduleSnapshot,
  teamId: string | null,
): TeamId | null {
  if (teamId === encounter.homeTeamId) return encounter.awayTeamId;
  if (teamId === encounter.awayTeamId) return encounter.homeTeamId;
  return null;
}

/** Rejects a command the current status does not accept, with the most specific error. */
export function statusConflict(
  selection: OfficialMatchSelection | null,
  command: SelectionCommand,
  encounterId: EncounterId,
): SelectionAlreadyApproved | SelectionStateConflict | null {
  const status = selection?.status ?? null;
  if (canApplySelectionCommand(status, command)) return null;
  if (status === "approved" && command !== "void") {
    return new SelectionAlreadyApproved({
      code: "results.selection_already_approved",
      message: "The selection is already approved and cannot be changed by this command",
      encounterId,
    });
  }
  return new SelectionStateConflict({
    code: "results.selection_state_conflict",
    message: `Selection status ${status ?? "none"} does not accept ${command}`,
    command,
    status,
  });
}

/** An approved selection is protected: report that before any staleness. */
export function approvedGuard(
  selection: OfficialMatchSelection,
  command: SelectionCommand,
  encounterId: EncounterId,
): SelectionAlreadyApproved | null {
  if (selection.status !== "approved" || command === "void") return null;
  return new SelectionAlreadyApproved({
    code: "results.selection_already_approved",
    message: "The selection is already approved and cannot be changed by this command",
    encounterId,
  });
}

export function versionConflict(
  expectedVersion: number,
  currentVersion: number,
): SelectionVersionConflict {
  return new SelectionVersionConflict({
    code: "results.selection_version_conflict",
    message: "The selection changed since it was read",
    expectedVersion,
    currentVersion,
  });
}

export function staleProposal(proposalId: string): SelectionProposalStale {
  return new SelectionProposalStale({
    code: "results.selection_proposal_stale",
    message: "The proposal is no longer the one awaiting a response",
    proposalId,
  });
}

export interface ActionFactoryContext {
  readonly ids: IdGeneratorPort;
  readonly clock: ClockPort;
  readonly organizationId: OrganizationId;
  readonly competitionId: EncounterScheduleSnapshot["competitionId"];
  readonly encounterId: EncounterId;
  readonly actor: SelectionActor;
  readonly commandKey: string | null;
  readonly fingerprint: string | null;
}

export function buildAction(
  context: ActionFactoryContext,
  input: {
    readonly type: ConfirmationActionType;
    readonly selectionId: string | null;
    readonly proposalId: string | null;
    readonly fromStatus: ConfirmationAction["fromStatus"];
    readonly toStatus: ConfirmationAction["toStatus"];
    readonly versionBefore: number;
    readonly versionAfter: number;
    readonly reason?: string | null;
    readonly officialResultId?: string | null;
    readonly details?: ConfirmationActionDetails | null;
    readonly capacity?: ConfirmationCapacity;
    readonly occurredAt?: Date;
    /** Audit-only entries pass `null` so they never look like a replayable command. */
    readonly commandKey?: string | null;
  },
): ConfirmationAction {
  return {
    id: context.ids.generate(),
    selectionId: input.selectionId,
    proposalId: input.proposalId,
    organizationId: context.organizationId,
    competitionId: context.competitionId,
    encounterId: context.encounterId,
    type: input.type,
    fromStatus: input.fromStatus,
    toStatus: input.toStatus,
    versionBefore: input.versionBefore,
    versionAfter: input.versionAfter,
    actorId: context.actor.actorId,
    teamId: context.actor.capacity === "team" ? context.actor.teamId : null,
    capacity: input.capacity ?? context.actor.capacity,
    reason: redactOptionalAuditReason(input.reason ?? null),
    commandKey: input.commandKey === undefined ? context.commandKey : input.commandKey,
    requestFingerprint: input.commandKey === null ? null : context.fingerprint,
    officialResultId: input.officialResultId ?? null,
    details: input.details ?? null,
    occurredAt: input.occurredAt ?? context.clock.now(),
  };
}

export type ProposalSnapshots =
  | {
      readonly ok: true;
      readonly slots: readonly OfficialResultSlotSnapshot[];
      readonly flags: readonly IntegrityFlag[];
    }
  | { readonly ok: false; readonly error: ProviderMatchSnapshotMissing };

/** Reads every selected match from the provider and derives the integrity flags. */
export async function snapshotProposal(
  providerMatches: ProviderMatchReaderPort,
  proposal: OfficialSelectionProposal,
): Promise<ProposalSnapshots> {
  const slots: OfficialResultSlotSnapshot[] = [];
  const entries: Array<{ providerMatchRef: ExternalReference; match: ProviderMatch }> = [];
  for (const slot of proposal.slots) {
    const match = await providerMatches.getByExternalRef(slot.providerMatchRef);
    if (!match) {
      return {
        ok: false,
        error: new ProviderMatchSnapshotMissing({
          code: "results.provider_match_snapshot_missing",
          message: "Selected provider match is not available for snapshot",
          externalId: slot.providerMatchRef.externalId,
        }),
      };
    }
    entries.push({ providerMatchRef: slot.providerMatchRef, match });
    slots.push({
      officialSlot: slot.officialSlot,
      providerMatchRef: slot.providerMatchRef,
      homeExternalClubId: match.home.externalClubId,
      awayExternalClubId: match.away.externalClubId,
      homeGoals: match.home.goals,
      awayGoals: match.away.goals,
      occurredAt: match.occurredAt,
      gameEdition: match.game.edition,
      platform: match.game.platform,
      players: match.players,
    });
  }
  return { ok: true, slots, flags: integrityFlagsFor(entries) };
}

export function buildApprovedResult(input: {
  readonly id: string;
  readonly encounter: EncounterScheduleSnapshot;
  readonly previousRevision: number;
  readonly slots: readonly OfficialResultSlotSnapshot[];
  readonly approvedAt: Date;
  readonly approvedBy: ActorId;
  readonly selectionId: string;
  readonly proposalId: string;
  readonly basis: OfficialResultApprovalBasis;
}): OfficialResult {
  return {
    id: input.id,
    encounterId: input.encounter.encounterId,
    organizationId: input.encounter.organizationId,
    competitionId: input.encounter.competitionId,
    revision: input.previousRevision + 1,
    status: "approved",
    slots: input.slots,
    approvedAt: input.approvedAt,
    approvedBy: input.approvedBy,
    selectionId: input.selectionId,
    proposalId: input.proposalId,
    approvalBasis: input.basis,
  };
}

export function activeDispute(disputes: readonly MatchDispute[]): MatchDispute | null {
  const last = disputes.at(-1);
  return last && last.status !== "resolved" ? last : null;
}
