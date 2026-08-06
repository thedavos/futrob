export const SHELL_CHROME_STORAGE_KEY = "futrob.shell-chrome";

export type ShellChromeState = {
  readonly collapsed: boolean;
};

export function readStoredShellChrome(): ShellChromeState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SHELL_CHROME_STORAGE_KEY);
    if (!raw) return null;
    return parseStoredShellChrome(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function writeStoredShellChrome(state: ShellChromeState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SHELL_CHROME_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota / private mode
  }
}

function parseStoredShellChrome(value: unknown): ShellChromeState | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.collapsed !== "boolean") return null;
  return { collapsed: record.collapsed };
}
