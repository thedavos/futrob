// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type { ProviderHealthResponse } from "@futrob/api-contracts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { ProviderHealthPage } from "./provider-health-page.tsx";

const access = vi.hoisted(() => ({
  state: { allowed: true, loading: false, unavailable: false },
}));

vi.mock("@/shared/presentation/permissions/index.ts", () => ({
  useIsSuperuser: () => access.state,
}));

const HEALTH_PATH = "/api/v1/game-data/providers/ea-clubs/health";

const health: ProviderHealthResponse = {
  providerKey: "ea-clubs",
  status: "degraded",
  circuitState: "half_open",
  observedAt: "2026-10-28T12:00:00.000Z",
  windowStartedAt: "2026-10-28T11:00:00.000Z",
  sampleSize: 10,
  lastSuccessfulAt: "2026-10-28T11:59:00.000Z",
  lastFailureAt: "2026-10-28T11:58:00.000Z",
  averageLatencyMs: 250,
  successCount: 8,
  failureCount: 2,
  cache: { hits: 3, misses: 1, stale: 0 },
};

const failure = (status: number, code: string) =>
  Response.json({ code, messageKey: `errors.${code}` }, { status });

function serve(...responses: Array<() => Response | Promise<Response>>) {
  const fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), "https://web.test");
    if (url.pathname !== HEALTH_PATH) return failure(404, "api.not_found");
    const next = responses.length > 1 ? responses.shift() : responses[0];
    return next ? next() : failure(500, "api.unexpected");
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider initialLocale="es">
        <ProviderHealthPage />
      </I18nProvider>
    </QueryClientProvider>,
  );
  return queryClient;
}

beforeEach(() => {
  access.state = { allowed: true, loading: false, unavailable: false };
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Provider health page", () => {
  it("shows status, metrics and failure information from the endpoint", async () => {
    serve(() => Response.json(health));
    renderPage();

    expect(await screen.findByText("Estado: Degradado")).toBeTruthy();
    expect(screen.getByText("Circuito: Semiabierto")).toBeTruthy();
    expect(screen.getByText("80 %")).toBeTruthy();
    expect(screen.getByText(/250/)).toBeTruthy();
    expect(screen.getByText(/registró fallos/)).toBeTruthy();
  });

  it("shows an empty state when the window has no activity", async () => {
    serve(() =>
      Response.json({
        ...health,
        status: "unknown",
        circuitState: "closed",
        sampleSize: 0,
        successCount: 0,
        failureCount: 0,
        averageLatencyMs: null,
        lastSuccessfulAt: null,
        lastFailureAt: null,
        cache: { hits: 0, misses: 0, stale: 0 },
      }),
    );
    renderPage();
    expect(await screen.findByText("Aún no hay actividad del proveedor")).toBeTruthy();
  });

  it("shows a loading state until the endpoint answers", async () => {
    let release: ((response: Response) => void) | undefined;
    serve(
      () =>
        new Promise<Response>((resolve) => {
          release = resolve;
        }),
    );
    renderPage();

    expect(
      await screen.findByRole("status", { name: "Cargando la salud del proveedor…" }),
    ).toBeTruthy();
    release?.(Response.json(health));
    expect(await screen.findByText("Estado: Degradado")).toBeTruthy();
  });

  it("keeps the snapshot when a refresh fails", async () => {
    serve(
      () => Response.json(health),
      () => failure(500, "api.internal_error"),
    );
    renderPage();

    expect(await screen.findByText("Estado: Degradado")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Actualizar" }));
    expect(
      await screen.findByText(
        "No pudimos actualizar los datos. Puede que lo que ves no esté al día.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Estado: Degradado")).toBeTruthy();
  });

  it("shows a retryable error and recovers", async () => {
    const fetch = serve(
      () => failure(500, "api.internal_error"),
      () => Response.json(health),
    );
    renderPage();

    expect(await screen.findByText("No pudimos cargar la salud del proveedor.")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Estado: Degradado")).toBeTruthy();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("shows the denied state when the API answers 403", async () => {
    serve(() => failure(403, "authorization.forbidden"));
    renderPage();
    expect(await screen.findByText("No tienes acceso a este panel")).toBeTruthy();
  });

  it.each(["server", "network"])(
    "discards a revoked snapshot through a later %s failure and recovers only on success",
    async (failureKind) => {
      const fetch = serve(
        () => Response.json(health),
        () => failure(403, "authorization.forbidden"),
        () => {
          if (failureKind === "network") throw new TypeError("Network unavailable");
          return failure(500, "api.internal_error");
        },
        () => Response.json(health),
      );
      const client = renderPage();
      const key = queryKeys.gameData.providerHealth("ea-clubs");
      expect(await screen.findByText("Estado: Degradado")).toBeTruthy();
      await userEvent.click(screen.getByRole("button", { name: "Actualizar" }));
      expect(await screen.findByText("No tienes acceso a este panel")).toBeTruthy();
      expect(client.getQueryData(key)).toBeNull();
      expect(screen.queryByText("80 %")).toBeNull();

      await userEvent.click(screen.getByRole("button", { name: "Actualizar" }));
      await waitFor(() => expect(client.getQueryState(key)?.status).toBe("error"));
      expect(client.getQueryData(key)).toBeNull();
      expect(screen.getByText("No tienes acceso a este panel")).toBeTruthy();
      expect(screen.queryByText("Estado: Degradado")).toBeNull();
      expect(screen.queryByText("80 %")).toBeNull();

      await userEvent.click(screen.getByRole("button", { name: "Actualizar" }));
      expect(await screen.findByText("Estado: Degradado")).toBeTruthy();
      expect(fetch).toHaveBeenCalledTimes(4);
    },
  );

  it("never requests the endpoint for non-superusers", async () => {
    access.state = { allowed: false, loading: false, unavailable: false };
    const fetch = serve(() => Response.json(health));
    renderPage();

    expect(screen.getByText("No tienes acceso a este panel")).toBeTruthy();
    await waitFor(() => expect(fetch).not.toHaveBeenCalled());
  });

  it("fails closed while access is loading or unavailable", () => {
    const fetch = serve(() => Response.json(health));
    access.state = { allowed: false, loading: true, unavailable: false };
    renderPage();
    expect(screen.getByText("Comprobando permisos…")).toBeTruthy();
    cleanup();

    access.state = { allowed: false, loading: false, unavailable: true };
    renderPage();
    expect(screen.getByText("No pudimos comprobar tus permisos para ver este panel.")).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });
});
