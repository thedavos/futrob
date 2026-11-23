// @vitest-environment jsdom

import * as Sentry from "@sentry/browser";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { captureBrowserError, initBrowserSentry } from "./sentry-browser.ts";

const dsn = "https://public@sentry.example/1";

function recordEvents(integrations: Sentry.BrowserOptions["integrations"] = []): Sentry.Event[] {
  const events: Sentry.Event[] = [];
  initBrowserSentry(
    { dsn, production: true },
    {
      defaultIntegrations: false,
      integrations,
      beforeSend: (event) => {
        events.push(event);
        return null;
      },
    },
  );
  return events;
}

afterEach(async () => {
  await Sentry.close();
  Sentry.getIsolationScope().clearBreadcrumbs();
  Sentry.getCurrentScope().setClient(undefined);
});

describe("browser Sentry", () => {
  it("stays off without a DSN or outside a production build", () => {
    initBrowserSentry({ production: true });
    initBrowserSentry({ dsn, production: false });
    expect(Sentry.getClient()).toBeUndefined();
  });

  it("sends a client-only route failure with context scoped to that event", async () => {
    const events = recordEvents();
    captureBrowserError(new Error("render crashed in the browser"), { handler: "route-error" });
    captureBrowserError(new Error("another browser error"));
    await Sentry.flush();
    expect(events).toHaveLength(2);
    const routeError = events.find(
      (event) => event.exception?.values?.[0]?.value === "render crashed in the browser",
    );
    const otherError = events.find(
      (event) => event.exception?.values?.[0]?.value === "another browser error",
    );
    expect(routeError?.extra).toEqual({ handler: "route-error" });
    expect(otherError).toBeDefined();
    expect(otherError?.extra?.handler).toBeUndefined();
  });

  it("strips invite tokens from the request URL, breadcrumbs and message before transport", async () => {
    const token = "review-secret-invite";
    const events = recordEvents([
      Sentry.breadcrumbsIntegration({ history: true, dom: false }),
      Sentry.httpContextIntegration(),
    ]);
    window.history.pushState({}, "", "/");
    window.history.pushState({}, "", `/invitations/accept/${token}?token=${token}`);
    captureBrowserError(new Error(`failed at /invitations/accept/${token}`));
    await Sentry.flush();
    window.history.pushState({}, "", "/");

    expect(events).toHaveLength(1);
    expect(Sentry.getClient()?.getOptions().dataCollection).toMatchObject({
      userInfo: false,
      cookies: false,
      httpBodies: [],
    });
    const event = events[0];
    expect(event?.request?.url).toContain("/invitations/accept/[Filtered]");
    expect(event?.breadcrumbs?.some((crumb) => crumb.category === "navigation")).toBe(true);
    expect(event?.exception?.values?.[0]?.value).toBe("failed at /invitations/accept/[Filtered]");
    expect(JSON.stringify(event)).not.toContain(token);
  });

  it("keeps expected TaggedError failures local", async () => {
    const events = recordEvents();
    captureBrowserError({ code: "auth.unavailable", message: "down" });
    await Sentry.flush();
    expect(events).toHaveLength(0);
  });
});
