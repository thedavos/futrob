import type { ActorId, EncounterId, OrganizationId, TeamId } from "@futrob/shared-kernel";
import type { ConfirmationAction } from "../domain/entities/confirmation-action.ts";
import type {
  OfficialSelectionProposal,
  OfficialSlotSelection,
} from "../domain/entities/official-match-selection.ts";
import type { SelectionCommandDigestPort } from "../domain/ports/selection-command-digest.port.ts";
import { redactOptionalAuditReason } from "../domain/policies/audit-reason.ts";
import { slotSelectionKey } from "../domain/policies/slot-selection.ts";

interface CommandScope {
  readonly organizationId: OrganizationId;
  readonly encounterId: EncounterId;
  readonly actorId: ActorId;
}

type SemanticCommand = { readonly expectedVersion: number } & (
  | {
      readonly type: "propose";
      readonly actingTeamId: TeamId;
      readonly selections: readonly OfficialSlotSelection[];
    }
  | {
      readonly type: "confirm";
      readonly actingTeamId: TeamId;
      readonly proposalId: string;
    }
  | {
      readonly type: "reject";
      readonly actingTeamId: TeamId;
      readonly proposalId: string;
      readonly reason: string | null;
    }
  | {
      readonly type: "alternative";
      readonly actingTeamId: TeamId;
      readonly proposalId: string;
      readonly selections: readonly OfficialSlotSelection[];
      readonly reason: string | null;
    }
  | {
      readonly type: "open_dispute";
      readonly actingTeamId: TeamId;
      readonly reason: string | null;
    }
  | { readonly type: "review_dispute"; readonly reason: string | null }
  | {
      readonly type: "resolve_dispute";
      readonly decision:
        | {
            readonly type: "approve_proposal";
            readonly proposalId: string;
            readonly acknowledgeIntegrityFlags?: boolean;
          }
        | { readonly type: "return_to_selection" };
      readonly reason: string | null;
    }
);

export interface CommandFingerprint {
  readonly opaque: string;
  /** Only for reading historical receipts; never persisted or served. */
  readonly legacy: string;
  readonly command: SemanticCommand;
  readonly scope: CommandScope;
}

function canonicalSlots(slots: readonly OfficialSlotSelection[]) {
  return [...slots]
    .sort((left, right) => left.officialSlot - right.officialSlot)
    .map(({ officialSlot, providerMatchRef }) => [
      officialSlot,
      providerMatchRef.providerKey,
      providerMatchRef.externalId,
    ]);
}

export function commandFingerprint(
  digest: SelectionCommandDigestPort,
  scope: CommandScope,
  command: SemanticCommand,
): CommandFingerprint {
  let payload: readonly unknown[];
  let legacy: ReadonlyArray<string | number | null>;
  switch (command.type) {
    case "propose":
      payload = [command.actingTeamId, canonicalSlots(command.selections)];
      legacy = [
        command.type,
        command.actingTeamId,
        command.expectedVersion,
        slotSelectionKey(command.selections),
      ];
      break;
    case "confirm":
      payload = [command.actingTeamId, command.proposalId];
      legacy = [command.type, command.actingTeamId, command.proposalId, command.expectedVersion];
      break;
    case "reject":
      payload = [command.actingTeamId, command.proposalId, command.reason];
      legacy = [
        command.type,
        command.actingTeamId,
        command.proposalId,
        command.expectedVersion,
        command.reason ?? "",
      ];
      break;
    case "alternative":
      payload = [
        command.actingTeamId,
        command.proposalId,
        canonicalSlots(command.selections),
        command.reason,
      ];
      legacy = [
        command.type,
        command.actingTeamId,
        command.proposalId,
        command.expectedVersion,
        slotSelectionKey(command.selections),
        command.reason,
      ];
      break;
    case "open_dispute":
      payload = [command.actingTeamId, command.reason];
      legacy = [command.type, command.actingTeamId, command.expectedVersion, command.reason ?? ""];
      break;
    case "review_dispute":
      payload = [command.reason];
      legacy = [command.type, command.expectedVersion, command.reason];
      break;
    case "resolve_dispute": {
      const decision = command.decision;
      payload = [
        decision.type === "approve_proposal"
          ? [decision.type, decision.proposalId, decision.acknowledgeIntegrityFlags === true]
          : [decision.type],
        command.reason,
      ];
      legacy = [
        command.type,
        command.expectedVersion,
        decision.type,
        decision.type === "approve_proposal" ? decision.proposalId : null,
        decision.type === "approve_proposal"
          ? String(decision.acknowledgeIntegrityFlags === true)
          : null,
        command.reason ?? "",
      ];
      break;
    }
  }
  const canonical = JSON.stringify([
    "results.selection-command",
    scope.organizationId,
    scope.encounterId,
    scope.actorId,
    command.type,
    command.expectedVersion,
    ...payload,
  ]);
  return {
    opaque: `sha256:${digest.sha256(canonical)}`,
    legacy: legacy.map((part) => (part === null ? "-" : String(part))).join("|"),
    command,
    scope,
  };
}

/** Legacy delimiters lost structure. The append-only facts witness its typed fields. */
export function matchesLegacyCommand(
  fingerprint: CommandFingerprint,
  actions: readonly ConfirmationAction[],
  proposals: readonly OfficialSelectionProposal[],
): boolean {
  const first = actions[0];
  if (!first) return false;
  const { command, scope } = fingerprint;
  if (
    actions.some(
      (action) =>
        action.requestFingerprint !== fingerprint.legacy ||
        action.organizationId !== scope.organizationId ||
        action.encounterId !== scope.encounterId ||
        action.actorId !== scope.actorId,
    )
  )
    return false;
  if (first.versionBefore !== command.expectedVersion) return false;
  if ("actingTeamId" in command && first.teamId !== command.actingTeamId) return false;
  const proposal = proposals.find((row) => row.id === first.proposalId);
  switch (command.type) {
    case "propose":
      if (first.type !== "proposed") return false;
      break;
    case "confirm":
      if (first.type !== "confirmed" || first.proposalId !== command.proposalId) return false;
      break;
    case "reject":
      if (first.type !== "rejected" || first.proposalId !== command.proposalId) return false;
      break;
    case "alternative":
      if (first.type === "confirmed") {
        if (first.proposalId !== command.proposalId) return false;
        // Legacy used "-" for null and dropped equivalent alternatives' reasons.
        if (command.reason === null || command.reason === "-") return false;
      } else if (
        first.type !== "alternative_proposed" ||
        proposal?.supersedesProposalId !== command.proposalId
      )
        return false;
      break;
    case "open_dispute":
      if (first.type !== "dispute_opened") return false;
      break;
    case "review_dispute":
      if (first.type !== "review_started") return false;
      break;
    case "resolve_dispute":
      if (command.decision.type === "return_to_selection") {
        if (first.type !== "returned_to_selection") return false;
      } else if (
        first.type !== "dispute_resolved_approved" ||
        first.proposalId !== command.decision.proposalId
      )
        return false;
      break;
  }
  if (
    "selections" in command &&
    (!proposal ||
      JSON.stringify(canonicalSlots(command.selections)) !==
        JSON.stringify(canonicalSlots(proposal.slots)))
  )
    return false;
  if (
    "reason" in command &&
    first.type !== "confirmed" &&
    redactOptionalAuditReason(first.reason) !== redactOptionalAuditReason(command.reason)
  )
    return false;
  return true;
}
