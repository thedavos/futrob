// @vitest-environment jsdom

import { StrictMode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("authClient session resource", () => {
  it("deduplicates the initial session request when mounted under StrictMode", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        session: { id: "session-1" },
        user: { id: "actor-1" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.resetModules();
    const { authClient } = await import("./auth-client.ts");

    function SessionProbe() {
      const session = authClient.useSession();
      return <p>{session.isPending ? "Comprobando" : session.data?.user.id}</p>;
    }

    render(
      <StrictMode>
        <SessionProbe />
      </StrictMode>,
    );

    expect(await screen.findByText("actor-1")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
