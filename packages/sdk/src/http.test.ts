import { describe, expect, it } from "vite-plus/test";
import { FutrobApiError } from "./errors.ts";
import { HttpClient } from "./http.ts";

describe("HttpClient request correlation", () => {
  it("uses the response header when a legacy error body has no request ID", async () => {
    const requestId = "1f8c914e-a307-42aa-b2ea-ec6cfefaba83";
    const client = new HttpClient({
      baseUrl: "https://api.futrob.test",
      fetchImpl: async () =>
        Response.json(
          { code: "api.unauthorized", messageKey: "errors.api.unauthorized" },
          { status: 401, headers: { "X-Request-ID": requestId } },
        ),
    });

    const caught = await client
      .request({ path: "/identity/onboarding", method: "GET", parse: (data) => data })
      .catch((error: unknown) => error);

    expect(caught).toBeInstanceOf(FutrobApiError);
    expect(caught).toMatchObject({ requestId, status: 401 });
  });

  it("propagates retryAfterSeconds from a typed rate-limit response", async () => {
    const client = new HttpClient({
      baseUrl: "https://api.futrob.test",
      fetchImpl: async () =>
        Response.json(
          {
            code: "api.rate_limited",
            messageKey: "errors.api.rate_limited",
            retryAfterSeconds: 37,
          },
          { status: 429, headers: { "Retry-After": "37" } },
        ),
    });

    const caught = await client
      .request({ path: "/game-data/clubs/search", method: "GET", parse: (data) => data })
      .catch((error: unknown) => error);

    expect(caught).toBeInstanceOf(FutrobApiError);
    expect(caught).toMatchObject({
      code: "api.rate_limited",
      retryAfterSeconds: 37,
      status: 429,
    });
  });

  it("falls back to Retry-After when a legacy rate-limit body omits retry metadata", async () => {
    const client = new HttpClient({
      baseUrl: "https://api.futrob.test",
      fetchImpl: async () =>
        Response.json(
          { code: "api.rate_limited", messageKey: "errors.api.rate_limited" },
          { status: 429, headers: { "Retry-After": "41" } },
        ),
    });

    const caught = await client
      .request({ path: "/game-data/clubs/search", method: "GET", parse: (data) => data })
      .catch((error: unknown) => error);

    expect(caught).toMatchObject({ retryAfterSeconds: 41, status: 429 });
  });

  it("sends X-Request-ID on every request", async () => {
    let sent: string | null = null;
    const client = new HttpClient({
      baseUrl: "https://api.futrob.test",
      fetchImpl: async (_input, init) => {
        sent = new Headers(init?.headers).get("X-Request-ID");
        return Response.json({ ok: true });
      },
    });

    await client.request({ path: "/meta/ping", method: "GET", parse: (data) => data });

    expect(sent).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});
