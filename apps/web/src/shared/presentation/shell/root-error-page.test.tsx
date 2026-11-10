// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { RootErrorPage } from "./root-error-page.tsx";

const captureWorkerError = vi.fn();

vi.mock("@/observability/sentry.ts", () => ({
  captureWorkerError: (...args: unknown[]) => captureWorkerError(...args),
}));

beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  captureWorkerError.mockReset();
  vi.restoreAllMocks();
});

function renderBrokenLoader() {
  const root = createRootRoute({
    component: Outlet,
    errorComponent: RootErrorPage,
  });
  const boom = createRoute({
    getParentRoute: () => root,
    path: "/boom",
    loader: () => {
      throw new Error("loader crashed");
    },
    component: () => <p>loaded</p>,
  });
  const router = createRouter({
    routeTree: root.addChildren([boom]),
    history: createMemoryHistory({ initialEntries: ["/boom"] }),
    defaultPreload: false,
  });
  render(
    <I18nProvider initialLocale="es">
      <RouterProvider router={router} />
    </I18nProvider>,
  );
  return router;
}

describe("RootErrorPage", () => {
  it("shows the failure, reports it, and retries the loader", async () => {
    renderBrokenLoader();
    expect(await screen.findByRole("alert")).toBeVisible();
    expect(screen.getByText("Algo no ha ido bien")).toBeVisible();
    expect(captureWorkerError).toHaveBeenCalled();
    const firstReport = captureWorkerError.mock.calls[0]?.[0];
    expect(firstReport).toBeInstanceOf(Error);
    expect((firstReport as Error).message).toBe("loader crashed");

    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("alert")).toBeVisible();
  });
});
