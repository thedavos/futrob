import { z } from "zod";
import type {
  CompetitionEncounterDto,
  CompetitionEncounterStatusDto,
  EncounterMatchScoreDto,
} from "@futrob/api-contracts";

export type EncounterStatusFilter = "all" | CompetitionEncounterStatusDto;

/** Query choices survive opening a Match Center, browser Back, reload and a shared link. */
export const competitionEncountersSearchSchema = z.object({
  status: z.enum(["scheduled", "awaiting_result", "official"]).optional().catch(undefined),
  round: z.coerce.number().int().positive().optional().catch(undefined),
  team: z.string().min(1).optional().catch(undefined),
});

export type CompetitionEncountersSearch = z.infer<typeof competitionEncountersSearchSchema>;

export interface CompetitionEncountersFilters {
  readonly status: EncounterStatusFilter;
  readonly roundNumber: number | null;
  readonly teamId: string | null;
}

export const NO_ENCOUNTER_FILTERS: CompetitionEncountersFilters = {
  status: "all",
  roundNumber: null,
  teamId: null,
};

export function filtersFromSearch(
  search: CompetitionEncountersSearch,
): CompetitionEncountersFilters {
  return {
    status: search.status ?? "all",
    roundNumber: search.round ?? null,
    teamId: search.team ?? null,
  };
}

export function searchFromFilters(
  filters: CompetitionEncountersFilters,
): CompetitionEncountersSearch {
  return {
    status: filters.status === "all" ? undefined : filters.status,
    round: filters.roundNumber ?? undefined,
    team: filters.teamId ?? undefined,
  };
}

export function hasEncounterFilters(filters: CompetitionEncountersFilters): boolean {
  return filters.status !== "all" || filters.roundNumber !== null || filters.teamId !== null;
}

export interface EncounterTeamOption {
  readonly teamId: string;
  readonly name: string;
}

export interface EncounterRoundOption {
  readonly number: number;
  readonly total: number | null;
}

export function encounterFilterTeams(
  encounters: readonly CompetitionEncounterDto[],
  locale: string,
): readonly EncounterTeamOption[] {
  const byId = new Map<string, string>();
  for (const encounter of encounters) {
    byId.set(encounter.home.teamId, encounter.home.name);
    byId.set(encounter.away.teamId, encounter.away.name);
  }
  const collator = new Intl.Collator(locale, { sensitivity: "base" });
  return [...byId.entries()]
    .map(([teamId, name]) => ({ teamId, name }))
    .sort((left, right) => collator.compare(left.name, right.name));
}

export function encounterFilterRounds(
  encounters: readonly CompetitionEncounterDto[],
): readonly EncounterRoundOption[] {
  const byNumber = new Map<number, number | null>();
  for (const encounter of encounters) {
    if (!byNumber.has(encounter.round.number)) {
      byNumber.set(encounter.round.number, encounter.round.total);
    }
  }
  return [...byNumber.entries()]
    .sort(([left], [right]) => left - right)
    .map(([number, total]) => ({ number, total }));
}

/** Drop stale URL/filter selections when the list no longer contains that round or team. */
export function validEncounterFilters(
  filters: CompetitionEncountersFilters,
  teams: readonly EncounterTeamOption[],
  rounds: readonly EncounterRoundOption[],
): CompetitionEncountersFilters {
  const roundValid =
    filters.roundNumber !== null && rounds.some((round) => round.number === filters.roundNumber);
  const teamValid = filters.teamId !== null && teams.some((team) => team.teamId === filters.teamId);
  return {
    status: filters.status,
    roundNumber: roundValid ? filters.roundNumber : null,
    teamId: teamValid ? filters.teamId : null,
  };
}

function matchesRoundAndTeam(
  encounter: CompetitionEncounterDto,
  filters: Pick<CompetitionEncountersFilters, "roundNumber" | "teamId">,
): boolean {
  if (filters.roundNumber !== null && encounter.round.number !== filters.roundNumber) {
    return false;
  }
  if (
    filters.teamId !== null &&
    encounter.home.teamId !== filters.teamId &&
    encounter.away.teamId !== filters.teamId
  ) {
    return false;
  }
  return true;
}

export interface EncounterStatusCounts {
  readonly all: number;
  readonly awaiting_result: number;
  readonly official: number;
  readonly scheduled: number;
}

