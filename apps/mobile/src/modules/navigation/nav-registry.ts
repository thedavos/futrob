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
export type ContextTabId = "home" | "overview" | "more";

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
  personal: [{ id: "home", path: "" }, MORE],
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

/**
 * Secondary destinations listed in «Más». Each is a full route below the context root that
 * stacks above the shell; gated ones follow the web permission and stay hidden until allowed.
 */
export type MoreDestinationId = "teams" | "activity" | "team" | "members" | "settings";

export type MoreDestinationDefinition = {
  readonly id: MoreDestinationId;
  /** Path below the context root. */
  readonly path: string;
  readonly requiredPermission?: PermissionDto;
};

export type MoreDestination = { readonly id: MoreDestinationId; readonly href: string };

export const MORE_DESTINATIONS = {
  personal: [
    { id: "teams", path: "/teams" },
    { id: "activity", path: "/activity" },
  ],
  organization: [
    {
      id: "members",
      path: "/members",
      requiredPermission: MOBILE_PERMISSION.organizationsMembershipsRead,
    },
    {
      id: "settings",
      path: "/settings",
      requiredPermission: MOBILE_PERMISSION.organizationsUpdate,
    },
    { id: "activity", path: "/activity" },
  ],
  competition: [{ id: "team", path: "/team" }],
} as const satisfies Record<WorkspaceContext["kind"], readonly MoreDestinationDefinition[]>;

/** «Más» destinations the context offers now; gated ones wait for `EffectiveAccess`. */
export function moreDestinations(
  context: WorkspaceContext,
  allowedPermissions: ReadonlySet<string> | undefined,
): readonly MoreDestination[] {
  const definitions: readonly MoreDestinationDefinition[] = MORE_DESTINATIONS[context.kind];
  const root = contextRoot(context);
  return definitions
    .filter(
      (definition) =>
        definition.requiredPermission === undefined ||
        allowedPermissions?.has(definition.requiredPermission) === true,
    )
    .map((definition) => ({ id: definition.id, href: `${root}${definition.path}` }));
}
