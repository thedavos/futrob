import { describe, expect, it } from "vite-plus/test";
import type { EffectiveAccessDto } from "@futrob/api-contracts";
import {
  EffectiveAccessHttpError,
  MOBILE_PERMISSION,
  ORG_COMMANDS,
  ORG_TABS,
  allowedFromCapabilityState,
  allowedPermissionSet,
  capabilityStateFromQuery,
  filterByPermission,
  orgTabsForAccess,
  presentShellAccess,
} from "./permissions.ts";

const withHome = {
  actorId: "actor-1",
  scope: { organizationId: "org-1" },
  roles: [],
  permissions: [
    {
      permission: MOBILE_PERMISSION.organizationsRead,
      allowed: true,
      decidedAt: "organization",
    },
  ],
} satisfies EffectiveAccessDto;

const withoutHome = {
  ...withHome,
  permissions: [
    {
      permission: MOBILE_PERMISSION.organizationsRead,
      allowed: false,
      decidedAt: "organization",
    },
  ],
} satisfies EffectiveAccessDto;

describe("mobile EffectiveAccess helpers", () => {
  it("org tabs omit home without organizations.read", () => {
    expect(orgTabsForAccess(allowedPermissionSet(withHome)).map((tab) => tab.id)).toEqual(["home"]);
    expect(orgTabsForAccess(allowedPermissionSet(withoutHome)).map((tab) => tab.id)).toEqual([]);
  });

  it("loading and unavailable hide privileged actions", () => {
    const loading = capabilityStateFromQuery({ fetchStatus: "pending", data: undefined });
    expect(loading.status).toBe("loading");
    expect(allowedFromCapabilityState(loading).size).toBe(0);
    expect(orgTabsForAccess(allowedFromCapabilityState(loading))).toEqual([]);

    const unavailable = capabilityStateFromQuery({ fetchStatus: "error", data: withHome });
    expect(unavailable.status).toBe("unavailable");
    expect(allowedFromCapabilityState(unavailable).size).toBe(0);
    expect(orgTabsForAccess(allowedFromCapabilityState(unavailable))).toEqual([]);
  });

  it("missing allowed set hides gated items", () => {
    const catalog = [
      { id: "public", label: "Public" },
      { id: "home", label: "Inicio", requiredPermission: MOBILE_PERMISSION.organizationsRead },
    ];
    expect(filterByPermission(catalog, undefined).map((item) => item.id)).toEqual(["public"]);
    expect(filterByPermission(ORG_TABS, undefined)).toEqual([]);
    expect(filterByPermission(ORG_COMMANDS, undefined)).toEqual([]);
  });

  it("effective-access 403 is recoverable and fail-closed", () => {
    const error = new EffectiveAccessHttpError(403);
    expect(error.status).toBe(403);
    expect(error.message).toBe("effective-access:403");
    const state = capabilityStateFromQuery({ fetchStatus: "error", data: withHome });
    expect(state.status).toBe("unavailable");
    expect(allowedFromCapabilityState(state).has(MOBILE_PERMISSION.organizationsRead)).toBe(false);
    expect(orgTabsForAccess(allowedFromCapabilityState(state))).toEqual([]);
    const presented = presentShellAccess({
      organizationId: "org-1",
      capability: state,
    });
    expect(presented.nav).toEqual([]);
    expect(presented.commands).toEqual([]);
    expect(presented.accessRetryable).toBe(true);
  });
});
