"use client";

import { getMyRecentMatchPathSchema } from "@futrob/api-contracts";
import type { MatchSortOrder, PlayerMatchesView } from "./player-match-view.ts";
import { ProviderMatchDetailQuery } from "./provider-match-detail-query.tsx";
import { ProviderMatchDetailView } from "./provider-match-detail-page.tsx";

export function ProviderMatchDetailRoute({
  externalMatchId,
  providerKey,
  sort,
  view,
}: {
  readonly externalMatchId: string;
  readonly providerKey: string;
  readonly sort: MatchSortOrder;
  readonly view: PlayerMatchesView;
}) {
  const path = getMyRecentMatchPathSchema.safeParse({ externalMatchId, providerKey });
  if (!path.success) {
    return <ProviderMatchDetailView sort={sort} state={{ kind: "not_found" }} view={view} />;
  }
  return (
    <ProviderMatchDetailQuery
      externalMatchId={path.data.externalMatchId}
      providerKey={path.data.providerKey}
      sort={sort}
      view={view}
    />
  );
}
