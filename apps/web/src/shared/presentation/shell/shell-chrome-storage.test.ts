// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vite-plus/test";

import {
  SHELL_CHROME_STORAGE_KEY,
  readStoredShellChrome,
  writeStoredShellChrome,
} from "./shell-chrome-storage.ts";

describe("shell-chrome-storage", () => {
  afterEach(() => {
    window.localStorage.removeItem(SHELL_CHROME_STORAGE_KEY);
  });

  it("round-trips collapsed state", () => {
    writeStoredShellChrome({ collapsed: true });
    expect(readStoredShellChrome()).toEqual({ collapsed: true });
  });

  it("returns null for invalid payloads", () => {
    window.localStorage.setItem(SHELL_CHROME_STORAGE_KEY, JSON.stringify({ collapsed: "yes" }));
    expect(readStoredShellChrome()).toBeNull();
  });
});
