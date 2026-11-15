import type { PermissionDto } from "@futrob/api-contracts";
import { workspaceContextPath, type WorkspaceContext } from "@futrob/sdk";
import { MOBILE_PERMISSION } from "@/modules/authorization/permissions";

/**
 * Bottom tabs of each context (design.md: «La app nativa usa Expo Router con tabs para los
 * destinos frecuentes y Stack/overlays nativos para detalle y operaciones. Más agrupa
 * destinos secundarios»). Each tab is a route file in that context's `(tabs)` group. Gated tabs follow the same permission as the
 * web navigation item; the API authorizes every request again.
 *
 * To add a destination: add its id and copy, add the route file under the context's `(tabs)`
 * folder (its path below the context root is `path`), and list it here before `more`.
 */
export type ContextTabId = "home" | "matches" | "statistics" | "competitions" | "overview" | "more";

export type ContextTabDefinition = {
  readonly id: ContextTabId;
  /** Path below the context root; empty for the root itself. */
  readonly path: string;
  readonly requiredPermission?: PermissionDto;
};

export type ContextTab = {
  readonly id: ContextTabId;
  readonly href: string;
  /** Hidden until `EffectiveAccess` allows it; the focused tab always stays visible. */
  readonly allowed: boolean;
};

const MORE: ContextTabDefinition = { id: "more", path: "/more" };

export const CONTEXT_TABS = {
  personal: [
    { id: "home", path: "" },
    { id: "matches", path: "/matches" },
    { id: "statistics", path: "/statistics" },
    { id: "competitions", path: "/competitions" },
    MORE,
  ],
  organization: [
    {
      id: "home",
      path: "",
      requiredPermission: MOBILE_PERMISSION.organizationsRead,
    },
    MORE,
  ],
  competition: [{ id: "overview", path: "" }, MORE],
} as const satisfies Record<WorkspaceContext["kind"], readonly ContextTabDefinition[]>;

/** The context's root route without the personal club query, which tabs do not carry. */
function contextRoot(context: WorkspaceContext): string {
  return workspaceContextPath(context.kind === "personal" ? { kind: "personal" } : context);
}

/**
 * Tabs for a context. While access is unknown (`undefined`) gated tabs stay hidden, as on web
 * («mantener acciones protegidas ocultas mientras no haya una decisión permitida»).
 */
export function contextTabs(
  context: WorkspaceContext,
  allowedPermissions: ReadonlySet<string> | undefined,
): readonly ContextTab[] {
  const definitions: readonly ContextTabDefinition[] = CONTEXT_TABS[context.kind];
  const root = contextRoot(context);
  return definitions.map((definition) => ({
    id: definition.id,
    href: `${root}${definition.path}`,
    allowed:
      definition.requiredPermission === undefined ||
      allowedPermissions?.has(definition.requiredPermission) === true,
  }));
}

/** Secondary destinations listed in «Más», as full routes (they stack above the shell). */
export type MoreDestinationId = "ea-clubs" | "game-accounts" | "explore";

export type MoreDestination = { readonly id: MoreDestinationId; readonly href: string };

export const MORE_DESTINATIONS = {
  personal: [
    { id: "ea-clubs", href: "/player/ea-clubs" },
    { id: "game-accounts", href: "/player/game-accounts" },
    { id: "explore", href: "/player/explore" },
  ],
  organization: [],
  competition: [],
} as const satisfies Record<WorkspaceContext["kind"], readonly MoreDestination[]>;
