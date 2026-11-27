import type { EncounterViewDto, OfficialSelectionViewDto } from "@futrob/api-contracts";
import type { DisputeReviewState } from "./dispute-review-section.tsx";
import type { TeamSelectionState } from "./team-selection-section.tsx";

export type SelectionStatus = NonNullable<OfficialSelectionViewDto["selection"]>["status"];

/** The selection the page shows, and whether its latest refresh failed. */
export type LoadedSelection = {
  readonly view: OfficialSelectionViewDto;
  readonly refreshFailed: boolean;
};

/**
 * The Encounter's status from the official selection and the detail's `score`, which
 * refresh in parallel, so neither arrival order nor timing may decide (ADR-0016).
 * - A selection whose latest read succeeded states the persisted status explicitly; a
 *   score arriving later, or a `null` from an API that predates `score`, cannot override it.
 * - A void, once observed, stands until the selection is read again: `approved` only moves
 *   to `voided`, so no older score can revive it.
 * - Otherwise a failed selection refresh falls back to the detail: a score means an
 *   approval newer than the selection last read.
 */
export function encounterStatusOf(
  view: EncounterViewDto,
  selection: LoadedSelection | null,
): SelectionStatus | null {
  const selectionStatus = selection?.view.selection?.status ?? null;
  if (!selection || !selectionStatus) return view.score !== null ? "approved" : null;
  if (!selection.refreshFailed || selectionStatus === "voided") return selectionStatus;
  return view.score !== null ? "approved" : selectionStatus;
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
