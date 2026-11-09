// @vitest-environment jsdom
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { SidebarProvider, TooltipProvider } from "@futrob/ui";
import type { ComponentProps } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type { SidebarLayoutDto } from "@futrob/api-contracts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { QueryTestProvider } from "@/shared/presentation/query/query-test-utils.tsx";
import { useActorPreferencesQuery } from "@/modules/identity/presentation/identity-queries.ts";
import { ShellAccountDialogsProvider } from "./shell-account-dialogs.tsx";
import { DesktopSidebar } from "./shell-sidebar-nav.tsx";
import { buildWorkspaceSelectorModel } from "./workspace-selector-model.ts";

vi.mock("@/modules/identity/auth-client.ts", () => ({
  authClient: {
    useSession: () => ({ data: { user: { name: "Alex", email: "alex@example.test" } } }),
    changePassword: vi.fn(),
    signOut: vi.fn(),
  },
}));

beforeEach(() => {
  vi.stubGlobal("PointerEvent", MouseEvent);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ items: [] })),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function AccountLayoutSidebar(props: Omit<ComponentProps<typeof DesktopSidebar>, "sidebarLayout">) {
  const preferences = useActorPreferencesQuery();
  return (
    <DesktopSidebar {...props} sidebarLayout={preferences.data?.sidebarLayout ?? "navigation"} />
  );
}

function renderSidebar(sidebarLayout: SidebarLayoutDto | "account") {
  const model = buildWorkspaceSelectorModel({
    memberships: [],
    competitions: [],
    associatedClubs: [],
  });
  const sidebarProps = {
    allowedPermissions: new Set<string>(),
    model,
    onRequestAddClub: () => undefined,
    onSelect: () => undefined,
    pathname: "/player",
    selection: { kind: "personal" },
  } as const;
  const root = createRootRoute({
    component: () => (
      <SidebarProvider>
        <ShellAccountDialogsProvider>
          {sidebarLayout === "account" ? (
            <AccountLayoutSidebar {...sidebarProps} />
          ) : (
            <DesktopSidebar {...sidebarProps} sidebarLayout={sidebarLayout} />
          )}
        </ShellAccountDialogsProvider>
      </SidebarProvider>
    ),
  });
  const router = createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: ["/player"] }),
  });
  render(
    <I18nProvider initialLocale="es">
      <QueryTestProvider>
        <TooltipProvider>
          <RouterProvider router={router} />
        </TooltipProvider>
      </QueryTestProvider>
    </I18nProvider>,
  );
}

describe("shell sidebar layouts", () => {
  it("navigation layout puts the workspace first, nav items next and the account last", async () => {
    renderSidebar("navigation");

    const sidebar = await screen.findByRole("complementary", { name: "Navegación principal" });

    const order = [/Añadir club/, /Inicio/, /Alex/].map((name) =>
      (sidebar.textContent ?? "").search(name),
    );
    expect(order.every((index) => index >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(within(sidebar).queryByText("Pendientes")).toBeNull();
    expect(within(sidebar).getByRole("button", { name: "Colapsar barra lateral" })).toBeVisible();
  });

  it("pending queue layout puts the account first, the queue next and nav items last", async () => {
    renderSidebar("pending-queue");

    const sidebar = await screen.findByRole("complementary", { name: "Navegación principal" });

    const order = [/Alex/, /Pendientes/, /Inicio/].map((name) =>
      (sidebar.textContent ?? "").search(name),
    );
    expect(order.every((index) => index >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("keeps Configuración open and confirms the save when the layout moves the account menu", async () => {
    let stored: SidebarLayoutDto = "navigation";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: unknown, init: RequestInit = {}) => {
        if (!String(url).includes("/identity/preferences")) return Response.json({ items: [] });
        if (init.method === "PUT") stored = "pending-queue";
        return Response.json({ sidebarLayout: stored });
      }),
    );
    renderSidebar("account");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Abrir menú de cuenta" }));
    await user.click(await screen.findByRole("menuitem", { name: "Configuración" }));
    const layout = await screen.findByRole("combobox", { name: "Barra lateral" });
    await waitFor(() => expect(layout).toBeEnabled());
    await user.click(layout);
    await user.click(await screen.findByRole("option", { name: "Con pendientes" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Cambios guardados.")).toBeVisible();
    expect(screen.getByRole("dialog", { name: "Configuración" })).toBeVisible();
    expect(screen.getByText("Pendientes")).toBeInTheDocument();
  });
});
