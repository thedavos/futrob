import { hasBrowserWindow } from "@futrob/ui";
import { z } from "zod";

export const SHELL_CHROME_STORAGE_KEY = "futrob.shell-chrome";

export type ShellChromeState = {
  readonly collapsed: boolean;
};

const shellChromeStateSchema = z.object({
  collapsed: z.boolean(),
});

export function readStoredShellChrome(): ShellChromeState | null {
  if (!hasBrowserWindow()) return null;
  try {
    const raw = window.localStorage.getItem(SHELL_CHROME_STORAGE_KEY);
    if (!raw) return null;
    const parsed = shellChromeStateSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function writeStoredShellChrome(state: ShellChromeState): void {
  if (!hasBrowserWindow()) return;
  try {
    window.localStorage.setItem(SHELL_CHROME_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota / private mode
  }
}
