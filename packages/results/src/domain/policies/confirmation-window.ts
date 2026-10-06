import { compareTime } from "@futrob/shared-kernel";
import type { OfficialSelectionProposal } from "../entities/official-match-selection.ts";
import { ConfirmationWindowClosed } from "../errors/official-selection.errors.ts";

export function confirmationWindowGuard(
  proposal: OfficialSelectionProposal,
  now: Date,
): ConfirmationWindowClosed | null {
  return compareTime(now, proposal.confirmationDeadline) >= 0
    ? new ConfirmationWindowClosed({
        code: "results.confirmation_window_closed",
        message: "The opponent confirmation window is closed",
        proposalId: proposal.id,
      })
    : null;
}
