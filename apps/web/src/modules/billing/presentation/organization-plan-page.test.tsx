// @vitest-environment jsdom

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
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

const access = (allowed: boolean): EffectiveAccessDto => ({
  actorId: "actor-1",
  scope: { organizationId: "org-1" },
  roles: [],
  permissions: [{ permission: BILLING_PERMISSION.read, allowed, decidedAt: "organization" }],
});

function serve(input: { readonly allowed: boolean; readonly plan?: () => Response }) {
  const fetch = vi.fn(async (request: RequestInfo | URL) => {
    const url = new URL(String(request), "https://web.test");
    if (url.pathname === "/api/v1/authorization/effective-access") {
      return Response.json(access(input.allowed));
    }
    if (url.pathname === "/api/v1/organizations/org-1/billing/plan" && input.plan) {
      return input.plan();
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
});
