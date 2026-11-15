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
import { notFoundAudience, RootNotFoundPage } from "./not-found-page.tsx";

const session = vi.hoisted(() => ({
  isPending: false,
  data: null as { user: { id: string } } | null,
}));

vi.mock("@/modules/identity/auth-client.ts", () => ({
  authClient: {
    useSession: () => session,
  },
}));

beforeEach(() => {
  session.isPending = false;
  session.data = null;
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderMissingRoute() {
  const root = createRootRoute({
    component: Outlet,
    notFoundComponent: RootNotFoundPage,
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
    history: createMemoryHistory({ initialEntries: ["/this-route-does-not-exist"] }),
  });
  render(
    <I18nProvider initialLocale="es">
      <RouterProvider router={router} />
    </I18nProvider>,
  );
  return router;
}

describe("notFoundAudience", () => {
  it("treats a missing user as a visitor", () => {
    expect(notFoundAudience({ user: undefined })).toBe("visitor");
    expect(notFoundAudience({ user: null })).toBe("visitor");
  });

  it("treats a session user as a member", () => {
    expect(notFoundAudience({ user: { id: "user-1" } })).toBe("member");
  });
});

describe("NotFoundPage", () => {
  it("gives a visitor a way home", async () => {
    session.isPending = false;
    session.data = null;
    const router = renderMissingRoute();
    expect(
      await screen.findByRole("heading", { name: "No encontramos esta página" }),
    ).toBeVisible();
    const exit = screen.getByRole("link", { name: "Volver al inicio" });
    expect(exit.getAttribute("href")).toBe("/");
    expect(router.state.matches.some((match) => match._notFound)).toBe(true);
  });

  it("keeps a pending session on the visitor exit", async () => {
    session.isPending = true;
    session.data = { user: { id: "user-1" } };
    renderMissingRoute();
    const exit = await screen.findByRole("link", { name: "Volver al inicio" });
    expect(exit.getAttribute("href")).toBe("/");
  });

  it("gives a signed-in user a way to their space", async () => {
    session.isPending = false;
    session.data = { user: { id: "user-1" } };
    renderMissingRoute();
    expect(
      await screen.findByRole("heading", { name: "No encontramos esta página" }),
    ).toBeVisible();
    const exit = screen.getByRole("link", { name: "Ir a tu espacio" });
    expect(exit.getAttribute("href")).toBe("/player");
  });
});
