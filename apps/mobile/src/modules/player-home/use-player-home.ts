import { useCallback, useEffect, useState } from "react";
import { FutrobApiError } from "@futrob/sdk";
import { getFutrobClient } from "@/modules/api/futrob-client";
import { loadPlayerHome } from "./load-player-home";
import type { PlayerHomeSnapshot } from "./player-home-model";

type PlayerHomeLoad = {
  readonly snapshot: PlayerHomeSnapshot | null;
  readonly loading: boolean;
  readonly failed: boolean;
};

/**
 * Loads the six-source snapshot for one club. Without a club, the profile is read first and its
 * first association is handed to `onInitialClub`, so the snapshot loads once, for that club.
 * A retry keeps the current snapshot on screen until the next one settles; a club change never
 * presents the previous club's data.
 */
export function usePlayerHome(
  externalClubId: string | undefined,
  {
    onInitialClub,
    onUnauthorized,
  }: { onInitialClub: (id: string) => void; onUnauthorized: () => void },
) {
  const [load, setLoad] = useState<PlayerHomeLoad>({
    snapshot: null,
    loading: true,
    failed: false,
  });
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoad((current) => ({ ...current, loading: true }));
    const signal = controller.signal;
    initialClub(externalClubId, signal)
      .then(async (initial) => {
        if (signal.aborted) return;
        if (initial) return onInitialClub(initial);
        const snapshot = await loadPlayerHome({ externalClubId, signal });
        if (!signal.aborted) setLoad({ snapshot, loading: false, failed: false });
      })
      .catch((caught) => {
        if (controller.signal.aborted) return;
        if (caught instanceof FutrobApiError && caught.status === 401) {
          onUnauthorized();
          return;
        }
        setLoad((current) => ({ ...current, loading: false, failed: true }));
      });
    return () => controller.abort();
  }, [externalClubId, revision]);

  const snapshot = load.snapshot?.externalClubId === externalClubId ? load.snapshot : null;
  const retry = useCallback(() => setRevision((value) => value + 1), []);
  return { snapshot, loading: load.loading, failed: load.failed && !snapshot, retry };
}

async function initialClub(
  externalClubId: string | undefined,
  signal: AbortSignal,
): Promise<string | undefined> {
  if (externalClubId !== undefined) return undefined;
  try {
    const profile = await getFutrobClient().players.getProfile({ signal });
    return profile.externalClubs[0]?.externalClubId;
  } catch (error) {
    if (signal.aborted || (error instanceof FutrobApiError && error.status === 401)) throw error;
    // The snapshot reads the profile again and reports its failure per section.
    return undefined;
  }
}
