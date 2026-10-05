import { useCallback, useEffect, useState } from "react";
import { FutrobApiError } from "@futrob/sdk";
import { loadPlayerHome } from "./load-player-home";
import type { PlayerHomeSnapshot } from "./player-home-model";

type PlayerHomeLoad = {
  readonly snapshot: PlayerHomeSnapshot | null;
  readonly loading: boolean;
  readonly failed: boolean;
};

/**
 * Loads the six-source snapshot for one explicit club. A retry keeps the current snapshot on
 * screen until the next one settles; a club change never presents the previous club's data.
 */
export function usePlayerHome(externalClubId: string | undefined, onUnauthorized: () => void) {
  const [load, setLoad] = useState<PlayerHomeLoad>({
    snapshot: null,
    loading: true,
    failed: false,
  });
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoad((current) => ({ ...current, loading: true }));
    loadPlayerHome({ externalClubId, signal: controller.signal })
      .then((snapshot) => {
        if (!controller.signal.aborted) setLoad({ snapshot, loading: false, failed: false });
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
