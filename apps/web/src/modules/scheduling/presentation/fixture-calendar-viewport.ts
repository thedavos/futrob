import { useSyncExternalStore } from "react";
import { hasBrowserWindow } from "@futrob/ui";

/** Same width as `media.md`: below it a seven-column month no longer fits a day's content. */
const MONTH_VIEW_QUERY = "(min-width: 48rem)";

function subscribe(onChange: () => void): () => void {
  if (!hasBrowserWindow()) return () => undefined;
  const query = window.matchMedia(MONTH_VIEW_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function snapshot(): boolean {
  if (!hasBrowserWindow()) return false;
  return window.matchMedia(MONTH_VIEW_QUERY).matches;
}

/**
 * Whether the month view fits. The server and the first client render assume it does
 * not, so the page starts on the agenda everywhere and only offers the month once the
 * browser confirms the width.
 */
export function useFixtureMonthViewFits(): boolean {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
