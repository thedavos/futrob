import type { EncounterViewDto, OfficialSelectionViewDto } from "@futrob/api-contracts";
import type { DisputeReviewState } from "./dispute-review-section.tsx";
import type { TeamSelectionState } from "./team-selection-section.tsx";

export type SelectionStatus = NonNullable<OfficialSelectionViewDto["selection"]>["status"];

/** The selection the page shows, and when it was last read successfully. */
export type LoadedSelection = {
  readonly view: OfficialSelectionViewDto;
  readonly updatedAt: number;
};

/**
 * The Encounter's status, reconciling two reads that refresh independently: the detail's
 * `score` (projected from the approved review) and the official selection. The latest
 * successful read wins, so a failed refresh never revives what a newer read retired:
 * a selection read as `voided` keeps a stale `score` hidden, and a freshly read `score`
 * prevails over a selection last read before the approval.
 */
export function encounterStatusOf(
  view: EncounterViewDto,
  viewUpdatedAt: number,
  selection: LoadedSelection | null,
): SelectionStatus | null {
  const selectionStatus = selection?.view.selection?.status ?? null;
  if (!selection || !selectionStatus) return view.score !== null ? "approved" : null;
  if (selection.updatedAt >= viewUpdatedAt) return selectionStatus;
  if (view.score !== null) return "approved";
  // The newer detail carries no official score, so a stale `approved` no longer holds.
  return selectionStatus === "approved" ? null : selectionStatus;
}

/** The operator's dossier when visible, else the acting Team's selection. */
export function loadedSelectionOf(
  disputeReview: DisputeReviewState | undefined,
  teamSelection: TeamSelectionState | undefined,
): LoadedSelection | null {
  if (disputeReview?.kind === "visible" && disputeReview.read.kind === "ready") {
    return disputeReview.read;
  }
  if (teamSelection?.kind === "visible" && teamSelection.read.kind === "ready") {
    return teamSelection.read;
  }
  return null;
}
