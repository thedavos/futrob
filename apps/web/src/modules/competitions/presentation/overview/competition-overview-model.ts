import type {
  CompetitionEncounterDto,
  CompetitionEntryDto,
  CompetitionTeamManagementSummaryDto,
} from "@futrob/api-contracts";
import { compareByTime, TIME_SORT_DIRECTION } from "@futrob/shared-kernel";

export const OVERVIEW_UPCOMING_LIMIT = 5;
export const OVERVIEW_TEAMS_LIMIT = 6;
export const OVERVIEW_PENDING_LIMIT = 5;

/** A read the overview shows on its own, so one failing source never hides the others. */
export type OverviewSlice<T> =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly retry: () => void }
  | { readonly status: "ready"; readonly data: T };

export interface EntryCounts {
  readonly approved: number;
  readonly pending: number;
}

export function countEntries(entries: readonly CompetitionEntryDto[]): EntryCounts {
  return {
    approved: entries.filter((entry) => entry.status === "approved").length,
    pending: entries.filter((entry) => entry.status === "pending").length,
  };
}

/** Encounters with status `scheduled`, earliest kickoff first. */
export function upcomingEncounters(
  encounters: readonly CompetitionEncounterDto[],
  limit = OVERVIEW_UPCOMING_LIMIT,
): readonly CompetitionEncounterDto[] {
  return encounters
    .filter((encounter) => encounter.status === "scheduled")
    .sort(compareByTime((encounter) => new Date(encounter.scheduledStartAt)))
    .slice(0, limit);
}

/** Encounters with status `awaiting_result`, oldest kickoff first. */
export function awaitingResultEncounters(
  encounters: readonly CompetitionEncounterDto[],
): readonly CompetitionEncounterDto[] {
  return encounters
    .filter((encounter) => encounter.status === "awaiting_result")
    .sort(compareByTime((encounter) => new Date(encounter.scheduledStartAt)));
}

/** Pending approvals first, then approved teams; rejected entries stay out of the summary. */
export function overviewTeams(
  items: readonly CompetitionTeamManagementSummaryDto[],
  limit = OVERVIEW_TEAMS_LIMIT,
): readonly CompetitionTeamManagementSummaryDto[] {
  const rank = { pending: 0, approved: 1, rejected: 2 } as const;
  return items
    .filter((item) => item.entry.status !== "rejected")
    .sort(
      (left, right) =>
        rank[left.entry.status] - rank[right.entry.status] ||
        compareByTime(
          (item: CompetitionTeamManagementSummaryDto) => new Date(item.entry.createdAt),
          TIME_SORT_DIRECTION.desc,
        )(left, right),
    )
    .slice(0, limit);
}
