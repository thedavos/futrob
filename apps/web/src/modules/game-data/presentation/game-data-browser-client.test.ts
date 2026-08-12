import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { gameDataBrowserClient } from "./game-data-browser-client.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("gameDataBrowserClient", () => {
  it("preserves the request ID from a club search error", async () => {
    const requestId = "8f3ac8de-da1a-415a-b29f-46c40c87367f";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          {
            code: "game_data.ea_clubs_timeout",
            messageKey: "errors.game_data.ea_clubs_timeout",
            requestId,
          },
          { status: 502, headers: { "X-Request-ID": requestId } },
        ),
      ),
    );

    const result = await gameDataBrowserClient.searchClubs({ query: "Fera" });

    expect(result.isErr()).toBe(true);
    const error = result.isErr() ? result.error : null;
    expect(error).toMatchObject({
      code: "game_data.ea_clubs_timeout",
      requestId,
      status: 502,
    });
  });
});
