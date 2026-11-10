import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const captureException = vi.fn();
const getClient = vi.fn();
const withSentry = vi.fn((configFn: (env: object) => unknown, handler: unknown) => {
  lastOptions = configFn;
  return handler;
});
let lastOptions: ((env: object) => unknown) | undefined;

vi.mock("@sentry/cloudflare", () => ({
  withSentry,
  captureException,
  getClient,
}));

const { captureWorkerError, withWorkerSentry } = await import("./sentry.ts");

describe("auth Sentry worker wrapper", () => {
  beforeEach(() => {
    captureException.mockReset();
    getClient.mockReset();
    lastOptions = undefined;
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

  it("enables in production with the auth service tag", () => {
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
    expect(options.initialScope.tags).toEqual({ service: "auth", environment: "production" });
    expect(options.sendDefaultPii).toBe(false);
    const sent = options.beforeSend(
      {
        request: {
          data: { password: "secret-pass" },
          headers: { Authorization: "Bearer session-token" },
        },
        user: { email: "ana@club.mx" },
      },
      {},
    );
    expect(JSON.stringify(sent)).not.toMatch(/secret-pass|session-token|ana@club\.mx/);
    expect(
      options.beforeSend({}, { originalException: { code: "INVALID_EMAIL_OR_PASSWORD" } }),
    ).toBeNull();
  });

  it("drops expected failures and captures defects", () => {
    getClient.mockReturnValue({});
    captureWorkerError({ code: "INVALID_EMAIL_OR_PASSWORD" });
    expect(captureException).not.toHaveBeenCalled();
    const defect = new Error("auth.request.failed");
    captureWorkerError(defect);
    expect(captureException).toHaveBeenCalledWith(defect);
  });

  it("sends nothing when the SDK is off", () => {
    getClient.mockReturnValue(undefined);
    captureWorkerError(new Error("boom"));
    expect(captureException).not.toHaveBeenCalled();
  });
});
