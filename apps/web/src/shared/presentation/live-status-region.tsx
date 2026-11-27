import { useSyncExternalStore } from "react";
import { applyStyles, useExternalSync, vis } from "@futrob/ui";

let message = "";
const listeners = new Set<() => void>();

function emit(next: string) {
  if (message === next) return;
  message = next;
  for (const listener of listeners) listener();
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

function getSnapshot() {
  return message;
}

function getServerSnapshot() {
  return "";
}

/** Persistent polite live region. Mount once in a layout; publish with `useLiveStatus`. */
export function LiveStatusRegion() {
  const text = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return (
    <span
      aria-atomic="true"
      aria-label={text || undefined}
      aria-live="polite"
      role="status"
      {...applyStyles(vis.srOnly)}
    >
      {text}
    </span>
  );
}

/** Writes into `LiveStatusRegion` after paint so assistive tech sees a live update. */
export function useLiveStatus(text: string) {
  useExternalSync(() => {
    emit(text);
    return () => {
      emit("");
    };
  }, [text]);
}

export function resetLiveStatus() {
  emit("");
}
