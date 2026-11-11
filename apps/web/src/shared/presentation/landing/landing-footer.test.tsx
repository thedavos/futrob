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
import { LandingFooter } from "./landing-footer.tsx";

beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderFooter() {
  const root = createRootRoute({
    component: () => (
      <>
        <Outlet />
        <LandingFooter />
      </>
    ),
  });
  const home = createRoute({
    getParentRoute: () => root,
    path: "/",
    component: () => <p>home</p>,
  });
  const terms = createRoute({
    getParentRoute: () => root,
    path: "/terms",
    component: () => <p>terms</p>,
  });
  const privacy = createRoute({
    getParentRoute: () => root,
    path: "/privacy",
    component: () => <p>privacy</p>,
  });
  const refunds = createRoute({
    getParentRoute: () => root,
    path: "/refunds",
    component: () => <p>refunds</p>,
  });
  const router = createRouter({
    routeTree: root.addChildren([home, terms, privacy, refunds]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return render(
    <I18nProvider initialLocale="es">
      <RouterProvider router={router} />
    </I18nProvider>,
  );
}

describe("LandingFooter", () => {
  it("links to the public legal pages", async () => {
    renderFooter();
    expect(await screen.findByRole("navigation", { name: "Documentos legales" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Términos de servicio" })).toHaveAttribute(
      "href",
      "/terms",
    );
    expect(screen.getByRole("link", { name: "Política de privacidad" })).toHaveAttribute(
      "href",
      "/privacy",
    );
    expect(screen.getByRole("link", { name: "Reembolsos" })).toHaveAttribute("href", "/refunds");
  });
});
