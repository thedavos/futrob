import { z } from "zod";
import type {
  CompetitionEncounterDto,
  CompetitionEncounterStageDto,
  CompetitionEncounterStatusDto,
  EncounterMatchScoreDto,
} from "@futrob/api-contracts";

export type EncounterStatusFilter = "all" | CompetitionEncounterStatusDto;

/** Query choices survive opening a Match Center, browser Back, reload and a shared link. */
export const competitionEncountersSearchSchema = z.object({
  status: z.enum(["scheduled", "awaiting_result", "official"]).optional().catch(undefined),
  /** Round key (see `encounterRoundKey`): round numbers repeat across stages, ids do not. */
  round: z.string().min(1).optional().catch(undefined),
  team: z.string().min(1).optional().catch(undefined),
});

export type CompetitionEncountersSearch = z.infer<typeof competitionEncountersSearchSchema>;

export interface CompetitionEncountersFilters {
  readonly status: EncounterStatusFilter;
  readonly roundKey: string | null;
  readonly teamId: string | null;
}

export const NO_ENCOUNTER_FILTERS: CompetitionEncountersFilters = {
  status: "all",
  roundKey: null,
  teamId: null,
};

export function filtersFromSearch(
  search: CompetitionEncountersSearch,
): CompetitionEncountersFilters {
  return {
    status: search.status ?? "all",
    roundKey: search.round ?? null,
    teamId: search.team ?? null,
  };
}

export function searchFromFilters(
  filters: CompetitionEncountersFilters,
): CompetitionEncountersSearch {
  return {
    status: filters.status === "all" ? undefined : filters.status,
    round: filters.roundKey ?? undefined,
    team: filters.teamId ?? undefined,
  };
}

export function hasEncounterFilters(filters: CompetitionEncountersFilters): boolean {
  return filters.status !== "all" || filters.roundKey !== null || filters.teamId !== null;
}

export interface EncounterTeamOption {
  readonly teamId: string;
  readonly name: string;
}

export interface EncounterRoundOption {
  readonly key: string;
  readonly number: number;
  readonly total: number | null;
  readonly stage: CompetitionEncounterStageDto | null;
}

/**
 * Identifies a round across stages: League Round 1 and Playoffs Round 1 share a number but not
 * an id. An API that predates round ids leaves only the number, which is unique in one stage.
 */
export function encounterRoundKey(round: CompetitionEncounterDto["round"]): string {
  return round.id ?? String(round.number);
}

function roundOption(round: CompetitionEncounterDto["round"]): EncounterRoundOption {
  return {
    key: encounterRoundKey(round),
    number: round.number,
    total: round.total,
    stage: round.stage,
  };
}

function compareRounds(left: EncounterRoundOption, right: EncounterRoundOption): number {
  return (left.stage?.order ?? 0) - (right.stage?.order ?? 0) || left.number - right.number;
}

/** Rounds come from more than one stage, so a label needs the stage to tell them apart. */
export function roundsSpanStages(rounds: readonly EncounterRoundOption[]): boolean {
  return new Set(rounds.map((round) => round.stage?.id ?? null)).size > 1;
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
  const byKey = new Map<string, EncounterRoundOption>();
  for (const encounter of encounters) {
    const key = encounterRoundKey(encounter.round);
    if (!byKey.has(key)) byKey.set(key, roundOption(encounter.round));
  }
  return [...byKey.values()].sort(compareRounds);
}

/**
 * A saved round key that is no longer listed may be a bare number from a link made while the API
 * sent no round ids. It still names that round when exactly one listed round has the number;
 * when the number repeats across stages it is ambiguous and dropped rather than mixing stages.
 */
function resolveRoundKey(
  roundKey: string | null,
  rounds: readonly EncounterRoundOption[],
): string | null {
  if (roundKey === null) return null;
  if (rounds.some((round) => round.key === roundKey)) return roundKey;
  if (!/^\d+$/.test(roundKey)) return null;
  const number = Number(roundKey);
  const matches = rounds.filter((round) => round.number === number);
  return matches.length === 1 ? matches[0]!.key : null;
}

/** Drop stale URL/filter selections when the list no longer contains that round or team. */
export function validEncounterFilters(
  filters: CompetitionEncountersFilters,
  teams: readonly EncounterTeamOption[],
  rounds: readonly EncounterRoundOption[],
): CompetitionEncountersFilters {
  const teamValid = filters.teamId !== null && teams.some((team) => team.teamId === filters.teamId);
  return {
    status: filters.status,
    roundKey: resolveRoundKey(filters.roundKey, rounds),
    teamId: teamValid ? filters.teamId : null,
  };
}

function matchesRoundAndTeam(
  encounter: CompetitionEncounterDto,
  filters: Pick<CompetitionEncountersFilters, "roundKey" | "teamId">,
): boolean {
  if (filters.roundKey !== null && encounterRoundKey(encounter.round) !== filters.roundKey) {
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
  filters: Pick<CompetitionEncountersFilters, "roundKey" | "teamId">,
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

/** Rounds in stage and round order; each keeps its Encounters in schedule order. */
export function groupEncountersByRound(
  encounters: readonly CompetitionEncounterDto[],
  timeZone: string,
): readonly EncounterRoundGroup[] {
  // One formatter for the whole list: building one per Encounter costs tens of ms per filter.
  const localDay = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const byRound = new Map<string, CompetitionEncounterDto[]>();
  for (const encounter of encounters) {
    const key = encounterRoundKey(encounter.round);
    const group = byRound.get(key);
    if (group) group.push(encounter);
    else byRound.set(key, [encounter]);
  }
  return [...byRound.values()]
    .map((items) => ({ round: roundOption(items[0]!.round), items }))
    .sort((left, right) => compareRounds(left.round, right.round))
    .map(({ round, items }) => {
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const days = new Set(items.map((item) => localDay.format(new Date(item.scheduledStartAt))));
      let officialCount = 0;
      let awaitingCount = 0;
      let scheduledCount = 0;
      for (const item of items) {
        if (item.status === "official") officialCount += 1;
        else if (item.status === "awaiting_result") awaitingCount += 1;
        else scheduledCount += 1;
      }
      return {
        round,
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
