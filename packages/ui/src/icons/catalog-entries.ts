import type { FutrobIconEntry } from "./catalog.ts";
import { FUTROB_ICON_CATALOG_A } from "./catalog-entries-a.ts";
import { FUTROB_ICON_CATALOG_B } from "./catalog-entries-b.ts";

/** Phosphor icons used by `@futrob/ui` and `apps/web`. Prefer `*Icon` exports. */
export const FUTROB_ICON_CATALOG = [
  ...FUTROB_ICON_CATALOG_A,
  ...FUTROB_ICON_CATALOG_B,
] as const satisfies readonly FutrobIconEntry[];
