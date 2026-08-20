import { z } from "zod";
import {
  MATCH_SORT_ORDERS,
  PLAYER_MATCHES_VIEWS,
  type MatchSortOrder,
  type PlayerMatchesView,
} from "./player-match-view.ts";

export const playerMatchesSearchSchema = z.object({
  view: z.preprocess(
    (value) => (value === "recent" ? "all" : value),
    z.enum(PLAYER_MATCHES_VIEWS).optional(),
  ),
  sort: z.enum(MATCH_SORT_ORDERS).optional(),
});

export type PlayerMatchesSearch = z.infer<typeof playerMatchesSearchSchema>;

export interface NormalizedPlayerMatchesSearch {
  readonly view: PlayerMatchesView;
  readonly sort: MatchSortOrder;
}

export function normalizePlayerMatchesSearch(
  search: PlayerMatchesSearch,
): NormalizedPlayerMatchesSearch {
  return {
    view: search.view ?? "all",
    sort: search.sort ?? "newest",
  };
}
