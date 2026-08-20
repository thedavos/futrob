"use client";

import { useQueryClient } from "@tanstack/react-query";
import type {
  GameDataProviderKeyQuery,
  GetMyRecentMatchResponse,
  GetMyRecentMatchesResponse,
  PlayerRecentProviderMatchDto,
} from "@futrob/api-contracts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { useWorkspaceSelectedClubId } from "@/shared/presentation/shell/use-workspace-selection.tsx";
import type { MatchSortOrder, PlayerMatchesView } from "./player-match-view.ts";
import {
  ProviderMatchDetailView,
  type ProviderMatchDetailViewState,
} from "./provider-match-detail-page.tsx";
import { recentMatchListSummary, useMyRecentMatchQuery } from "./statistics-queries.ts";

export function ProviderMatchDetailQuery({
  externalMatchId,
  providerKey,
  sort,
  view,
}: {
  readonly externalMatchId: string;
  readonly providerKey: GameDataProviderKeyQuery;
  readonly sort: MatchSortOrder;
  readonly view: PlayerMatchesView;
}) {
  const selectedClub = useWorkspaceSelectedClubId();
  const queryClient = useQueryClient();
  const listSummary = recentMatchListSummary(
    queryClient.getQueryData<GetMyRecentMatchesResponse>(
      queryKeys.gameData.meRecentMatches(selectedClub.externalClubId),
    ),
    providerKey,
    externalMatchId,
  );
  const query = useMyRecentMatchQuery(
    {
      externalClubId: selectedClub.externalClubId,
      externalMatchId,
      providerKey,
    },
    selectedClub.profileReady,
  );
  const state = selectedClub.profileReady
    ? toProviderMatchDetailViewState({
        data: query.data,
        isError: query.isError,
        isPending: query.isPending,
        listSummary,
        retry: () => void query.refetch(),
      })
    : ({ kind: "loading" } as const);
  return <ProviderMatchDetailView sort={sort} state={state} view={view} />;
}

export function toProviderMatchDetailViewState(query: {
  readonly data: GetMyRecentMatchResponse | undefined;
  readonly isError: boolean;
  readonly isPending: boolean;
  readonly listSummary: PlayerRecentProviderMatchDto | undefined;
  readonly retry: () => void;
}): ProviderMatchDetailViewState {
  if (query.isError) return { kind: "error", retry: query.retry };
  if (query.isPending || query.data === undefined) {
    return { kind: "loading", summary: query.listSummary };
  }
  switch (query.data.status) {
    case "needs_club":
      return { kind: "needs_club" };
    case "needs_game_account":
      return { kind: "needs_game_account" };
    case "not_found":
      return { kind: "not_found" };
    case "ready":
      return { kind: "ready", detail: query.data.match };
    default: {
      const _exhaustive: never = query.data;
      return _exhaustive;
    }
  }
}
