import type { CompetitionId, OrganizationId } from "@futrob/shared-kernel";
import type { MatchDispute } from "../entities/match-dispute.ts";
import type { OfficialMatchSelection } from "../entities/official-match-selection.ts";

/** A live selection Teams can no longer move, with the dispute that holds it, if any. */
export interface SelectionUnderDispute {
  readonly selection: OfficialMatchSelection;
  /**
   * Null when the case reached `organizer_review` without a dispute (integrity flags
   * on confirmation or an expired confirmation window).
   */
  readonly activeDispute: MatchDispute | null;
}

/** Competition-wide read of the cases waiting on an operator decision. */
export interface SelectionDisputeReaderPort {
  /** Live selections in `disputed` or `organizer_review`, oldest change first. */
  listUnderDispute(input: {
    readonly organizationId: OrganizationId;
    readonly competitionId: CompetitionId;
  }): Promise<readonly SelectionUnderDispute[]>;
}
