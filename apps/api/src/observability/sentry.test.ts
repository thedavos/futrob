import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

const init = vi.fn();
const captureException = vi.fn();
const getClient = vi.fn();

vi.mock("@sentry/node", () => ({
  init,
  captureException,
  getClient,
}));

const { captureUnexpectedError, initSentry, isSentryEnabled } = await import("./sentry.ts");

describe("API Sentry", () => {
  const originalDsn = process.env.SENTRY_DSN;
  const originalEnvironment = process.env.SENTRY_ENVIRONMENT;

  beforeEach(() => {
    init.mockReset();
    captureException.mockReset();
    getClient.mockReset();
    delete process.env.SENTRY_DSN;
    delete process.env.SENTRY_ENVIRONMENT;
  });

  afterEach(() => {
    if (originalDsn === undefined) delete process.env.SENTRY_DSN;
    else process.env.SENTRY_DSN = originalDsn;
    if (originalEnvironment === undefined) delete process.env.SENTRY_ENVIRONMENT;
    else process.env.SENTRY_ENVIRONMENT = originalEnvironment;
  });

  it("does not initialize in development", () => {
    process.env.SENTRY_DSN = "https://public@o0.ingest.sentry.io/1";
    getClient.mockReturnValue(undefined);
    initSentry({ nodeEnv: "development" });
    expect(init).not.toHaveBeenCalled();
    expect(isSentryEnabled()).toBe(false);
  });

  it("initializes in production with service tags and no PII", () => {
    process.env.SENTRY_DSN = "https://public@o0.ingest.sentry.io/1";
    process.env.SENTRY_ENVIRONMENT = "staging";
    initSentry({ nodeEnv: "production" });
    const options = init.mock.calls[0]?.[0] as {
      dsn: string;
      environment: string;
      sendDefaultPii: boolean;
      initialScope: { tags: Record<string, string> };
      beforeSend: (event: object, hint: object) => object | null;
    };
    expect(options).toMatchObject({
      dsn: "https://public@o0.ingest.sentry.io/1",
      environment: "staging",
      sendDefaultPii: false,
      initialScope: { tags: { service: "api", environment: "staging" } },
    });
    const requestId = "9b020aa7-9c5e-4cca-b8ea-daeb047c6dca";
    const sent = options.beforeSend(
      {
        request: {
          data: { token: "session-token" },
          headers: { Authorization: "Bearer session-token", "X-Request-ID": requestId },
        },
      },
      {},
    );
    expect(sent).toMatchObject({ tags: { request_id: requestId } });
    expect(JSON.stringify(sent)).not.toMatch(/session-token/);
    expect(options.beforeSend({}, { originalException: { code: "api.not_found" } })).toBeNull();
  });

  it("does not capture expected failures", () => {
    getClient.mockReturnValue({});
    captureUnexpectedError({ code: "api.not_found" });
    expect(captureException).not.toHaveBeenCalled();
    const defect = new Error("panic");
    captureUnexpectedError(defect);
    expect(captureException).toHaveBeenCalledWith(defect);
  });
});
