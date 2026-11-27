import type {
  EncounterCandidateDto,
  EncounterViewDto,
  OfficialSelectionViewDto,
} from "@futrob/api-contracts";
import {
  assignmentsOf,
  previewApprovedEncounter,
  type EncounterPreview,
  type SlotAssignments,
} from "./encounter-preview.ts";
import { currentProposalOf } from "./selection-draft.ts";
import type { DisputeReviewState } from "./dispute-review-section.tsx";
import type { TeamSelectionState } from "./team-selection-section.tsx";

export type SelectionStatus = NonNullable<OfficialSelectionViewDto["selection"]>["status"];

/** The selection the page shows, as last read successfully. */
export type LoadedSelection = { readonly view: OfficialSelectionViewDto };

export type OfficialState = {
  readonly status: SelectionStatus | null;
  /** The selection's current proposal belongs to the approval shown (its EA references). */
  readonly proposalMatches: boolean;
  /** The detail's `score` belongs to the approval shown. */
  readonly scoreMatches: boolean;
};

/**
 * The Encounter's official state from two reads that refresh in parallel: the official
 * selection and the detail's `approvedResultId` (ADR-0016). Whichever snapshot the server
 * persisted later decides, by the selection's `updatedAt` that both carry; neither arrival
 * order nor a failed refresh changes the outcome, since cached data stays as it was.
 * - Ties, a detail from an API that predates `officialStateAt`, or a detail read before
 *   the first proposal leave the selection, which states its status explicitly, deciding.
 * - A newer detail decides whether the Encounter is official: a void retires a cached
 *   `approved`; a new approval after a void replaces a cached `voided`.
 * The proposal and the score are used only when they belong to the approval shown, so a
 * new approval never borrows the voided revision's references or score.
 */
export function officialStateOf(
  view: EncounterViewDto,
  selection: LoadedSelection | null,
): OfficialState {
  const official =
    view.approvedResultId === undefined ? view.score !== null : view.approvedResultId !== null;
  const current = selection?.view.selection ?? null;
  if (!selection || !current) {
    return { status: official ? "approved" : null, proposalMatches: false, scoreMatches: true };
  }
  const detailAt = view.officialStateAt ? Date.parse(view.officialStateAt) : null;
  const detailIsNewer = detailAt !== null && detailAt > Date.parse(current.updatedAt);
  const resultId = detailIsNewer ? view.approvedResultId : selection.view.approvedResultId;
  const status = !detailIsNewer
    ? current.status
    : official
      ? "approved"
      : current.status === "approved"
        ? "voided"
        : current.status;
  return {
    status,
    proposalMatches: !detailIsNewer || selection.view.approvedResultId === resultId,
    scoreMatches: view.approvedResultId === undefined || view.approvedResultId === resultId,
  };
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

type Proposal = NonNullable<ReturnType<typeof currentProposalOf>>;

export type ApprovedSources = {
  readonly proposal: Proposal | null;
  readonly assignments: SlotAssignments | null;
  readonly preview: EncounterPreview | null;
};

/** The approval shown: its proposal and EA references only when they belong to it. */
export function approvedSourcesOf(
  view: EncounterViewDto,
  selectionView: OfficialSelectionViewDto | null,
  official: OfficialState,
  candidates: readonly EncounterCandidateDto[],
): ApprovedSources {
  if (official.status !== "approved") return { proposal: null, assignments: null, preview: null };
  const proposal =
    selectionView && official.proposalMatches ? currentProposalOf(selectionView) : null;
  const assignments = proposal ? assignmentsOf(proposal.slots) : null;
  const scored = official.scoreMatches ? view : { ...view, score: null };
  return {
    proposal,
    assignments,
    preview: previewApprovedEncounter(scored, candidates, assignments),
  };
}
