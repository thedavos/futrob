import { describe, expect, it } from "vite-plus/test";
import { FutrobApiError, FutrobRequestTimeoutError } from "./errors.ts";
import { HttpClient } from "./http.ts";
import type { HttpResponseBody } from "./wire-body.ts";

function parse(data: HttpResponseBody): HttpResponseBody {
  return data;
}

describe("HttpClient retries", () => {
  it("retries idempotent GET requests on 5xx until success", async () => {
    let attempts = 0;
    const client = new HttpClient({
      baseUrl: "https://api.futrob.test",
      maxRetries: 2,
      fetchImpl: async () => {
        attempts += 1;
        return attempts === 1
          ? Response.json({ code: "api.unavailable", messageKey: "errors.api" }, { status: 503 })
          : Response.json({ ok: true });
      },
    });

    const result = await client.request({ path: "/meta/ping", method: "GET", parse });

    expect(result).toEqual({ ok: true });
    expect(attempts).toBe(2);
  });

  it("never retries POST/PATCH from the client-level budget alone", async () => {
    let attempts = 0;
    const client = new HttpClient({
      baseUrl: "https://api.futrob.test",
      maxRetries: 3,
      fetchImpl: async () => {
        attempts += 1;
        return Response.json(
          { code: "api.unavailable", messageKey: "errors.api" },
          { status: 500 },
        );
      },
    });

    await expect(
      client.request({ path: "/organizations", method: "POST", body: {}, parse }),
    ).rejects.toBeInstanceOf(FutrobApiError);
    expect(attempts).toBe(1);
  });

  it("retries non-idempotent verbs when the request opts in with maxRetries", async () => {
    let attempts = 0;
    const client = new HttpClient({
      baseUrl: "https://api.futrob.test",
      fetchImpl: async (_input, init) => {
        attempts += 1;
        void init;
        return attempts === 1
          ? Response.json({ code: "api.rate_limited", messageKey: "errors.api" }, { status: 429 })
          : Response.json({ ok: true });
      },
    });

    const result = await client.request({
      path: "/internal/game-data/sync-jobs/run-next",
      method: "POST",
      parse,
      options: { maxRetries: 2 },
    });

    expect(result).toEqual({ ok: true });
    expect(attempts).toBe(2);
  });

  it("lets a per-request maxRetries of 0 disable the client default", async () => {
    let attempts = 0;
    const client = new HttpClient({
      baseUrl: "https://api.futrob.test",
      maxRetries: 3,
      fetchImpl: async () => {
        attempts += 1;
        return Response.json({ code: "api.error", messageKey: "errors.api" }, { status: 500 });
      },
    });

    await expect(
      client.request({
        path: "/meta/ping",
        method: "GET",
        parse,
        options: { maxRetries: 0 },
      }),
    ).rejects.toBeInstanceOf(FutrobApiError);
    expect(attempts).toBe(1);
  });

  it("does not retry aborted requests even with budget left", async () => {
    let attempts = 0;
    const controller = new AbortController();
    const client = new HttpClient({
      baseUrl: "https://api.futrob.test",
      maxRetries: 3,
      fetchImpl: async () => {
        attempts += 1;
        return Response.json({ code: "api.error", messageKey: "errors.api" }, { status: 500 });
      },
    });
    controller.abort();

    await expect(
      client.request({
        path: "/meta/ping",
        method: "GET",
        parse,
        options: { signal: controller.signal },
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(attempts).toBe(1);
  });
});

describe("HttpClient timeouts and signals", () => {
  it("throws FutrobRequestTimeoutError when the per-attempt timeout fires", async () => {
    const client = new HttpClient({
      baseUrl: "https://api.futrob.test",
      timeoutMs: 20,
      fetchImpl: (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        }),
    });

    const error = await client
      .request({ path: "/game-data/clubs/search?q=x", method: "GET", parse })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(FutrobRequestTimeoutError);
    expect((error as FutrobRequestTimeoutError).timeoutMs).toBe(20);
  });

  it("surfaces user aborts instead of retrying them", async () => {
    let attempts = 0;
    const controller = new AbortController();
    const client = new HttpClient({
      baseUrl: "https://api.futrob.test",
      maxRetries: 3,
      fetchImpl: async () => {
        attempts += 1;
        const error = new Error("The operation was aborted");
        error.name = "AbortError";
        throw error;
      },
    });
    controller.abort();

    await expect(
      client.request({
        path: "/meta/ping",
        method: "GET",
        parse,
        options: { signal: controller.signal },
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(attempts).toBe(1);
  });

  it("aborts a pending attempt when the caller's signal fires mid-flight", async () => {
    const controller = new AbortController();
    const client = new HttpClient({
      baseUrl: "https://api.futrob.test",
      fetchImpl: (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const error = new Error("The operation was aborted");
            error.name = "AbortError";
            reject(error);
          });
        }),
    });

    const pending = client.request({
      path: "/meta/ping",
      method: "GET",
      parse,
      options: { signal: controller.signal },
    });
    setTimeout(() => controller.abort(), 10);

    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("HttpClient header layering", () => {
  it("merges per-request headers above client-level extras", async () => {
    let sent: Record<string, string> = {};
    const client = new HttpClient({
      baseUrl: "https://api.futrob.test",
      getExtraHeaders: () => ({ "X-Futrob-Actor-Id": "actor-1", "X-Trace": "client" }),
      fetchImpl: async (_input, init) => {
        sent = Object.fromEntries(new Headers(init?.headers).entries());
        return Response.json({ ok: true });
      },
    });

    await client.request({
      path: "/meta/ping",
      method: "GET",
      parse,
      options: { headers: { "X-Trace": "request" } },
    });

    expect(sent["x-futrob-actor-id"]).toBe("actor-1");
    expect(sent["x-trace"]).toBe("request");
  });

  it("propagates Retry-After into the typed error", async () => {
    const client = new HttpClient({
      baseUrl: "https://api.futrob.test",
      fetchImpl: async () =>
        Response.json(
          { code: "api.rate_limited", messageKey: "errors.api.rate_limited" },
          { status: 429, headers: { "Retry-After": "7" } },
        ),
    });

    await expect(
      client.request({ path: "/game-data/clubs/search", method: "GET", parse }),
    ).rejects.toMatchObject({
      code: "api.rate_limited",
      retryAfterSeconds: 7,
      status: 429,
    });
  });
});
