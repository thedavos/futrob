import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestUrl } from "@tanstack/react-start/server";

/**
 * Origin the visitor reached the site on, for absolute URLs in `<head>` (canonical,
 * Open Graph). SSR reads the incoming request; client navigation reads the window.
 */
export const getSiteOrigin = createIsomorphicFn()
  .server(() => getRequestUrl().origin)
  .client(() => window.location.origin);
