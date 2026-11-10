// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
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
import { NotFoundPage, notFoundAudience } from "./not-found-page.tsx";

beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderNotFound(audience: "visitor" | "member") {
  const root = createRootRoute({
    component: Outlet,
    notFoundComponent: () => <NotFoundPage audience={audience} />,
  });
  const home = createRoute({
    getParentRoute: () => root,
    path: "/",
    component: () => <h1>Inicio</h1>,
  });
  const space = createRoute({
    getParentRoute: () => root,
    path: "/player",
    component: () => <h1>Espacio</h1>,
  });
  const router = createRouter({
    routeTree: root.addChildren([home, space]),
    history: createMemoryHistory({ initialEntries: ["/missing-page"] }),
  });
  render(
    <I18nProvider initialLocale="es">
      <RouterProvider router={router} />
    </I18nProvider>,
  );
  return router;
}

describe("notFoundAudience", () => {
  it("treats a missing session as a visitor", () => {
    expect(notFoundAudience(false)).toBe("visitor");
  });

  it("treats a signed-in session as a member", () => {
    expect(notFoundAudience(true)).toBe("member");
  });
});

describe("NotFoundPage", () => {
  it("gives a visitor a way home", async () => {
    renderNotFound("visitor");
    expect(
      await screen.findByRole("heading", { name: "No encontramos esta página" }),
    ).toBeVisible();
    const exit = screen.getByRole("link", { name: "Volver al inicio" });
    expect(exit.getAttribute("href")).toBe("/");
  });

  it("gives a signed-in user a way to their space", async () => {
    renderNotFound("member");
    expect(
      await screen.findByRole("heading", { name: "No encontramos esta página" }),
    ).toBeVisible();
    const exit = screen.getByRole("link", { name: "Ir a tu espacio" });
    expect(exit.getAttribute("href")).toBe("/player");
  });
});
