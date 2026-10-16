import type { OfficialSelectionViewDto } from "@futrob/api-contracts";
import {
  assignCandidate,
  clearSlot,
  NO_ASSIGNMENTS,
  type OfficialSlot,
  type SlotAssignments,
  type SlotSelection,
} from "./encounter-preview.ts";
import {
  commandDraftReducer,
  currentProposalOf,
  emptyDraft,
  type CommandDraft,
  type CommandEvent,
} from "./selection-draft.ts";

/** Commands a Team representative can issue; operator commands never reach this panel. */
export const TEAM_COMMANDS = [
  "propose",
  "confirm",
  "reject",
  "propose_alternative",
  "open_dispute",
] as const;
export type TeamCommand = (typeof TEAM_COMMANDS)[number];

export type ReasonCommand = Extract<TeamCommand, "reject" | "propose_alternative" | "open_dispute">;

const RESPONSES: readonly TeamCommand[] = ["confirm", "reject", "propose_alternative"];

export type TeamIntent =
  | { readonly kind: "propose"; readonly selections: readonly SlotSelection[] }
  | { readonly kind: "confirm"; readonly proposalId: string }
  | { readonly kind: "reject"; readonly proposalId: string; readonly reason: string }
  | {
      readonly kind: "propose_alternative";
      readonly proposalId: string;
      readonly selections: readonly SlotSelection[];
      readonly reason: string;
    }
  | { readonly kind: "open_dispute"; readonly reason: string };

export type TeamInput = {
  /** Slot choices: the draft that `propose` and `propose_alternative` send. */
  readonly assignments: SlotAssignments;
  readonly reasons: Readonly<Record<ReasonCommand, string>>;
};

export type TeamEdit =
  | { readonly type: "assign"; readonly slot: OfficialSlot; readonly key: string }
  | { readonly type: "clear_slot"; readonly slot: OfficialSlot }
  | { readonly type: "edit_reason"; readonly command: ReasonCommand; readonly text: string };

export type TeamDraft = CommandDraft<TeamCommand, TeamIntent, TeamInput>;
export type TeamDraftEvent = CommandEvent<TeamCommand, TeamIntent, TeamEdit>;

const EMPTY_INPUT: TeamInput = {
  assignments: NO_ASSIGNMENTS,
  reasons: { reject: "", propose_alternative: "", open_dispute: "" },
};

export const EMPTY_TEAM_DRAFT: TeamDraft = emptyDraft(EMPTY_INPUT);

export const teamDraftReducer = commandDraftReducer<TeamCommand, TeamIntent, TeamInput, TeamEdit>(
  EMPTY_INPUT,
  (input, edit) => {
    switch (edit.type) {
      case "assign":
        return { ...input, assignments: assignCandidate(input.assignments, edit.slot, edit.key) };
      case "clear_slot":
        return { ...input, assignments: clearSlot(input.assignments, edit.slot) };
      case "edit_reason":
        return { ...input, reasons: { ...input.reasons, [edit.command]: edit.text } };
      default: {
        const exhaustive: never = edit;
        return exhaustive;
      }
    }
  },
);

/**
 * Team commands to offer: what the server allows, minus any answer to the acting
 * Team's own proposal. The server refuses those too; the guard keeps them off screen
 * even if `allowedActions` were wrong.
 */
export function teamCommandsFor(
  view: OfficialSelectionViewDto,
  actingTeamId: string,
): readonly TeamCommand[] {
  const proposer = currentProposalOf(view)?.proposingTeamId ?? null;
  return TEAM_COMMANDS.filter(
    (command) =>
      view.allowedActions.includes(command) &&
      (!RESPONSES.includes(command) || (proposer !== null && proposer !== actingTeamId)),
  );
}

export function needsReason(command: TeamCommand): command is ReasonCommand {
  return command === "reject" || command === "propose_alternative" || command === "open_dispute";
}

export function needsSlots(command: TeamCommand): boolean {
  return command === "propose" || command === "propose_alternative";
}

export type TeamIntentCheck =
  | { readonly ok: true; readonly intent: TeamIntent }
  | { readonly ok: false; readonly missing: "slots" | "reason" | "proposal" };

/** Builds the intent from what the user entered, or names the first missing input. */
export function buildTeamIntent(
  command: TeamCommand,
  input: {
    readonly proposalId: string | null;
    readonly selections: readonly SlotSelection[] | null;
    readonly reason: string;
  },
): TeamIntentCheck {
  const reason = input.reason.trim();
  if (needsSlots(command) && !input.selections) return { ok: false, missing: "slots" };
  if (needsReason(command) && !reason) return { ok: false, missing: "reason" };
  const proposalId = input.proposalId;
  const selections = input.selections ?? [];
  switch (command) {
    case "propose":
      return { ok: true, intent: { kind: "propose", selections } };
    case "open_dispute":
      return { ok: true, intent: { kind: "open_dispute", reason } };
    case "confirm":
      return proposalId
        ? { ok: true, intent: { kind: "confirm", proposalId } }
        : { ok: false, missing: "proposal" };
    case "reject":
      return proposalId
        ? { ok: true, intent: { kind: "reject", proposalId, reason } }
        : { ok: false, missing: "proposal" };
    case "propose_alternative":
      return proposalId
        ? { ok: true, intent: { kind: "propose_alternative", proposalId, selections, reason } }
        : { ok: false, missing: "proposal" };
    default: {
      const exhaustive: never = command;
      return exhaustive;
    }
  }
}
