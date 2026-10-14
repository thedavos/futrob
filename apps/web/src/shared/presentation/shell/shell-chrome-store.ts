import { useSyncExternalStore } from "react";
import { hasBrowserWindow } from "@futrob/ui";
import {
  SHELL_CHROME_STORAGE_KEY,
  readStoredShellChrome,
  writeStoredShellChrome,
} from "@/shared/presentation/shell/shell-chrome-storage.ts";

const listeners = new Set<() => void>();
let collapsed = false;

function emit(): void {
  for (const listener of listeners) listener();
}

function hydrateFromStorage(): void {
  collapsed = readStoredShellChrome()?.collapsed ?? false;
}

function onStorage(event: StorageEvent): void {
  if (event.key !== SHELL_CHROME_STORAGE_KEY) return;
  hydrateFromStorage();
  emit();
}

hydrateFromStorage();

function subscribeShellChrome(listener: () => void): () => void {
  listeners.add(listener);
  if (hasBrowserWindow() && listeners.size === 1) {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && hasBrowserWindow()) {
      window.removeEventListener("storage", onStorage);
    }
  };
}

function getShellChromeCollapsed(): boolean {
  return collapsed;
}

function getServerSnapshot(): boolean {
  return false;
}

export function setShellChromeCollapsed(next: boolean): void {
  if (collapsed === next) return;
  collapsed = next;
  writeStoredShellChrome({ collapsed: next });
  emit();
}

export function useShellChromeCollapsed(): [boolean, (next: boolean) => void] {
  const value = useSyncExternalStore(
    subscribeShellChrome,
    getShellChromeCollapsed,
    getServerSnapshot,
  );
  return [value, setShellChromeCollapsed];
}
