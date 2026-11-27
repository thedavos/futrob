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
 * The Encounter's status from two reads that refresh in parallel: the official selection
 * and the detail's persisted `approvedResultId` (ADR-0016). Arrival order never decides.
 * - A selection whose latest read succeeded states the status explicitly and decides.
 * - When only the detail's latest read succeeded, its explicit official state decides
 *   whether the Encounter is approved: a void retires a cached `approved`, and a new
 *   approval after a void replaces a cached `voided`.
 * - Otherwise (both stale, or a detail from an API that predates `approvedResultId`) the
 *   selection last read stands; a missing `score` is never taken as a void.
 */
export function encounterStatusOf(
  view: EncounterViewDto,
  viewRefreshFailed: boolean | undefined,
  selection: LoadedSelection | null,
): SelectionStatus | null {
  const official =
    view.approvedResultId === undefined ? view.score !== null : view.approvedResultId !== null;
  const selectionStatus = selection?.view.selection?.status ?? null;
  if (!selection || !selectionStatus) return official ? "approved" : null;
  const detailDecides =
    selection.refreshFailed && !viewRefreshFailed && view.approvedResultId !== undefined;
  if (!detailDecides) return selectionStatus;
  if (official) return "approved";
  return selectionStatus === "approved" ? "voided" : selectionStatus;
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
