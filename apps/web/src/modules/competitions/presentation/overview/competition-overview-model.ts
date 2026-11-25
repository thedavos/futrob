import type {
  CompetitionDto,
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

/** Encounters with status `official`, most recent kickoff first. */
export function recentOfficialEncounters(
  encounters: readonly CompetitionEncounterDto[],
  limit = OVERVIEW_UPCOMING_LIMIT,
): readonly CompetitionEncounterDto[] {
  return encounters
    .filter((encounter) => encounter.status === "official")
    .sort(
      compareByTime((encounter) => new Date(encounter.scheduledStartAt), TIME_SORT_DIRECTION.desc),
    )
    .slice(0, limit);
}

export interface OfficializedCounts {
  readonly official: number;
  readonly total: number;
}

/** Count of officialized encounters out of the total paired encounters in the active fixture. */
export function officializedEncounters(
  encounters: readonly CompetitionEncounterDto[],
): OfficializedCounts {
  return {
    official: encounters.filter((encounter) => encounter.status === "official").length,
    total: encounters.length,
  };
}

/** Encounters with status `awaiting_result`, oldest kickoff first. */
export function awaitingResultEncounters(
  encounters: readonly CompetitionEncounterDto[],
): readonly CompetitionEncounterDto[] {
  return encounters
    .filter((encounter) => encounter.status === "awaiting_result")
    .sort(compareByTime((encounter) => new Date(encounter.scheduledStartAt)));
}

export type CompetitionProgressSummary =
  | {
      readonly kind: "encounters";
      readonly official: number;
      readonly total: number;
      readonly percent: number;
    }
  | {
      readonly kind: "teams";
      readonly approved: number;
      readonly max: number;
      readonly percent: number;
    };

/**
 * Competition completion bar: once the fixture exists, tracks officialized encounters;
 * during open registration before a fixture exists, tracks approved teams against capacity.
 */
export function competitionProgress(
  competition: OverviewSlice<CompetitionDto>,
  encounters: OverviewSlice<readonly CompetitionEncounterDto[]>,
  entries: OverviewSlice<readonly CompetitionEntryDto[]>,
): CompetitionProgressSummary | null {
  if (encounters.status === "ready" && encounters.data.length > 0) {
    const { official, total } = officializedEncounters(encounters.data);
    return {
      kind: "encounters",
      official,
      total,
      percent: Math.round((official / total) * 100),
    };
  }
  if (
    competition.status === "ready" &&
    competition.data.status === "registration" &&
    competition.data.teams.max !== null &&
    competition.data.teams.max > 0 &&
    entries.status === "ready"
  ) {
    const { approved } = countEntries(entries.data);
    const max = competition.data.teams.max;
    return {
      kind: "teams",
      approved,
      max,
      percent: Math.min(100, Math.round((approved / max) * 100)),
    };
  }
  return null;
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
