import type {
  CompetitionTeamManagementDetailResponse,
  GetCompetitionRankingsResponse,
  RankingKindDto,
  RankingSnapshotDto,
} from "@futrob/api-contracts";
import type { ParameterlessMessageKey } from "@/shared/presentation/i18n/catalogs.ts";

/** Tab order of the player ranking kinds served by `statistics.getCompetitionRankings`. */
export const RANKING_KINDS = [
  "scorer",
  "assister",
  "rating",
  "mvp",
  "goalkeeper",
] as const satisfies readonly RankingKindDto[];

export const DEFAULT_RANKING_KIND: RankingKindDto = "scorer";

type KindCopy = {
  readonly tab: ParameterlessMessageKey;
  readonly table: ParameterlessMessageKey;
  readonly metric: ParameterlessMessageKey;
  readonly criterion: ParameterlessMessageKey;
};

export const RANKING_KIND_COPY = {
  scorer: {
    tab: "competition.rankings.kind.scorer",
    table: "competition.rankings.table.scorer",
    metric: "competition.rankings.metric.scorer",
    criterion: "competition.rankings.criterion.scorer",
  },
  assister: {
    tab: "competition.rankings.kind.assister",
    table: "competition.rankings.table.assister",
    metric: "competition.rankings.metric.assister",
    criterion: "competition.rankings.criterion.assister",
  },
  rating: {
    tab: "competition.rankings.kind.rating",
    table: "competition.rankings.table.rating",
    metric: "competition.rankings.metric.rating",
    criterion: "competition.rankings.criterion.rating",
  },
  mvp: {
    tab: "competition.rankings.kind.mvp",
    table: "competition.rankings.table.mvp",
    metric: "competition.rankings.metric.mvp",
    criterion: "competition.rankings.criterion.mvp",
  },
  goalkeeper: {
    tab: "competition.rankings.kind.goalkeeper",
    table: "competition.rankings.table.goalkeeper",
    metric: "competition.rankings.metric.goalkeeper",
    criterion: "competition.rankings.criterion.goalkeeper",
  },
} as const satisfies Record<RankingKindDto, KindCopy>;

/** `null` means the statistics projection has not produced this kind yet. */
export function selectRankingSnapshot(
  response: GetCompetitionRankingsResponse,
  kind: RankingKindDto,
): RankingSnapshotDto | null {
  return response.rankings.find((snapshot) => snapshot.kind === kind) ?? null;
}

export function rankingTeamIds(snapshot: RankingSnapshotDto | null): string[] {
  if (!snapshot) return [];
  return [...new Set(snapshot.rows.flatMap((row) => (row.teamId ? [row.teamId] : [])))];
}

export type RankingNames = {
  readonly players: ReadonlyMap<string, string>;
  readonly teams: ReadonlyMap<string, string>;
};

export const NO_RANKING_NAMES: RankingNames = { players: new Map(), teams: new Map() };

/** Display names come from each Team's roster presentation; nothing is guessed from ids. */
export function rankingNamesFromTeams(
  details: readonly CompetitionTeamManagementDetailResponse[],
): RankingNames {
  const players = new Map<string, string>();
  const teams = new Map<string, string>();
  for (const detail of details) {
    teams.set(detail.team.id, detail.team.name);
    for (const member of detail.members) {
      if (!players.has(member.membership.playerProfileId)) {
        players.set(member.membership.playerProfileId, member.presentation.displayName);
      }
    }
  }
  return { players, teams };
}

/** Teams whose roster read was refused: their rows stay unnamed. */
export type RankingNamesRestriction = "none" | "some" | "all";

/**
 * Names of the visible rows: `loading` while rosters resolve, `failed` when a roster read
 * failed and can be retried. Each Team's roster read is authorized on its own, so
 * `restricted` tells how many Teams refused it.
 */
export type RankingNamesState =
  | { readonly status: "loading" }
  | {
      readonly status: "failed";
      readonly names: RankingNames;
      readonly restricted: RankingNamesRestriction;
      readonly retry: () => void;
    }
  | {
      readonly status: "ready";
      readonly names: RankingNames;
      readonly restricted: RankingNamesRestriction;
    };

export function rankingNamesRestriction(
  refusedTeams: number,
  totalTeams: number,
): RankingNamesRestriction {
  if (refusedTeams === 0) return "none";
  return refusedTeams === totalTeams ? "all" : "some";
}

export function rankingNamesOf(state: RankingNamesState): RankingNames {
  return state.status === "loading" ? NO_RANKING_NAMES : state.names;
}

export type RankingFormatters = {
  readonly integer: Intl.NumberFormat;
  readonly rating: Intl.NumberFormat;
  readonly percent: Intl.NumberFormat;
  readonly updatedAt: Intl.DateTimeFormat;
};

export function rankingFormatters(locale: string): RankingFormatters {
  return {
    integer: new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }),
    rating: new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 2 }),
    percent: new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }),
    updatedAt: new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }),
  };
}

/** Rating is an average of EA match ratings; every other kind is a count. */
export function formatRankingValue(
  kind: RankingKindDto,
  value: number,
  formatters: RankingFormatters,
): string {
  return kind === "rating" ? formatters.rating.format(value) : formatters.integer.format(value);
}
