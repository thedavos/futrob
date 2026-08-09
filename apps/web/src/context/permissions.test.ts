import { describe, expect, it } from "vite-plus/test";
import type { EffectiveAccessDto } from "@futrob/api-contracts";
import { COMPETITION_PERMISSION } from "@futrob/competitions";
import { TEAM_PERMISSION } from "@futrob/teams";
import {
  EffectiveAccessHttpError,
  allowedFromCapabilityState,
  allowedPermissionSet,
  capabilityStateFromQuery,
} from "./permissions.ts";

const sampleAccess = {
  actorId: "actor-1",
  scope: { organizationId: "org-1" },
  roles: [],
  permissions: [
    { permission: COMPETITION_PERMISSION.update, allowed: true, decidedAt: "organization" },
    { permission: COMPETITION_PERMISSION.publish, allowed: false, decidedAt: "organization" },
    { permission: TEAM_PERMISSION.rosterManage, allowed: true, decidedAt: "team" },
  ],
} satisfies EffectiveAccessDto;

describe("allowedPermissionSet", () => {
  it("keeps only allowed permissions", () => {
    expect([...allowedPermissionSet(sampleAccess)].sort()).toEqual([
      COMPETITION_PERMISSION.update,
      TEAM_PERMISSION.rosterManage,
    ]);
  });

  it("returns empty for missing access", () => {
    expect(allowedPermissionSet(undefined).size).toBe(0);
  });
});

describe("capabilityStateFromQuery", () => {
  it("is loading when pending without data", () => {
    expect(capabilityStateFromQuery({ fetchStatus: "pending", data: undefined })).toEqual({
      status: "loading",
    });
  });

  it("is unavailable on error even when stale data exists", () => {
    expect(capabilityStateFromQuery({ fetchStatus: "error", data: sampleAccess })).toEqual({
      status: "unavailable",
    });
    expect(
      allowedFromCapabilityState(
        capabilityStateFromQuery({ fetchStatus: "error", data: sampleAccess }),
      ).size,
    ).toBe(0);
  });

  it("is ready with allowed set on success", () => {
    const state = capabilityStateFromQuery({ fetchStatus: "success", data: sampleAccess });
    expect(state.status).toBe("ready");
    if (state.status !== "ready") return;
    expect(state.allowed.has(COMPETITION_PERMISSION.update)).toBe(true);
    expect(state.allowed.has(COMPETITION_PERMISSION.publish)).toBe(false);
  });

  it("keeps ready data while a background refetch is pending", () => {
    const state = capabilityStateFromQuery({ fetchStatus: "pending", data: sampleAccess });
    expect(state.status).toBe("ready");
    if (state.status !== "ready") return;
    expect(state.allowed.has(TEAM_PERMISSION.rosterManage)).toBe(true);
  });
});

describe("EffectiveAccessHttpError", () => {
  it("carries the HTTP status for 403 handling", () => {
    const error = new EffectiveAccessHttpError(403);
    expect(error.status).toBe(403);
    expect(error.message).toBe("effective-access:403");
  });
});
