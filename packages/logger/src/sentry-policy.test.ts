import { describe, expect, it } from "vite-plus/test";
import {
  applySentryEventPolicy,
  applySentryTransactionPolicy,
  buildSentryInitConfig,
  filterAndScrubSentryEvent,
  isExpectedFailure,
  requestIdFromSentryEvent,
  scrubSentryEvent,
  sentrySdkOptions,
  sentryServiceTags,
  withRequestIdTag,
  type SentryEventLike,
} from "./sentry-policy.ts";

describe("Sentry init gating", () => {
  it("does not enable when the DSN is missing", () => {
    expect(
      buildSentryInitConfig({
        nodeEnv: "production",
        service: "auth",
      }),
    ).toBeUndefined();
  });

  it("does not enable in development even with a DSN", () => {
    expect(
      buildSentryInitConfig({
        dsn: "https://public@o0.ingest.sentry.io/1",
        nodeEnv: "development",
        service: "api",
      }),
    ).toBeUndefined();
  });

  it("enables only in production with a DSN and stamps service plus environment", () => {
    const config = buildSentryInitConfig({
      dsn: " https://public@o0.ingest.sentry.io/1 ",
      nodeEnv: "production",
      environment: "staging",
      service: "web",
    });
    expect(config).toEqual({
      dsn: "https://public@o0.ingest.sentry.io/1",
      environment: "staging",
      service: "web",
      tracesSampleRate: 0.1,
    });
    expect(sentryServiceTags(config!)).toEqual({
      service: "web",
      environment: "staging",
    });
  });
});

describe("expected-failure filter", () => {
  it("treats a stable wire code as expected", () => {
    expect(isExpectedFailure({ code: "auth.invalid_credentials" })).toBe(true);
    const event = { extra: { ok: true } };
    expect(
      filterAndScrubSentryEvent(event, { originalException: { code: "api.not_found" } }),
    ).toBeNull();
  });

  it("lets defects without a code through", () => {
    expect(isExpectedFailure(new Error("boom"))).toBe(false);
    expect(isExpectedFailure({ message: "boom" })).toBe(false);
    expect(isExpectedFailure({ code: "" })).toBe(false);
    expect(isExpectedFailure(null)).toBe(false);
  });
});

