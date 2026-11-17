import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const init = vi.fn();
const captureException = vi.fn();
const getClient = vi.fn();

vi.mock("@sentry/node", () => ({
  init,
  captureException,
  getClient,
}));

const { captureAuthError, initSentry } = await import("./sentry.ts");

describe("auth Sentry", () => {
  beforeEach(() => {
    init.mockReset();
    captureException.mockReset();
    getClient.mockReset();
  });

  it("does not initialize in development even with a DSN", () => {
    initSentry({ SENTRY_DSN: "https://public@o0.ingest.sentry.io/1", NODE_ENV: "development" });
    expect(init).not.toHaveBeenCalled();
  });

  it("enables in production with the auth service tag", () => {
    initSentry({
      SENTRY_DSN: "https://public@o0.ingest.sentry.io/1",
      NODE_ENV: "production",
      SENTRY_ENVIRONMENT: "production",
    });
    const options = init.mock.calls[0]?.[0] as {
      initialScope: { tags: Record<string, string> };
      dataCollection: { userInfo: boolean; httpBodies: unknown[] };
      traceLifecycle: "static" | "stream";
      beforeSend: (event: object, hint: object) => object | null;
      beforeSendTransaction: (event: object) => object | null;
    };
    expect(options.initialScope.tags).toEqual({ service: "auth", environment: "production" });
    expect(
      JSON.stringify(
        options.beforeSendTransaction({
          transaction: "GET /roster-invitations/accept/SYNTHETIC_INVITE_TOKEN",
        }),
      ),
    ).not.toMatch(/SYNTHETIC_INVITE_TOKEN/);
    expect(options.dataCollection.userInfo).toBe(false);
    expect(options.dataCollection.httpBodies).toEqual([]);
    expect(options.traceLifecycle).toBe("static");
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
    captureAuthError({ code: "INVALID_EMAIL_OR_PASSWORD" });
    expect(captureException).not.toHaveBeenCalled();
    const defect = new Error("auth.request.failed");
    captureAuthError(defect);
    expect(captureException).toHaveBeenCalledWith(defect);
  });

  it("sends nothing when the SDK is off", () => {
    getClient.mockReturnValue(undefined);
    captureAuthError(new Error("boom"));
    expect(captureException).not.toHaveBeenCalled();
  });
});
