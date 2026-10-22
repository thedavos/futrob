import type { TeamCompetitionStatsDto } from "@futrob/api-contracts";

/** Team display names keyed by `teamId`, from the competition team list. */
export type TeamNames = Readonly<Record<string, string>>;

/** Team names load from a separate list; the figures stay usable if that list fails. */
export type TeamNamesState =
  | { readonly kind: "loading" }
  | { readonly kind: "ready"; readonly names: TeamNames }
  | { readonly kind: "error"; readonly retry: () => void };

export type CompetitionTeamStatsState =
  | { readonly kind: "loading" }
  | { readonly kind: "forbidden" }
  | { readonly kind: "not_found" }
  | { readonly kind: "error"; readonly reason: "load" | "access"; readonly retry: () => void }
  | {
      readonly kind: "ready";
      readonly teams: readonly TeamCompetitionStatsDto[];
      /** Cached figures kept after a failed refresh. */
      readonly refreshFailed: { readonly retry: () => void } | null;
    };
