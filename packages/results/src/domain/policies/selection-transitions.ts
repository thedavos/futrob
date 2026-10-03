import type { SelectionStatus } from "../value-objects/selection-status.ts";

/** Commands that move an OfficialMatchSelection between statuses. */
export type SelectionCommand =
  | "propose"
  | "confirm"
  | "reject"
  | "propose_alternative"
  | "open_dispute"
  | "review_dispute"
  | "resolve_dispute"
  | "void";

/**
 * Commands each status accepts. The mapped type makes the table exhaustive:
 * adding a `SelectionStatus` without deciding its commands fails to compile.
 * `confirmed` is transient inside an approving command and accepts nothing.
 */
const COMMANDS_BY_STATUS = {
  awaiting_provider_data: ["propose"],
  candidates_available: ["propose"],
  selection_in_progress: ["propose"],
  awaiting_opponent_confirmation: ["confirm", "reject", "propose_alternative", "open_dispute"],
  confirmed: [],
  disputed: ["review_dispute"],
  organizer_review: ["resolve_dispute"],
  approved: ["void"],
  voided: ["propose"],
} satisfies Record<SelectionStatus, readonly SelectionCommand[]>;

function commandsOf(status: SelectionStatus): readonly SelectionCommand[] {
  return COMMANDS_BY_STATUS[status];
}

/** `null` means no selection exists yet for the Encounter. */
export function canApplySelectionCommand(
  status: SelectionStatus | null,
  command: SelectionCommand,
): boolean {
  if (status === null) return command === "propose";
  return commandsOf(status).includes(command);
}

export function selectionCommandsFor(status: SelectionStatus | null): readonly SelectionCommand[] {
  return status === null ? ["propose"] : commandsOf(status);
}

/** Statuses in which an active dispute may exist and Teams can no longer mutate the case. */
export function isUnderDispute(status: SelectionStatus): boolean {
  return status === "disputed" || status === "organizer_review";
}
