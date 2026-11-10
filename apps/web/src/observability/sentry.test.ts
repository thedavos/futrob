import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const captureException = vi.fn();
const getClient = vi.fn();
const setExtras = vi.fn();
const withSentry = vi.fn((configFn: (env: object) => unknown, handler: unknown) => {
  lastOptions = configFn;
  return handler;
});
let lastOptions: ((env: object) => unknown) | undefined;

vi.mock("@sentry/cloudflare", () => ({
  withSentry,
  captureException,
  getClient,
  getCurrentScope: () => ({ setExtras }),
}));

const { captureWorkerError, withWorkerSentry } = await import("./sentry.ts");

describe("web Sentry worker wrapper", () => {
  beforeEach(() => {
    captureException.mockReset();
    getClient.mockReset();
    setExtras.mockReset();
    lastOptions = undefined;
  });

  it("does not send when the SDK is not initialized", () => {
    getClient.mockReturnValue(undefined);
    captureWorkerError(new Error("boom"));
    expect(captureException).not.toHaveBeenCalled();
  });

  it("does not send options in development even with a DSN", () => {
    const worker = { fetch: () => new Response("ok") };
    expect(withWorkerSentry(worker)).toBe(worker);
    expect(
      lastOptions?.({
        SENTRY_DSN: "https://public@o0.ingest.sentry.io/1",
        NODE_ENV: "development",
      }),
    ).toEqual({ enabled: false });
  });

  it("enables in production with the web service tag and scrubs credentials", () => {
    withWorkerSentry({ fetch: () => new Response("ok") });
    const options = lastOptions?.({
      SENTRY_DSN: "https://public@o0.ingest.sentry.io/1",
      NODE_ENV: "production",
      SENTRY_ENVIRONMENT: "production",
    }) as {
      initialScope: { tags: Record<string, string> };
      sendDefaultPii: boolean;
      beforeSend: (event: object, hint: object) => object | null;
    };
    expect(options.initialScope.tags).toEqual({ service: "web", environment: "production" });
    expect(options.sendDefaultPii).toBe(false);
    const requestId = "9b020aa7-9c5e-4cca-b8ea-daeb047c6dca";
    const sent = options.beforeSend(
      {
        request: {
          data: { password: "secret-pass" },
          headers: { Authorization: "Bearer session-token", "X-Request-ID": requestId },
        },
        user: { email: "ana@club.mx" },
      },
      {},
    );
    expect(sent).toMatchObject({
      request: { headers: { Authorization: "[Filtered]", "X-Request-ID": requestId } },
      tags: { request_id: requestId },
    });
    expect(sent).not.toHaveProperty("request.data");
    expect(JSON.stringify(sent)).not.toMatch(/secret-pass|session-token|ana@club\.mx/);
  });

  it("drops expected failures and sends defects", () => {
    getClient.mockReturnValue({});
    captureWorkerError({ code: "api.not_found" });
    expect(captureException).not.toHaveBeenCalled();
    const defect = new Error("queue failed");
    captureWorkerError(defect, { handler: "queue" });
    expect(captureException).toHaveBeenCalledWith(defect);
    expect(setExtras).toHaveBeenCalledWith({ handler: "queue" });
  });
});
