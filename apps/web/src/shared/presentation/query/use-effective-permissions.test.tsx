// @vitest-environment jsdom

import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type { EffectiveAccessDto } from "@futrob/api-contracts";
import { COMPETITION_PERMISSION } from "@futrob/competitions";
import { TEAM_PERMISSION } from "@futrob/teams";
import { QueryTestProvider } from "./query-test-utils.tsx";
import { useEffectivePermissions } from "./use-effective-permissions.ts";

const accessFor = (
  permissions: readonly { permission: string; allowed: boolean }[],
): EffectiveAccessDto => ({
  actorId: "actor-1",
  scope: { organizationId: "org-1" },
  roles: [],
  permissions: permissions.map((permission) => ({
    ...permission,
    decidedAt: "organization",
  })),
});

describe("useEffectivePermissions", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("starts with empty allowed while loading", async () => {
    let resolveFetch: ((value: Response) => void) | undefined;
    vi.mocked(fetch).mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const { result } = renderHook(
      () => useEffectivePermissions({ organizationId: "org-1" }, [COMPETITION_PERMISSION.update]),
      { wrapper: QueryTestProvider },
    );

    expect(result.current.capability.status).toBe("loading");
    expect(result.current.allowed.size).toBe(0);

    resolveFetch?.(
      new Response(
        JSON.stringify(accessFor([{ permission: COMPETITION_PERMISSION.update, allowed: true }])),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await waitFor(() => {
      expect(result.current.capability.status).toBe("ready");
      expect(result.current.allowed.has(COMPETITION_PERMISSION.update)).toBe(true);
    });
  });

  it("clears allowed permissions on 403", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 403 }));

    const { result } = renderHook(
      () => useEffectivePermissions({ organizationId: "org-1" }, [COMPETITION_PERMISSION.update]),
      { wrapper: QueryTestProvider },
    );

    await waitFor(() => {
      expect(result.current.capability.status).toBe("unavailable");
    });
    expect(result.current.allowed.size).toBe(0);
    expect(result.current.query.isError).toBe(true);
  });

  it("uses distinct query keys per authorization scope", async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = input instanceof Request ? input.url : input instanceof URL ? input.href : input;
      const allowed = url.includes("competitionId=c2");
      return new Response(
        JSON.stringify(
          accessFor([
            { permission: COMPETITION_PERMISSION.publish, allowed },
            {
              permission: TEAM_PERMISSION.rosterManage,
              allowed: url.includes("teamId=t1"),
            },
          ]),
        ),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });

    const first = renderHook(
      () =>
        useEffectivePermissions({ organizationId: "org-1", competitionId: "c1" }, [
          COMPETITION_PERMISSION.publish,
          TEAM_PERMISSION.rosterManage,
        ]),
      { wrapper: QueryTestProvider },
    );
    const second = renderHook(
      () =>
        useEffectivePermissions({ organizationId: "org-1", competitionId: "c2", teamId: "t1" }, [
          COMPETITION_PERMISSION.publish,
          TEAM_PERMISSION.rosterManage,
        ]),
      { wrapper: QueryTestProvider },
    );

    await waitFor(() => {
      expect(first.result.current.capability.status).toBe("ready");
      expect(second.result.current.capability.status).toBe("ready");
    });

    expect(first.result.current.allowed.has(COMPETITION_PERMISSION.publish)).toBe(false);
    expect(first.result.current.allowed.has(TEAM_PERMISSION.rosterManage)).toBe(false);
    expect(second.result.current.allowed.has(COMPETITION_PERMISSION.publish)).toBe(true);
    expect(second.result.current.allowed.has(TEAM_PERMISSION.rosterManage)).toBe(true);
  });
});
