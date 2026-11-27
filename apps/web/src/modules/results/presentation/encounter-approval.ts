import type { EncounterViewDto, OfficialSelectionViewDto } from "@futrob/api-contracts";
import type { DisputeReviewState } from "./dispute-review-section.tsx";
import type { TeamSelectionState } from "./team-selection-section.tsx";

export type SelectionStatus = NonNullable<OfficialSelectionViewDto["selection"]>["status"];

/** The selection the page shows, and whether its last refresh failed. */
export type LoadedSelection = {
  readonly view: OfficialSelectionViewDto;
  readonly refreshFailed: boolean;
};

/**
 * The Encounter's status, reconciling two reads that refresh independently: the detail's
 * `score` (projected from the approved review) and the official selection.
 * - A freshly read selection decides: once it reads `voided`, a cached `score` is stale.
 * - A selection whose refresh failed never hides a `score` the detail just returned.
 */
export function encounterStatusOf(
  view: EncounterViewDto,
  selection: LoadedSelection | null,
): SelectionStatus | null {
  const selectionStatus = selection?.view.selection?.status ?? null;
  if (selection && !selection.refreshFailed && selectionStatus) return selectionStatus;
  if (view.score !== null) return "approved";
  return selectionStatus;
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
