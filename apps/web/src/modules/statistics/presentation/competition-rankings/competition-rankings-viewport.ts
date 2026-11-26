import { useSyncExternalStore } from "react";
import { hasBrowserWindow } from "@futrob/ui";

/**
 * Where the player detail lives: beside the table on wide desktops (`media.xl`), in a
 * centered dialog on tablets (`media.md`) and in a bottom sheet on phones.
 */
export type RankingDetailHost = "aside" | "dialog" | "sheet";

const ASIDE_QUERY = "(min-width: 80rem)";
const DIALOG_QUERY = "(min-width: 48rem)";

function matches(query: string): boolean {
  return hasBrowserWindow() && window.matchMedia(query).matches;
}

function subscribe(onChange: () => void): () => void {
  if (!hasBrowserWindow()) return () => undefined;
  const lists = [window.matchMedia(ASIDE_QUERY), window.matchMedia(DIALOG_QUERY)];
  for (const list of lists) list.addEventListener("change", onChange);
  return () => {
    for (const list of lists) list.removeEventListener("change", onChange);
  };
}

function snapshot(): RankingDetailHost {
  if (matches(ASIDE_QUERY)) return "aside";
  return matches(DIALOG_QUERY) ? "dialog" : "sheet";
}

/**
 * The server and the first client render assume a phone, so no empty side panel flashes
 * before the browser confirms the width; nothing is selected before hydration anyway.
 */
export function useRankingDetailHost(): RankingDetailHost {
  return useSyncExternalStore(subscribe, snapshot, () => "sheet");
}
