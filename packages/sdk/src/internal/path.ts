/**
 * Builds an encoded `/a/b/c` route from raw segments. Static words survive
 * `encodeURIComponent` unchanged, so callers never hand-roll path escaping.
 */
export function apiPath(...segments: readonly string[]): string {
  return `/${segments.map((segment) => encodeURIComponent(segment)).join("/")}`;
}