export function encounterStatusCounts(
  encounters: readonly CompetitionEncounterDto[],
  filters: Pick<CompetitionEncountersFilters, "roundNumber" | "teamId">,
): EncounterStatusCounts {
  let all = 0;
  let awaiting_result = 0;
  let official = 0;
  let scheduled = 0;
  for (const encounter of encounters) {
    if (!matchesRoundAndTeam(encounter, filters)) continue;
    all += 1;
    if (encounter.status === "awaiting_result") awaiting_result += 1;
    else if (encounter.status === "official") official += 1;
    else scheduled += 1;
  }
  return { all, awaiting_result, official, scheduled };
}

export function filterEncounters(
  encounters: readonly CompetitionEncounterDto[],
  filters: CompetitionEncountersFilters,
): readonly CompetitionEncounterDto[] {
  return encounters.filter((encounter) => {
    if (!matchesRoundAndTeam(encounter, filters)) return false;
    if (filters.status !== "all" && encounter.status !== filters.status) return false;
    return true;
  });
}

export interface EncounterRoundGroup {
  readonly round: EncounterRoundOption;
  readonly encounters: readonly CompetitionEncounterDto[];
  readonly officialCount: number;
  readonly awaitingCount: number;
  readonly scheduledCount: number;
  readonly firstKickoffIso: string;
  readonly lastKickoffIso: string;
  readonly spansMultipleDays: boolean;
}

function localDayKey(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Rounds in ascending order; each keeps its Encounters in schedule order. */
export function groupEncountersByRound(
  encounters: readonly CompetitionEncounterDto[],
  timeZone: string,
): readonly EncounterRoundGroup[] {
  const byRound = new Map<number, CompetitionEncounterDto[]>();
  for (const encounter of encounters) {
    const group = byRound.get(encounter.round.number);
    if (group) group.push(encounter);
    else byRound.set(encounter.round.number, [encounter]);
  }
  return [...byRound.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, items]) => {
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const days = new Set(items.map((item) => localDayKey(item.scheduledStartAt, timeZone)));
      let officialCount = 0;
      let awaitingCount = 0;
      let scheduledCount = 0;
      for (const item of items) {
        if (item.status === "official") officialCount += 1;
        else if (item.status === "awaiting_result") awaitingCount += 1;
        else scheduledCount += 1;
      }
      return {
        round: first.round,
        encounters: items,
        officialCount,
        awaitingCount,
        scheduledCount,
        firstKickoffIso: first.scheduledStartAt,
        lastKickoffIso: last.scheduledStartAt,
        spansMultipleDays: days.size > 1,
      };
    });
}

export type ScoreLeader = "home" | "away" | "draw";

export type EncounterScoreView =
  | {
      readonly kind: "single";
      readonly homeGoals: number;
      readonly awayGoals: number;
      readonly leader: ScoreLeader;
    }
  | {
      readonly kind: "aggregate";
      readonly aggregateHome: number;
      readonly aggregateAway: number;
      readonly leader: ScoreLeader;
      readonly legs: readonly EncounterMatchScoreDto[];
    }
  | {
      readonly kind: "independent";
      readonly legs: readonly EncounterMatchScoreDto[];
    };

function leaderOf(home: number, away: number): ScoreLeader {
  if (home > away) return "home";
  if (away > home) return "away";
  return "draw";
}

/**
 * Official score presentation model. Single matches show goals directly; two-match aggregate
 * series show a clearly labeled aggregate plus each leg (UX-MAT-003); independent two-match
 * series keep each leg separate without inventing an aggregate.
 */
export function encounterScoreView(
  encounter: Pick<CompetitionEncounterDto, "status" | "score" | "resolutionMode">,
): EncounterScoreView | null {
  if (encounter.status !== "official" || !encounter.score || encounter.score.length === 0) {
    return null;
  }
  if (encounter.score.length === 1) {
    const [only] = encounter.score;
    if (!only) return null;
    return {
      kind: "single",
      homeGoals: only.homeGoals,
      awayGoals: only.awayGoals,
      leader: leaderOf(only.homeGoals, only.awayGoals),
    };
  }
  if (encounter.resolutionMode === "aggregate_score") {
    const aggregateHome = encounter.score.reduce((sum, leg) => sum + leg.homeGoals, 0);
    const aggregateAway = encounter.score.reduce((sum, leg) => sum + leg.awayGoals, 0);
    return {
      kind: "aggregate",
      aggregateHome,
      aggregateAway,
      leader: leaderOf(aggregateHome, aggregateAway),
      legs: encounter.score,
    };
  }
  return {
    kind: "independent",
    legs: encounter.score,
  };
}
