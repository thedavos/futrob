"use client";

import { useRef } from "react";
import { applyStyles, useExternalSync, vis } from "@futrob/ui";

/**
 * Delay between mounting the empty region and writing its message. Screen
 * readers register a live region from the accessibility tree, which updates
 * after the browser renders; a frame callback can run before that, so wait
 * long enough for the empty region to be picked up first (React Aria's live
 * announcer uses the same margin).
 */
export const LOADING_STATUS_DELAY_MS = 100;

/**
 * Polite live region that mounts empty and writes its message shortly after.
 * Screen readers skip a status region that appears already filled, so this
 * keeps a loading state that is present on the first render audible.
 * Render it outside any `aria-busy` subtree; pass `""` to clear it.
 */
export function LoadingStatus({ message }: { readonly message: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useExternalSync(() => {
    const node = ref.current;
    if (!node) return;
    if (!message) {
      node.textContent = "";
      return;
    }
    const timer = window.setTimeout(() => {
      node.textContent = message;
    }, LOADING_STATUS_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [message]);

  return <span aria-atomic="true" ref={ref} role="status" {...applyStyles(vis.srOnly)} />;
}
