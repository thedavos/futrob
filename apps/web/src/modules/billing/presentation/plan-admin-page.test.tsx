// @vitest-environment jsdom

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { EffectiveAccessDto } from "@futrob/api-contracts";
import { ORGANIZATION_PERMISSION } from "@futrob/organizations";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { PlanAdminRoute } from "./plan-admin-page.tsx";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children?: ReactNode }) => <a href="/org">{children}</a>,
}));

const access = (superuser: boolean): EffectiveAccessDto => ({
  actorId: "actor-1",
  scope: {},
  roles: [],
  permissions: [
    {
      permission: ORGANIZATION_PERMISSION.superusersManage,
      allowed: superuser,
      decidedAt: "platform",
    },
  ],
});

const queued = {
  requests: [
    {
      organizationId: "org-9",
      organizationName: "Liga Norte",
      planKey: "pro",
      requestedAt: "2026-11-09T10:00:00.000Z",
    },
  ],
};

const subscription = {
  planKey: "pro",
  state: { status: "active" },
  updatedAt: "2026-11-10T10:00:00.000Z",
};

function serve(input: {
  readonly superuser: boolean;
  readonly queue?: () => Response;
  readonly assign?: (body: unknown) => Response;
}) {
  const fetch = vi.fn(async (request: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(request), "https://web.test");
    if (url.pathname === "/api/v1/authorization/effective-access") {
      return Response.json(access(input.superuser));
    }
    if (url.pathname === "/api/v1/billing/plan-requests" && input.queue) return input.queue();
    if (url.pathname === "/api/v1/organizations/org-9/billing/plan" && input.assign) {
      return input.assign(JSON.parse(String(init?.body)));
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
        <PlanAdminRoute />
      </I18nProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("plan admin page", () => {
  it("lists pending requests and assigns the requested plan with a reason", async () => {
    const assign = vi.fn(() => Response.json({ organizationId: "org-9", subscription }));
    serve({ superuser: true, queue: () => Response.json(queued), assign });
    const user = userEvent.setup();
    renderRoute();

    expect(await screen.findByText("Liga Norte")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Asignar Pro a Liga Norte" }));
    await user.type(screen.getByLabelText("Motivo"), "Transferencia recibida");
    await user.click(screen.getByRole("button", { name: "Asignar plan" }));

    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith({
        planKey: "pro",
        state: { status: "active" },
        reason: "Transferencia recibida",
      }),
    );
    expect(await screen.findByText(/Asignamos el plan Pro a la organización org-9/)).toBeTruthy();
  });

  it("says so when the organization does not exist", async () => {
    serve({
      superuser: true,
      queue: () => Response.json({ requests: [] }),
      assign: () =>
        Response.json({ code: "organizations.not_found", messageKey: "x" }, { status: 404 }),
    });
    const user = userEvent.setup();
    renderRoute();

    expect(await screen.findByText("No hay solicitudes pendientes.")).toBeTruthy();
    await user.type(screen.getByLabelText("ID de la organización"), "org-9");
    await user.type(screen.getByLabelText("Motivo"), "Pago");
    await user.click(screen.getByRole("button", { name: "Asignar plan" }));

    expect(await screen.findByText("No encontramos esa organización.")).toBeTruthy();
  });

  it("denies everyone who is not a superuser without reading the queue", async () => {
    const fetch = serve({ superuser: false });
    renderRoute();

    expect(await screen.findByText("No tienes acceso a este panel")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Asignar plan" })).toBeNull();
    expect(fetch.mock.calls.some(([url]) => String(url).includes("plan-requests"))).toBe(false);
  });

  it("shows the denial when the product API refuses the queue", async () => {
    serve({
      superuser: true,
      queue: () => Response.json({ code: "billing.forbidden", messageKey: "x" }, { status: 403 }),
    });
    renderRoute();

    expect(await screen.findByText("No tienes acceso a este panel")).toBeTruthy();
  });
});
