import { describe, expect, it } from "vite-plus/test";
import { correlateBffApiRequest } from "./start.ts";

describe("global BFF request correlation", () => {
  it("correlates a players route that previously omitted request IDs", async () => {
    const requestId = "715f6cc1-ce62-4adf-a3f1-e8bc12fa0e68";
    const request = new Request("https://futrob.test/api/v1/players/me", {
      headers: { "X-Request-ID": requestId },
    });

    const response = await correlateBffApiRequest(request, "/api/v1/players/me", async () =>
      Response.json(
        { code: "auth.unauthenticated", messageKey: "errors.auth.unauthenticated" },
        { status: 401 },
      ),
    );

    expect(response.headers.get("x-request-id")).toBe(requestId);
    expect(await response.json()).toEqual({
      code: "auth.unauthenticated",
      messageKey: "errors.auth.unauthenticated",
      requestId,
    });
  });

  it("does not add API correlation to a page response", async () => {
    const request = new Request("https://futrob.test/player");
    const response = await correlateBffApiRequest(request, "/player", async () =>
      Response.json({ ok: true }),
    );

    expect(response.headers.get("x-request-id")).toBeNull();
  });
});