describe("event scrubbing", () => {
  it("drops request bodies, cookies, credentials, tokens, and emails", () => {
    const event = {
      request: {
        method: "POST",
        url: "https://auth.futrob.app/api/auth/sign-in/email",
        data: { email: "ana@club.mx", password: "secret-pass" },
        cookies: { better_auth: "session-cookie" },
        query_string: "token=reset-secret",
        headers: {
          Authorization: "Bearer session-token",
          Cookie: "better-auth.session=abc",
          "X-Request-ID": "9b020aa7-9c5e-4cca-b8ea-daeb047c6dca",
          "Content-Type": "application/json",
        },
      },
      user: {
        id: "actor-1",
        email: "ana@club.mx",
        username: "ana",
        ip_address: "203.0.113.10",
      },
      extra: {
        password: "secret-pass",
        token: "session-token",
        path: "/api/auth/sign-in/email",
      },
      breadcrumbs: [{ data: { authorization: "Bearer session-token", step: "sign-in" } }],
    };
    const scrubbed = scrubSentryEvent(event);

    expect(scrubbed.request).toEqual({
      method: "POST",
      url: "https://auth.futrob.app/api/auth/sign-in/email",
      headers: {
        Authorization: "[Filtered]",
        Cookie: "[Filtered]",
        "X-Request-ID": "9b020aa7-9c5e-4cca-b8ea-daeb047c6dca",
        "Content-Type": "application/json",
      },
    });
    expect(scrubbed.user).toEqual({ id: "actor-1" });
    expect(scrubbed.extra).toEqual({
      password: "[Filtered]",
      token: "[Filtered]",
      path: "/api/auth/sign-in/email",
    });
    expect(scrubbed.breadcrumbs).toEqual([
      { data: { authorization: "[Filtered]", step: "sign-in" } },
    ]);
    expect(JSON.stringify(scrubbed)).not.toMatch(
      /secret-pass|session-token|ana@club\.mx|session-cookie|reset-secret/,
    );
  });

  it("redacts invitation tokens in the request URL", () => {
    const event = {
      request: {
        method: "GET",
        url: "https://app.futrob.app/invitations/accept/plain-invite-token?token=reset-secret",
      },
    };
    const scrubbed = scrubSentryEvent(event);
    expect(scrubbed.request?.url).toBe(
      "https://app.futrob.app/invitations/accept/[Filtered]?token=[Filtered]",
    );
    expect(JSON.stringify(scrubbed)).not.toMatch(/plain-invite-token|reset-secret/);
  });

  it("redacts invitation tokens in Referer and breadcrumb URLs", () => {
    const page = "https://app.futrob.app/roster-invitations/accept/SYNTHETIC_INVITE_TOKEN";
    const scrubbed = scrubSentryEvent({
      request: {
        url: "https://app.futrob.app/api/auth/get-session",
        headers: { Referer: page },
      },
      breadcrumbs: [
        { category: "fetch", data: { url: page, method: "GET" } },
        { category: "navigation", message: `to ${page}` },
      ],
    });
    expect(scrubbed.request?.headers).toEqual({
      Referer: "https://app.futrob.app/roster-invitations/accept/[Filtered]",
    });
    expect(JSON.stringify(scrubbed)).not.toMatch(/SYNTHETIC_INVITE_TOKEN/);
  });

  it("redacts invitation tokens in transaction names, spans, and trace context", () => {
    const url = "https://app.futrob.app/roster-invitations/accept/SYNTHETIC_INVITE_TOKEN";
    const scrubbed = applySentryTransactionPolicy({
      transaction: "GET /roster-invitations/accept/SYNTHETIC_INVITE_TOKEN",
      request: { url, headers: { Referer: url } },
      contexts: {
        trace: {
          trace_id: "trace-1",
          data: {
            "url.full": url,
            "url.path": "/roster-invitations/accept/SYNTHETIC_INVITE_TOKEN",
          },
        },
      },
      spans: [
        {
          description: `GET ${url}`,
          data: { "http.url": url, "http.request.header.cookie": "session-cookie" },
        },
      ],
    });
    expect(scrubbed.transaction).toBe("GET /roster-invitations/accept/[Filtered]");
    expect(JSON.stringify(scrubbed)).not.toMatch(/SYNTHETIC_INVITE_TOKEN|session-cookie/);
    expect(JSON.stringify(scrubbed)).toContain("trace-1");
  });

  it("drops SQL params and emails from exception messages but keeps the stack", () => {
    const frames = [{ filename: "drizzle-orm/node-postgres/session.js", lineno: 124 }];
    const scrubbed = applySentryEventPolicy({
      exception: {
        values: [
          {
            type: "Error",
            value: "duplicate key: Key (email)=(ana@club.mx) already exists",
          },
          {
            type: "Error",
            value:
              'Failed query: select "id" from "auth_users" where "email" = $1\nparams: ana@club.mx,SYNTHETIC_PARAM',
            stacktrace: { frames },
          },
        ],
      },
    });
    expect(scrubbed?.exception).toEqual({
      values: [
        { type: "Error", value: "duplicate key: Key (email)=([Filtered]) already exists" },
        {
          type: "Error",
          value:
            'Failed query: select "id" from "auth_users" where "email" = $1\nparams: [Filtered]',
          stacktrace: { frames },
        },
      ],
    });
    expect(JSON.stringify(scrubbed)).not.toMatch(/ana@club\.mx|SYNTHETIC_PARAM/);
  });

  it("drops a user object that only has an email", () => {
    expect(scrubSentryEvent({ user: { email: "ana@club.mx" } }).user).toBeUndefined();
  });

  it("builds SDK options only when production delivery is allowed", () => {
    expect(
      sentrySdkOptions({
        dsn: "https://public@o0.ingest.sentry.io/1",
        nodeEnv: "development",
        service: "mobile",
      }),
    ).toBeUndefined();

    const options = sentrySdkOptions({
      dsn: "https://public@o0.ingest.sentry.io/1",
      nodeEnv: "production",
      service: "auth",
    });
    expect(options?.initialScope.tags).toEqual({ service: "auth", environment: "production" });
    expect(options?.sendDefaultPii).toBe(false);
    const rejected = { extra: { token: "session-token" } };
    expect(
      applySentryEventPolicy(rejected, { originalException: { code: "auth.invalid_credentials" } }),
    ).toBeNull();
  });

  it("copies a valid request id onto tags", () => {
    const requestId = "9b020aa7-9c5e-4cca-b8ea-daeb047c6dca";
    const event: SentryEventLike = {
      request: { headers: { "X-Request-ID": requestId } },
    };
    expect(requestIdFromSentryEvent(event)).toBe(requestId);
    expect(withRequestIdTag(event, requestId).tags?.request_id).toBe(requestId);
    expect(
      requestIdFromSentryEvent({ request: { headers: { "X-Request-ID": "not-a-uuid" } } }),
    ).toBeUndefined();
  });

  it("scrubs an event and tags the request id in one pass", () => {
    const requestId = "9b020aa7-9c5e-4cca-b8ea-daeb047c6dca";
    const event: SentryEventLike = {
      request: {
        headers: {
          Authorization: "Bearer session-token",
          "X-Request-ID": requestId,
        },
      },
      user: { id: "actor-1", email: "ana@club.mx" },
      extra: { password: "secret-pass" },
      tags: {},
    };
    const next = applySentryEventPolicy(event);
    expect(next?.request).toEqual({
      headers: {
        Authorization: "[Filtered]",
        "X-Request-ID": requestId,
      },
    });
    expect(next?.user).toEqual({ id: "actor-1" });
    expect(next?.tags?.request_id).toBe(requestId);
    expect(JSON.stringify(next)).not.toMatch(/secret-pass|session-token|ana@club\.mx/);
  });
});
