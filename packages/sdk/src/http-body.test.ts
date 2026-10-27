import { getEventListeners } from "node:events";
import { createServer, type ServerResponse } from "node:http";
import { describe, expect, it, vi } from "vite-plus/test";
import { z } from "zod";
import { createFutrobClient } from "./client.ts";
import { FutrobApiError, FutrobRequestTimeoutError } from "./errors.ts";
import { HttpClient } from "./http.ts";

async function withServer(
  respond: (response: ServerResponse) => void,
  run: (baseUrl: string) => Promise<void>,
) {
  const server = createServer((_request, response) => respond(response));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing server address");
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

function partialBody(response: ServerResponse) {
  response.writeHead(200, { "Content-Type": "application/json" });
  response.write('{"ok":');
}

const identity = (data: unknown) => data;

describe("HttpClient body download", () => {
  it.each(["identity", "resource"])(
    "classifies body timeout with %s parser without retry",
    async (parser) => {
      let attempts = 0;
      let receivedHeaders = 0;
      await withServer(partialBody, async (baseUrl) => {
        const options = {
          baseUrl,
          timeoutMs: 100,
          maxRetries: 2,
          fetchImpl: async (input: string | URL | Request, init?: RequestInit) => {
            attempts += 1;
            const response = await fetch(input, init);
            receivedHeaders += 1;
            return response;
          },
        };
        const pending =
          parser === "resource"
            ? createFutrobClient(options).meta.ping()
            : new HttpClient(options).request({ path: "/", method: "GET", parse: identity });
        await expect(pending).rejects.toBeInstanceOf(FutrobRequestTimeoutError);
        expect(attempts).toBe(1);
        expect(receivedHeaders).toBe(1);
      });
    },
  );

  it.each([undefined, new Error("caller cancelled")])(
    "preserves cancellation during the body with reason %s",
    async (reason) => {
      let attempts = 0;
      const controller = new AbortController();
      await withServer(partialBody, async (baseUrl) => {
        const client = new HttpClient({
          baseUrl,
          maxRetries: 2,
          timeoutMs: 2_000,
          fetchImpl: async (input, init) => {
            attempts += 1;
            const response = await fetch(input, init);
            controller.abort(reason);
            return response;
          },
        });
        const error = await client
          .request({
            path: "/",
            method: "GET",
            parse: identity,
            options: { signal: controller.signal },
          })
          .catch((caught: unknown) => caught);
        expect(error).toBe(controller.signal.reason);
        expect(attempts).toBe(1);
      });
    },
  );

  it("rejects a disconnected body instead of passing null to the parser", async () => {
    let attempts = 0;
    await withServer(
      (response) => {
        partialBody(response);
        const timer = setTimeout(() => response.destroy(), 20);
        response.on("close", () => clearTimeout(timer));
      },
      async (baseUrl) => {
        const client = new HttpClient({
          baseUrl,
          fetchImpl: async (input, init) => {
            attempts += 1;
            return fetch(input, init);
          },
        });
        await expect(
          client.request({ path: "/", method: "GET", parse: identity }),
        ).rejects.toBeInstanceOf(TypeError);
        expect(attempts).toBe(1);
      },
    );
  });

  it.each(["GET", "POST", "PATCH", "PUT", "DELETE"] as const)(
    "uses the existing %s retry budget for stream failures",
    async (method) => {
      let attempts = 0;
      const client = new HttpClient({
        baseUrl: "https://example.test",
        maxRetries: 1,
        fetchImpl: async () => {
          attempts += 1;
          return attempts === 1
            ? new Response(
                new ReadableStream({
                  start(controller) {
                    controller.error(new TypeError("stream failed"));
                  },
                }),
              )
            : Response.json({ ok: true });
        },
      });
      const pending = client.request({ path: "/", method, parse: identity });
      if (method === "POST" || method === "PATCH") {
        await expect(pending).rejects.toBeInstanceOf(TypeError);
        expect(attempts).toBe(1);
      } else {
        await expect(pending).resolves.toEqual({ ok: true });
        expect(attempts).toBe(2);
      }
    },
  );

  it("keeps malformed JSON and 204 fallback, and resource validation", async () => {
    for (const status of [200, 204]) {
      const fetchImpl = async () => new Response(status === 204 ? null : "{invalid", { status });
      const options = { baseUrl: "https://example.test", fetchImpl };
      await expect(
        new HttpClient(options).request({ path: "/", method: "GET", parse: identity }),
      ).resolves.toBeNull();
      await expect(createFutrobClient(options).meta.ping()).rejects.toBeInstanceOf(z.ZodError);
    }
  });

  it("keeps HTTP errors for malformed error bodies", async () => {
    const client = new HttpClient({
      baseUrl: "https://example.test",
      fetchImpl: async () => new Response("{invalid", { status: 502 }),
    });
    await expect(
      client.request({ path: "/", method: "GET", parse: identity }),
    ).rejects.toBeInstanceOf(FutrobApiError);
  });

  it("does not retry resource parser failures", async () => {
    let attempts = 0;
    const client = createFutrobClient({
      baseUrl: "https://example.test",
      maxRetries: 2,
      fetchImpl: async () => {
        attempts += 1;
        return Response.json({ wrong: true });
      },
    });
    await expect(client.meta.ping()).rejects.toBeInstanceOf(z.ZodError);
    expect(attempts).toBe(1);
  });

  it.each(["success", "malformed", "http", "parser", "stream", "timeout", "cancel"])(
    "releases attempt resources after %s",
    async (outcome) => {
      vi.useFakeTimers();
      const controller = new AbortController();
      try {
        const client = new HttpClient({
          baseUrl: "https://example.test",
          timeoutMs: 100,
          fetchImpl: async (_input, init) => {
            if (outcome === "cancel") controller.abort(new Error("cancelled"));
            if (outcome === "stream")
              return new Response(
                new ReadableStream({
                  start(stream) {
                    stream.error(new SyntaxError("stream failed"));
                  },
                }),
              );
            if (outcome === "timeout" || outcome === "cancel") {
              return new Response(
                new ReadableStream({
                  start(stream) {
                    const onAbort = () => stream.error(init?.signal?.reason);
                    if (init?.signal?.aborted) onAbort();
                    else init?.signal?.addEventListener("abort", onAbort, { once: true });
                  },
                }),
              );
            }
            return new Response(outcome === "malformed" ? "{invalid" : "{}", {
              status: outcome === "http" ? 400 : 200,
            });
          },
        });
        const pending = client.request({
          path: "/",
          method: "GET",
          options: { signal: controller.signal },
          parse: (data) => {
            if (outcome === "parser") throw new Error("invalid resource");
            return data;
          },
        });
        const settled = pending.then(
          () => "resolved",
          () => "rejected",
        );
        if (outcome === "timeout") await vi.advanceTimersByTimeAsync(100);
        expect(await settled).toBe(
          ["success", "malformed"].includes(outcome) ? "resolved" : "rejected",
        );
        expect(vi.getTimerCount()).toBe(0);
        expect(getEventListeners(controller.signal, "abort")).toHaveLength(0);
      } finally {
        vi.useRealTimers();
      }
    },
  );
  it("releases the retry wait listener when the caller cancels", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    let attempts = 0;
    try {
      const client = new HttpClient({
        baseUrl: "https://example.test",
        maxRetries: 2,
        timeoutMs: 1_000,
        fetchImpl: async () => {
          attempts += 1;
          return new Response(null, { status: 503 });
        },
      });
      const pending = client.request({
        path: "/",
        method: "GET",
        parse: identity,
        options: { signal: controller.signal },
      });
      const settled = pending.catch((error: unknown) => error);
      setTimeout(() => controller.abort(new Error("cancel retry wait")), 100);
      await vi.advanceTimersByTimeAsync(100);
      expect(await settled).toBe(controller.signal.reason);
      expect(attempts).toBe(1);
      expect(vi.getTimerCount()).toBe(0);
      expect(getEventListeners(controller.signal, "abort")).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
