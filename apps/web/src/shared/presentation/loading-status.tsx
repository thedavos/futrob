"use client";

import { useRef } from "react";
import { applyStyles, useExternalSync, vis } from "@futrob/ui";

/**
 * Polite live region that mounts empty and writes its message on the next
 * frame. Screen readers skip a status region that appears already filled, so
 * this keeps a loading state that is present on the first render audible.
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
    const frame = window.requestAnimationFrame(() => {
      node.textContent = message;
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [message]);

  return <span aria-atomic="true" ref={ref} role="status" {...applyStyles(vis.srOnly)} />;
}
