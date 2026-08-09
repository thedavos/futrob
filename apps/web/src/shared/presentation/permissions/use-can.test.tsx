// @vitest-environment jsdom

import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { COMPETITION_PERMISSION } from "@futrob/competitions";
import { QueryTestProvider } from "@/shared/presentation/query/query-test-utils.tsx";
import { useCan, useCapabilities } from "./use-can.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

function accessPayload(permissions: ReadonlyArray<{ permission: string; allowed: boolean }>) {
  return {
    actorId: "actor-1",
    scope: { organizationId: "org-1" },
    roles: [],
    permissions: permissions.map((row) => ({ ...row, decidedAt: "organization" })),
    evaluatedAt: "2026-08-09T12:00:00.000Z",
  };
}

describe("useCan", () => {
  it("is loading then allowed when the permission is granted", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          accessPayload([{ permission: COMPETITION_PERMISSION.update, allowed: true }]),
        ),
      ),
    );

    const { result } = renderHook(
      () => useCan({ organizationId: "org-1" }, COMPETITION_PERMISSION.update),
      { wrapper: QueryTestProvider },
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.allowed).toBe(false);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.allowed).toBe(true);
    expect(result.current.unavailable).toBe(false);
  });

  it("stays denied when the query errors (fail-closed)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 403 })),
    );

    const { result } = renderHook(
      () => useCan({ organizationId: "org-1" }, COMPETITION_PERMISSION.update),
      { wrapper: QueryTestProvider },
    );

    await waitFor(() => expect(result.current.unavailable).toBe(true));
    expect(result.current.allowed).toBe(false);
    expect(result.current.loading).toBe(false);
  });
});

describe("useCapabilities", () => {
  it("maps a permission registry to booleans", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          accessPayload([
            { permission: COMPETITION_PERMISSION.update, allowed: true },
            { permission: COMPETITION_PERMISSION.publish, allowed: false },
          ]),
        ),
      ),
    );

    const map = {
      update: COMPETITION_PERMISSION.update,
      publish: COMPETITION_PERMISSION.publish,
    } as const;

    const { result } = renderHook(() => useCapabilities({ organizationId: "org-1" }, map), {
      wrapper: QueryTestProvider,
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.update).toBe(true);
    expect(result.current.publish).toBe(false);
    expect(result.current.unavailable).toBe(false);
  });
});
