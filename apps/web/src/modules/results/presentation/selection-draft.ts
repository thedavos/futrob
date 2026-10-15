import type { OfficialSelectionViewDto } from "@futrob/api-contracts";
import {
  assignCandidate,
  clearSlot,
  NO_ASSIGNMENTS,
  type OfficialSlot,
  type SlotAssignments,
  type SlotSelection,
} from "./encounter-preview.ts";

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
export const REASON_MAX_LENGTH = 1000;

const RESPONSES: readonly TeamCommand[] = ["confirm", "reject", "propose_alternative"];

export type SelectionIntent =
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

/** One command as sent: replaying it with the same key and version is safe. */
export type Attempt = {
  readonly intent: SelectionIntent;
  readonly expectedVersion: number;
  readonly commandKey: string;
};

export type Failure = "unknown" | "conflict" | "invalid" | "refused";

export type CommandOutcome =
  | { readonly ok: true }
  | { readonly ok: false; readonly failure: Failure; readonly code: string | null };

export type Submission =
  | { readonly status: "idle" }
  | { readonly status: "pending"; readonly attempt: Attempt }
  /** The request may or may not have landed; a retry replays the same attempt. */
  | { readonly status: "unknown"; readonly attempt: Attempt }
  /** The selection moved past the version the user read; nothing is resent on its own. */
  | { readonly status: "conflict"; readonly readVersion: number }
  | { readonly status: "invalid"; readonly code: string | null }
  | { readonly status: "refused" };

export type SelectionDraft = {
  /** Slot choices: the draft that `propose` and `propose_alternative` send. */
  readonly assignments: SlotAssignments;
  readonly reasons: Readonly<Record<ReasonCommand, string>>;
  readonly open: TeamCommand | null;
  readonly submission: Submission;
  /** Last command the server accepted, announced once the dialog closes. */
  readonly accepted: TeamCommand | null;
};

export const EMPTY_DRAFT: SelectionDraft = {
  assignments: NO_ASSIGNMENTS,
  reasons: { reject: "", propose_alternative: "", open_dispute: "" },
  open: null,
  submission: { status: "idle" },
  accepted: null,
};

export type DraftEvent =
  | { readonly type: "assign"; readonly slot: OfficialSlot; readonly key: string }
  | { readonly type: "clear_slot"; readonly slot: OfficialSlot }
  | { readonly type: "edit_reason"; readonly command: ReasonCommand; readonly text: string }
  | { readonly type: "open"; readonly command: TeamCommand }
  | { readonly type: "close" }
  | { readonly type: "started"; readonly attempt: Attempt }
  | { readonly type: "settled"; readonly outcome: CommandOutcome };

export function selectionDraftReducer(draft: SelectionDraft, event: DraftEvent): SelectionDraft {
  const pending = draft.submission.status === "pending";
  switch (event.type) {
    case "assign":
      return { ...draft, assignments: assignCandidate(draft.assignments, event.slot, event.key) };
    case "clear_slot":
      return { ...draft, assignments: clearSlot(draft.assignments, event.slot) };
    case "edit_reason":
      return { ...draft, reasons: { ...draft.reasons, [event.command]: event.text } };
    case "open":
      if (pending || draft.submission.status === "refused") return draft;
      return { ...draft, open: event.command, submission: settledOnClose(draft.submission) };
    case "close":
      if (pending) return draft;
      return { ...draft, open: null, submission: settledOnClose(draft.submission) };
    case "started":
      return {
        ...draft,
        submission: { status: "pending", attempt: event.attempt },
        accepted: null,
      };
    case "settled": {
      if (draft.submission.status !== "pending") return draft;
      const { attempt } = draft.submission;
      const { outcome } = event;
      if (outcome.ok) return { ...EMPTY_DRAFT, accepted: attempt.intent.kind };
      switch (outcome.failure) {
        case "unknown":
          return { ...draft, submission: { status: "unknown", attempt } };
        case "conflict":
          return {
            ...draft,
            submission: { status: "conflict", readVersion: attempt.expectedVersion },
          };
        case "invalid":
          return { ...draft, submission: { status: "invalid", code: outcome.code } };
        case "refused":
          return { ...draft, open: null, submission: { status: "refused" } };
        default: {
          const exhaustive: never = outcome.failure;
          return exhaustive;
        }
      }
    }
    default: {
      const exhaustive: never = event;
      return exhaustive;
    }
  }
}

/** An unknown outcome survives closing so reopening and resending replays it. */
function settledOnClose(submission: Submission): Submission {
  return submission.status === "unknown" || submission.status === "refused"
    ? submission
    : { status: "idle" };
}

/**
 * The attempt a submit sends, or `null` when it must not send at all. Resending the
 * intent of an unknown outcome reuses its key and version; anything else, including
 * the first submit after a conflict, gets `freshKey` and the version just read.
 */
export function beginAttempt(
  submission: Submission,
  intent: SelectionIntent,
  readVersion: number,
  freshKey: string,
): Attempt | null {
  if (submission.status === "pending" || submission.status === "refused") return null;
  if (submission.status === "unknown" && sameIntent(submission.attempt.intent, intent)) {
    return submission.attempt;
  }
  return { intent, expectedVersion: readVersion, commandKey: freshKey };
}

function sameIntent(a: SelectionIntent, b: SelectionIntent): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Version a command must name: the one read, or `0` before the first proposal. */
export function readVersionOf(view: OfficialSelectionViewDto): number {
  return view.selection?.version ?? 0;
}

export function currentProposalOf(view: OfficialSelectionViewDto) {
  const id = view.selection?.currentProposalId;
  return view.proposals.find((proposal) => proposal.id === id) ?? null;
}

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

export type IntentCheck =
  | { readonly ok: true; readonly intent: SelectionIntent }
  | { readonly ok: false; readonly missing: "slots" | "reason" | "proposal" };

/** Builds the intent from what the user entered, or names the first missing input. */
export function buildIntent(
  command: TeamCommand,
  input: {
    readonly proposalId: string | null;
    readonly selections: readonly SlotSelection[] | null;
    readonly reason: string;
  },
): IntentCheck {
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
