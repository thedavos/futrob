// @vitest-environment jsdom

import type { ReactNode } from "react";
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
import { reportUnexpectedRouteError, RootErrorPage } from "./root-error-page.tsx";

const captureUnexpectedError = vi.fn();

vi.mock("@/observability/capture-unexpected-error.ts", () => ({
  captureUnexpectedError: (...args: unknown[]) => captureUnexpectedError(...args),
}));

beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  captureUnexpectedError.mockReset();
  vi.restoreAllMocks();
});

function Shell({ children }: Readonly<{ children: ReactNode }>) {
  return <I18nProvider initialLocale="es">{children}</I18nProvider>;
}

function renderBrokenLoader() {
  let attempts = 0;
  const root = createRootRoute({
    shellComponent: Shell,
    component: Outlet,
    errorComponent: RootErrorPage,
  });
  const boom = createRoute({
    getParentRoute: () => root,
    path: "/boom",
    loader: () => {
      attempts += 1;
      if (attempts === 1) throw new Error("loader crashed");
      return { ok: true };
    },
    component: () => <p>loaded</p>,
  });
  const router = createRouter({
    routeTree: root.addChildren([boom]),
    history: createMemoryHistory({ initialEntries: ["/boom"] }),
    defaultPreload: false,
  });
  render(<RouterProvider router={router} />);
  return router;
}

describe("RootErrorPage", () => {
  it("shows the failure, reports it, and retries the loader", async () => {
    renderBrokenLoader();
    expect(await screen.findByRole("alert")).toBeVisible();
    expect(screen.getByText("Algo no ha ido bien")).toBeVisible();
    expect(captureUnexpectedError).toHaveBeenCalledTimes(1);
    const firstReport = captureUnexpectedError.mock.calls[0]?.[0];
    expect(firstReport).toBeInstanceOf(Error);
    if (!(firstReport instanceof Error)) {
      throw new Error("expected an Error report");
    }
    expect(firstReport.message).toBe("loader crashed");

    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("loaded")).toBeVisible();
  });

  it("reports one error object once", () => {
    const cause = new Error("loader crashed");
    reportUnexpectedRouteError(cause);
    reportUnexpectedRouteError(cause);
    expect(captureUnexpectedError).toHaveBeenCalledTimes(1);
  });
});
