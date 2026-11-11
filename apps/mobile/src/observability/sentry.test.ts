import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const init = vi.fn();
const setUser = vi.fn();
const getClient = vi.fn();
const wrap = vi.fn(<T>(component: T) => component);
const captureException = vi.fn();

vi.mock("@sentry/react-native", () => ({
  init,
  setUser,
  getClient,
  wrap,
  captureException,
}));

const { bindSentryActor, captureUnexpectedError, initMobileSentry, wrapRootLayout } =
  await import("./sentry.ts");

describe("mobile Sentry", () => {
  beforeEach(() => {
    init.mockReset();
    setUser.mockReset();
    getClient.mockReset();
    captureException.mockReset();
    vi.unstubAllEnvs();
  });

  it("does not initialize without a DSN", () => {
    vi.stubEnv("EXPO_PUBLIC_SENTRY_DSN", "");
    initMobileSentry();
    expect(init).not.toHaveBeenCalled();
  });

  it("does not initialize in Expo Go even with a DSN", () => {
    const previous = Object.getOwnPropertyDescriptor(globalThis, "__DEV__");
    Object.assign(globalThis, { __DEV__: true });
    vi.stubEnv("EXPO_PUBLIC_SENTRY_DSN", "https://public@o0.ingest.sentry.io/1");
    initMobileSentry();
    expect(init).not.toHaveBeenCalled();
    if (previous) Object.defineProperty(globalThis, "__DEV__", previous);
    else Object.assign(globalThis, { __DEV__: false });
  });

  it("initializes production builds with the mobile service tag", () => {
    Object.assign(globalThis, { __DEV__: false });
    vi.stubEnv("EXPO_PUBLIC_SENTRY_DSN", "https://public@o0.ingest.sentry.io/1");
    initMobileSentry();
    const options = init.mock.calls[0]?.[0] as {
      sendDefaultPii: boolean;
      initialScope: { tags: Record<string, string> };
      beforeSend: (event: object, hint: object) => object | null;
    };
    expect(options).toMatchObject({
      sendDefaultPii: false,
      initialScope: { tags: { service: "mobile", environment: "production" } },
    });
    const sent = options.beforeSend(
      { user: { id: "actor-1", email: "ana@club.mx" }, extra: { token: "session-token" } },
      {},
    );
    expect(sent).toMatchObject({ user: { id: "actor-1" } });
    expect(JSON.stringify(sent)).not.toMatch(/ana@club\.mx|session-token/);
  });

  it("binds only the actor id as the Sentry user", () => {
    getClient.mockReturnValue({});
    bindSentryActor("actor-42");
    expect(setUser).toHaveBeenCalledWith({ id: "actor-42" });
    bindSentryActor(null);
    expect(setUser).toHaveBeenCalledWith(null);
  });

  it("does not attach a user when the SDK is off", () => {
    getClient.mockReturnValue(undefined);
    bindSentryActor("actor-42");
    expect(setUser).not.toHaveBeenCalled();
  });

  it("drops expected failures", () => {
    getClient.mockReturnValue({});
    captureUnexpectedError({ code: "identity.unauthenticated" });
    expect(captureException).not.toHaveBeenCalled();
  });

  it("wraps the root layout", () => {
    const Root = () => null;
    expect(wrapRootLayout(Root)).toBe(Root);
    expect(wrap).toHaveBeenCalledWith(Root);
  });
});
