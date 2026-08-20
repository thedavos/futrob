/** True when a browser `window` global exists (SSR-safe, no runtime `typeof`). */
export function hasBrowserWindow(): boolean {
  return "window" in globalThis && globalThis.window !== undefined;
}
