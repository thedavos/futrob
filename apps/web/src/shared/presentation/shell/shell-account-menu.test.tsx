// @vitest-environment jsdom

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
  useRouterState,
} from "@tanstack/react-router";
import { SidebarProvider, TooltipProvider } from "@futrob/ui";
import { ProfileEditor } from "@/modules/identity/presentation/account/profile-editor.tsx";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { QueryTestProvider } from "@/shared/presentation/query/query-test-utils.tsx";
import { ShellAccountDialogsProvider } from "@/shared/presentation/shell/shell-account-dialogs.tsx";
import { DesktopSidebar, MobileNav } from "./shell-sidebar-nav.tsx";
import { buildWorkspaceSelectorModel } from "./workspace-selector-model.ts";

vi.mock("@/modules/identity/auth-client.ts", () => ({
  authClient: {
    useSession: () => ({
      data: { user: { id: "user-1", name: "Alex", email: "alex@example.test" } },
    }),
    changePassword: vi.fn(),
  },
}));
vi.mock("@/shared/presentation/permissions/index.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/presentation/permissions/index.ts")>()),
  useIsSuperuser: () => ({ allowed: false }),
}));
vi.mock("@/modules/notifications/presentation/shell-pending-queue.tsx", () => ({
  ShellPendingQueue: () => null,
}));

beforeEach(() => {
  vi.stubGlobal("PointerEvent", MouseEvent);
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const model = buildWorkspaceSelectorModel({
  memberships: [],
  competitions: [],
  associatedClubs: [],
});

function Shell() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return (
    <SidebarProvider>
      <ShellAccountDialogsProvider>
        {/* The shell keeps the desktop sidebar mounted on mobile and hides it with CSS. */}
        <DesktopSidebar
          allowedPermissions={new Set()}
          model={model}
          onRequestAddClub={() => undefined}
          onSelect={() => undefined}
          pathname={pathname}
          selection={{ kind: "personal" }}
          sidebarLayout="navigation"
        />
        <MobileNav
          allowedPermissions={new Set()}
          model={model}
          onRequestAddClub={() => undefined}
          onSelect={() => undefined}
          pathname={pathname}
          selection={{ kind: "personal" }}
          sidebarLayout="navigation"
          title="Alex"
        />
        <Outlet />
      </ShellAccountDialogsProvider>
    </SidebarProvider>
  );
}

function renderMobileShell() {
  const root = createRootRoute({ component: Shell });
  const home = createRoute({
    getParentRoute: () => root,
    path: "/player",
    component: () => <h1>Inicio</h1>,
  });
  const profile = createRoute({
    getParentRoute: () => root,
    path: "/player/profile",
    component: () => (
      <>
        <h1>Mi perfil</h1>
        <ProfileEditor
          identity={{ name: "Alex", email: "alex@example.test" }}
          save={async () => undefined}
        />
      </>
    ),
  });
  const matches = createRoute({
    getParentRoute: () => root,
    path: "/player/matches",
    component: () => <h1>Mis partidos</h1>,
  });
  const router = createRouter({
    routeTree: root.addChildren([home, profile, matches]),
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
  return router;
}

async function openAccountMenu() {
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "Abrir navegación" }));
  const sheet = await screen.findByRole("dialog", { name: "Navegación" });
  await user.click(within(sheet).getByRole("button", { name: "Abrir menú de cuenta" }));
  return user;
}

describe("account menu in mobile navigation", () => {
  it("closes the navigation sheet when opening Profile and exposes its form", async () => {
    const router = renderMobileShell();
    const user = await openAccountMenu();
    await user.click(await screen.findByRole("menuitem", { name: "Perfil" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/player/profile"));
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Navegación" })).not.toBeInTheDocument(),
    );
    expect(await screen.findByRole("heading", { name: "Mi perfil" })).toBeVisible();
    const name = screen.getByRole("textbox", { name: "Nombre visible" });
    await user.click(name);
    expect(name).toHaveFocus();
  });

  it.each([
    ["Enviar feedback", "Enviar feedback"],
    ["Configuración", "Configuración"],
  ])("preserves navigation and restores account focus after closing %s", async (item, title) => {
    const router = renderMobileShell();
    const user = await openAccountMenu();
    await user.click(await screen.findByRole("menuitem", { name: item }));
    const dialog = await screen.findByRole("dialog", { name: title });
    expect(router.state.location.pathname).toBe("/player");
    await user.click(within(dialog).getAllByRole("button", { name: "Cerrar" })[0]);
    const sheet = await screen.findByRole("dialog", { name: "Navegación" });
    expect(sheet).toBeVisible();
    await waitFor(() =>
      expect(within(sheet).getByRole("button", { name: "Abrir menú de cuenta" })).toHaveFocus(),
    );
  });

  it("closes the navigation sheet after following a navigation link", async () => {
    const router = renderMobileShell();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Abrir navegación" }));
    const sheet = await screen.findByRole("dialog", { name: "Navegación" });

    await user.click(within(sheet).getByRole("link", { name: "Mis partidos" }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/player/matches"));
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Navegación" })).not.toBeInTheDocument(),
    );
    expect(await screen.findByRole("heading", { name: "Mis partidos" })).toBeVisible();
  });
});
