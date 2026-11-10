import { afterEach, describe, expect, it, vi } from "vite-plus/test";

const captureException = vi.fn();
const getClient = vi.fn();
const setExtras = vi.fn();

vi.mock("@sentry/cloudflare", () => ({
  captureException: (...args: unknown[]) => captureException(...args),
  getClient: () => getClient(),
  getCurrentScope: () => ({ setExtras }),
  withSentry: (_factory: unknown, handler: unknown) => handler,
}));

afterEach(() => {
  captureException.mockReset();
  getClient.mockReset();
  setExtras.mockReset();
});

describe("captureWorkerError", () => {
  it("does not capture when Sentry is not initialized", async () => {
    getClient.mockReturnValue(undefined);
    const { captureWorkerError } = await import("./sentry.ts");
    captureWorkerError(new Error("boom"));
    expect(captureException).not.toHaveBeenCalled();
  });

  it("does not capture an expected TaggedError when Sentry is on", async () => {
    getClient.mockReturnValue({});
    const { captureWorkerError } = await import("./sentry.ts");
    captureWorkerError({ code: "auth.unavailable", message: "down" });
    expect(captureException).not.toHaveBeenCalled();
  });

  it("captures a generic Error when Sentry is on", async () => {
    getClient.mockReturnValue({});
    const { captureWorkerError } = await import("./sentry.ts");
    const error = new Error("loader crashed");
    captureWorkerError(error, { handler: "route-error" });
    expect(setExtras).toHaveBeenCalledWith({ handler: "route-error" });
    expect(captureException).toHaveBeenCalledWith(error);
  });
});
