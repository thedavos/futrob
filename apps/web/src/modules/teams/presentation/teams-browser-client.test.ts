import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { teamsBrowserClient, TeamsClientError } from "./teams-browser-client.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("teamsBrowserClient management reads", () => {
  it("loads a bounded competition Team page", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json({ items: [], nextCursor: null }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await teamsBrowserClient.listCompetitionManagement("org/1", "competition/1", {
      cursor: "next cursor",
      limit: 10,
    });

    expect(result).toEqual({ items: [], nextCursor: null });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/organizations/org%2F1/competitions/competition%2F1/team-management?limit=10&cursor=next+cursor",
      expect.objectContaining({ credentials: "include", method: "GET" }),
    );
  });

  it("keeps the typed support code when a detail read is forbidden", async () => {
    const requestId = "16feecf8-07f3-460e-8b09-e7c098445fde";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          {
            code: "authorization.forbidden",
            messageKey: "errors.authorization.forbidden",
            requestId,
          },
          { status: 403, headers: { "X-Request-ID": requestId } },
        ),
      ),
    );

    const caught = await teamsBrowserClient
      .getCompetitionTeamManagement("org-1", "competition-1", "team-1")
      .catch((error: unknown) => error);

    expect(caught).toBeInstanceOf(TeamsClientError);
    expect(caught).toMatchObject({
      status: 403,
      code: "authorization.forbidden",
      requestId,
    });
  });
});
