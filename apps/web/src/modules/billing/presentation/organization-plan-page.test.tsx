// @vitest-environment jsdom

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { EffectiveAccessDto } from "@futrob/api-contracts";
import { BILLING_PERMISSION } from "@futrob/billing";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { OrganizationPlanRoute } from "./organization-plan-page.tsx";
import { freePlanFixture } from "./organization-plan.fixtures.ts";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: { to: string; children?: ReactNode }) => (
    <a href={to.replace("$orgId", "org-1")} {...props}>
      {children}
    </a>
  ),
}));

const access = (allowed: boolean, canRequest: boolean): EffectiveAccessDto => ({
  actorId: "actor-1",
  scope: { organizationId: "org-1" },
  roles: [],
  permissions: [
    { permission: BILLING_PERMISSION.read, allowed, decidedAt: "organization" },
    { permission: BILLING_PERMISSION.plansRequest, allowed: canRequest, decidedAt: "organization" },
  ],
});

function serve(input: {
  readonly allowed: boolean;
  /** The organizer bundle carries the request capability; staff do not. */
  readonly canRequest?: boolean;
  readonly plan?: () => Response;
  readonly planRequest?: (method: string, body: unknown) => Response;
}) {
  const fetch = vi.fn(async (request: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(request), "https://web.test");
    if (url.pathname === "/api/v1/authorization/effective-access") {
      return Response.json(access(input.allowed, input.canRequest ?? false));
    }
    if (url.pathname === "/api/v1/organizations/org-1/billing/plan" && input.plan) {
      return input.plan();
    }
    if (url.pathname === "/api/v1/organizations/org-1/billing/plan-request" && input.planRequest) {
      return input.planRequest(
        init?.method ?? "GET",
        init?.body ? JSON.parse(String(init.body)) : null,
      );
    }
    return Response.json(
      { code: "api.not_found", messageKey: "errors.api.not_found" },
      { status: 404 },
    );
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

function renderRoute() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider initialLocale="es">
        <OrganizationPlanRoute organizationId="org-1" />
      </I18nProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("organization plan page", () => {
  it("shows the free plan, usage against limits and the exhausted sync quota", async () => {
    serve({
      allowed: true,
      plan: () =>
        Response.json({
          ...freePlanFixture,
          quotas: [{ ...freePlanFixture.quotas[0]!, used: 60 }],
        }),
    });
    renderRoute();

    expect(await screen.findByText("Gratis")).toBeTruthy();
    expect(screen.getByText("60 de 60")).toBeTruthy();
    expect(screen.getByText("1 de 1")).toBeTruthy();
    expect(
      screen.getByText(
        /Los enfrentamientos en curso se resuelven con los partidos ya sincronizados/,
      ),
    ).toBeTruthy();
    expect(screen.getByText(/Ranking de rendimiento 0–100/).textContent).toContain("No incluido");
  });

  it("never reads the plan without billing.read", async () => {
    const fetch = serve({ allowed: false });
    renderRoute();

    expect(await screen.findByText("No puedes ver el plan")).toBeTruthy();
    expect(fetch.mock.calls.some(([request]) => String(request).includes("/billing/plan"))).toBe(
      false,
    );
  });

  it("lets an organizer request a higher plan and then shows the open request", async () => {
    let pending: unknown = null;
    const planRequest = vi.fn((method: string, body: unknown) => {
      pending = {
        planKey: (body as { planKey: string }).planKey,
        requestedAt: "2026-10-29T12:00:00.000Z",
      };
      return Response.json({ organizationId: "org-1", request: pending });
    });
    serve({
      allowed: true,
      canRequest: true,
      plan: () => Response.json({ ...freePlanFixture, pendingRequest: pending }),
      planRequest,
    });
    const user = userEvent.setup();
    renderRoute();

    await user.click(await screen.findByRole("button", { name: "Solicitar Pro" }));

    expect(planRequest).toHaveBeenCalledWith("PUT", { planKey: "pro" });
    expect(await screen.findByText(/Pediste el plan Pro/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancelar solicitud" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Solicitar Pro" })).toBeNull();
  });

  it("lets the organizer withdraw an open request", async () => {
    let pending: unknown = { planKey: "league", requestedAt: "2026-10-29T12:00:00.000Z" };
    const planRequest = vi.fn(() => {
      pending = null;
      return new Response(null, { status: 204 });
    });
    serve({
      allowed: true,
      canRequest: true,
      plan: () => Response.json({ ...freePlanFixture, pendingRequest: pending }),
      planRequest,
    });
    const user = userEvent.setup();
    renderRoute();

    await user.click(await screen.findByRole("button", { name: "Cancelar solicitud" }));

    expect(planRequest).toHaveBeenCalledWith("DELETE", null);
    expect(await screen.findByRole("button", { name: "Solicitar Liga" })).toBeTruthy();
    expect(screen.queryByText(/Pediste el plan/)).toBeNull();
  });

  it("offers no request action to staff, who can still read the plan", async () => {
    serve({ allowed: true, canRequest: false, plan: () => Response.json(freePlanFixture) });
    renderRoute();

    expect(await screen.findByText("Gratis")).toBeTruthy();
    expect(screen.getByText(/Solo el organizador puede pedir un cambio de plan/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Solicitar/ })).toBeNull();
  });

  it("says so when the request fails and keeps the options", async () => {
    serve({
      allowed: true,
      canRequest: true,
      plan: () => Response.json(freePlanFixture),
      planRequest: () =>
        Response.json(
          { code: "billing.forbidden", messageKey: "errors.billing.forbidden" },
          { status: 403 },
        ),
    });
    const user = userEvent.setup();
    renderRoute();

    await user.click(await screen.findByRole("button", { name: "Solicitar Pro" }));

    await waitFor(() => expect(screen.getByText(/No pudimos registrar tu solicitud/)).toBeTruthy());
    expect(screen.getByRole("button", { name: "Solicitar Pro" })).toBeTruthy();
  });

  it("keeps an open request visible and withdrawable on the top plan", async () => {
    let pending: unknown = { planKey: "pro", requestedAt: "2026-10-29T12:00:00.000Z" };
    const planRequest = vi.fn(() => {
      pending = null;
      return new Response(null, { status: 204 });
    });
    serve({
      allowed: true,
      canRequest: true,
      plan: () =>
        Response.json({
          ...freePlanFixture,
          plan: { ...freePlanFixture.plan, key: "league" },
          pendingRequest: pending,
        }),
      planRequest,
    });
    const user = userEvent.setup();
    renderRoute();

    expect(await screen.findByText(/Pediste el plan Pro/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Cancelar solicitud" }));

    expect(planRequest).toHaveBeenCalledWith("DELETE", null);
    await waitFor(() => expect(screen.queryByText(/Pediste el plan/)).toBeNull());
    expect(screen.queryByRole("button", { name: "Cancelar solicitud" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Solicitar/ })).toBeNull();
    expect(screen.getByText("Tienes el plan más completo.")).toBeTruthy();
  });

  it("offers no request on the top plan", async () => {
    serve({
      allowed: true,
      canRequest: true,
      plan: () =>
        Response.json({ ...freePlanFixture, plan: { ...freePlanFixture.plan, key: "league" } }),
    });
    renderRoute();

    expect(await screen.findByText("Tienes el plan más completo.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Solicitar/ })).toBeNull();
  });
});
