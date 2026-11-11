// @vitest-environment jsdom
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { QueryTestProvider } from "@/shared/presentation/query/query-test-utils.tsx";
import { ProfileEditor } from "./profile-editor.tsx";
import { FeedbackDialog } from "./feedback-dialog.tsx";
import { SettingsDialog } from "./settings-dialog.tsx";
import type { AccountAuth } from "./account-auth.ts";
import { AccountDeletionGate } from "../account-deletion-gate.tsx";

beforeEach(() => {
  vi.stubGlobal("PointerEvent", MouseEvent);
  // Wide layout: section navigation beside the panel.
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: true,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    })),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function frame(
  children: ReactNode,
  persistLocale: (locale: string) => Promise<void> = async () => undefined,
) {
  return render(
    <I18nProvider initialLocale="es" persistLocale={persistLocale}>
      <QueryTestProvider>{children}</QueryTestProvider>
    </I18nProvider>,
  );
}

describe("personal account", () => {
  it("saves a trimmed display name and retains edits after failure", async () => {
    const save = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(undefined);
    frame(<ProfileEditor identity={{ name: "Alex", email: "alex@example.test" }} save={save} />);
    fireEvent.change(screen.getByLabelText("Nombre visible"), {
      target: { value: "  Alex García  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar perfil" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Tus cambios siguen aquí");
    expect(screen.getByLabelText("Nombre visible")).toHaveValue("  Alex García  ");
    fireEvent.click(screen.getByRole("button", { name: "Guardar perfil" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Perfil guardado");
    expect(save.mock.calls.at(-1)?.[0]).toBe("Alex García");
    expect(screen.getByLabelText("Correo de la cuenta")).toHaveAttribute("readonly");
  });

  it("shows a disabled feedback send action and preserves the draft across close", () => {
    const change = vi.fn();
    const view = frame(<FeedbackDialog onOpenChange={change} open pathname="/player" />);
    fireEvent.change(screen.getByLabelText("Tu mensaje"), { target: { value: "Missing match" } });
    expect(screen.getByRole("button", { name: "Enviar feedback" })).toBeDisabled();
    expect(screen.getByText(/Tu mensaje no se ha enviado/)).toBeVisible();
    view.rerender(
      <I18nProvider initialLocale="es">
        <QueryTestProvider>
          <FeedbackDialog onOpenChange={change} open={false} pathname="/player" />
        </QueryTestProvider>
      </I18nProvider>,
    );
    view.rerender(
      <I18nProvider initialLocale="es">
        <QueryTestProvider>
          <FeedbackDialog onOpenChange={change} open pathname="/player" />
        </QueryTestProvider>
      </I18nProvider>,
    );
    expect(screen.getByLabelText("Tu mensaje")).toHaveValue("Missing match");
  });
});

type FetchRoute = (init: RequestInit) => Response | Promise<Response>;

/** Answers the BFF the dialog talks to; unknown paths fail loudly. */
function stubApi(routes: Record<string, FetchRoute>) {
  const calls: { path: string; method: string; body: unknown }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: unknown, init: RequestInit = {}) => {
      const path = String(url);
      const method = init.method ?? "GET";
      calls.push({ path, method, body: init.body ? JSON.parse(String(init.body)) : undefined });
      const route = routes[`${method} ${path}`] ?? routes[path];
      if (!route) return Response.json({ code: "test.unrouted" }, { status: 500 });
      return route(init);
    }),
  );
  return calls;
}

const ACTIVE = { deletion: { status: "active" }, blockers: [] };
const SCHEDULED = {
  deletion: {
    status: "scheduled",
    requestedAt: "2026-11-10T09:00:00.000Z",
    scheduledFor: "2026-12-10T09:00:00.000Z",
  },
  blockers: [],
};

function fakeAuth(overrides: Partial<AccountAuth> = {}): AccountAuth {
  return {
    getSession: async () => ({
      data: { session: { id: "s-this" }, user: { email: "alex@example.test" } },
      error: null,
    }),
    listSessions: async () => ({
      data: [
        {
          id: "s-this",
          token: "t-this",
          createdAt: "2026-11-01T10:00:00.000Z",
          updatedAt: "2026-11-09T10:00:00.000Z",
          expiresAt: "2026-12-01T10:00:00.000Z",
          userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/130.0 Safari/537.36",
        },
        {
          id: "s-phone",
          token: "t-phone",
          createdAt: "2026-11-02T10:00:00.000Z",
          updatedAt: "2026-11-08T10:00:00.000Z",
          expiresAt: "2026-12-02T10:00:00.000Z",
          userAgent: "okhttp/4.12.0",
        },
      ],
      error: null,
    }),
    revokeSession: async () => ({ error: null }),
    revokeOtherSessions: async () => ({ error: null }),
    changePassword: async () => ({ error: null }),
    changeEmail: async () => ({ error: null }),
    signOut: async () => undefined,
    ...overrides,
  };
}

function openAccount(auth: AccountAuth, persistLocale?: (locale: string) => Promise<void>) {
  return frame(<SettingsDialog auth={auth} onOpenChange={() => undefined} open />, persistLocale);
}

describe("account dialog", () => {
  it("offers four sections, keeps what was typed when switching and has no global save", async () => {
    const changePassword = vi.fn(async () => ({ error: null }));
    stubApi({
      "/api/v1/identity/preferences": () => Response.json({ sidebarLayout: "navigation" }),
      "/api/v1/identity/account/deletion": () => Response.json(ACTIVE),
    });
    openAccount(fakeAuth({ changePassword }));
    const user = userEvent.setup();

    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "Preferencias",
      "Seguridad",
      "Sesiones",
      "Eliminar cuenta",
    ]);
    await user.click(screen.getByRole("tab", { name: "Seguridad" }));
    await user.type(screen.getByLabelText("Contraseña actual"), "current-password");
    await user.click(screen.getByRole("tab", { name: "Sesiones" }));
    await user.click(screen.getByRole("tab", { name: "Seguridad" }));

    expect(screen.getByLabelText("Contraseña actual")).toHaveValue("current-password");
    expect(changePassword).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /Guardar/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Cambiar contraseña" })).toBeVisible();
    expect(screen.getAllByRole("button", { name: "Cerrar" }).length).toBeGreaterThan(0);
  });

  it("rejects mismatched passwords before contacting auth", async () => {
    stubApi({
      "/api/v1/identity/preferences": () => Response.json({ sidebarLayout: "navigation" }),
    });
    const changePassword = vi.fn();
    openAccount(fakeAuth({ changePassword }));
    fireEvent.change(screen.getByLabelText("Contraseña actual"), {
      target: { value: "current-password" },
    });
    fireEvent.change(screen.getByLabelText("Nueva contraseña"), {
      target: { value: "new-password" },
    });
    fireEvent.change(screen.getByLabelText("Repetir nueva contraseña"), {
      target: { value: "different-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cambiar contraseña", hidden: true }));
    expect(await screen.findByText(/deben coincidir/)).toBeInTheDocument();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it("changes the password and says the other sessions were signed out", async () => {
    stubApi({
      "/api/v1/identity/preferences": () => Response.json({ sidebarLayout: "navigation" }),
    });
    const changePassword = vi.fn(async () => ({ error: null }));
    openAccount(fakeAuth({ changePassword }));
    fireEvent.change(screen.getByLabelText("Contraseña actual"), { target: { value: "old-pass" } });
    fireEvent.change(screen.getByLabelText("Nueva contraseña"), {
      target: { value: "new-password" },
    });
    fireEvent.change(screen.getByLabelText("Repetir nueva contraseña"), {
      target: { value: "new-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cambiar contraseña", hidden: true }));
    expect(await screen.findByText(/Cerramos tus otras sesiones/)).toBeInTheDocument();
    expect(changePassword).toHaveBeenCalledWith({
      currentPassword: "old-pass",
      newPassword: "new-password",
      revokeOtherSessions: true,
    });
    expect(screen.getByLabelText("Nueva contraseña")).toHaveValue("");
  });

  it("asks the new address to confirm an email change and keeps the current one meanwhile", async () => {
    stubApi({
      "/api/v1/identity/preferences": () => Response.json({ sidebarLayout: "navigation" }),
    });
    const changeEmail = vi.fn(async () => ({ error: null }));
    openAccount(fakeAuth({ changeEmail }));
    expect(await screen.findByText("Entras con alex@example.test.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Correo nuevo"), {
      target: { value: "alex@example.test" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cambiar correo", hidden: true }));
    expect(await screen.findByText("Ese ya es tu correo.")).toBeInTheDocument();
    expect(changeEmail).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Correo nuevo"), {
      target: { value: " New@Example.test " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cambiar correo", hidden: true }));
    expect(await screen.findByText(/Enlace enviado a new@example.test/)).toBeInTheDocument();
    expect(changeEmail).toHaveBeenCalledWith({
      newEmail: "new@example.test",
      callbackURL: "/player/profile",
    });
  });

  it("applies the language on selection", async () => {
    stubApi({
      "/api/v1/identity/preferences": () => Response.json({ sidebarLayout: "navigation" }),
    });
    const persist = vi.fn().mockResolvedValue(undefined);
    openAccount(fakeAuth(), persist);
    const user = userEvent.setup();
    await user.click(screen.getByRole("combobox", { name: "Idioma" }));
    await user.click(await screen.findByRole("option", { name: "English" }));
    await waitFor(() => expect(persist).toHaveBeenCalledWith("en"));
    expect(await screen.findByText("Saved.")).toBeVisible();
  });

  describe("sidebar layout", () => {
    async function chooseWithPendingItems() {
      const layout = screen.getByRole("combobox", { name: "Barra lateral" });
      await waitFor(() => expect(layout).toBeEnabled());
      const user = userEvent.setup();
      await user.click(layout);
      await user.click(await screen.findByRole("option", { name: "Con pendientes" }));
    }

    it("saves the chosen layout to the account on selection", async () => {
      const calls = stubApi({
        "GET /api/v1/identity/preferences": () => Response.json({ sidebarLayout: "navigation" }),
        "PUT /api/v1/identity/preferences": () => Response.json({ sidebarLayout: "pending-queue" }),
      });
      openAccount(fakeAuth());

      await chooseWithPendingItems();

      expect(await screen.findByText("Guardado.")).toBeVisible();
      expect(calls.filter((call) => call.method === "PUT").map((call) => call.body)).toEqual([
        { sidebarLayout: "pending-queue" },
      ]);
    });

    it("keeps the previous layout and says so when saving fails", async () => {
      stubApi({
        "GET /api/v1/identity/preferences": () => Response.json({ sidebarLayout: "navigation" }),
        "PUT /api/v1/identity/preferences": () =>
          Response.json({ code: "api.internal" }, { status: 500 }),
      });
      openAccount(fakeAuth());

      await chooseWithPendingItems();

      expect(await screen.findByRole("alert")).toHaveTextContent("Sigue la anterior");
      expect(screen.getByRole("combobox", { name: "Barra lateral" })).toHaveTextContent(
        "Navegación",
      );
    });
  });

  describe("email notifications", () => {
    async function chooseOnlyActions() {
      const email = screen.getByRole("combobox", { name: "Avisos por email" });
      await waitFor(() => expect(email).toHaveTextContent("Todos los avisos"));
      const user = userEvent.setup();
      await user.click(email);
      await user.click(
        await screen.findByRole("option", { name: "Solo los que piden una acción" }),
      );
    }

    it("turns off non-critical email on selection, in the dialog's language", async () => {
      const calls = stubApi({
        "/api/v1/identity/preferences": () => Response.json({ sidebarLayout: "navigation" }),
        "GET /api/v1/notifications/email-preferences": () =>
          Response.json({ locale: "es", nonCriticalEmail: true }),
        "PUT /api/v1/notifications/email-preferences": () =>
          Response.json({ locale: "es", nonCriticalEmail: false }),
      });
      openAccount(fakeAuth());

      await chooseOnlyActions();

      expect(await screen.findByText("Guardado.")).toBeVisible();
      expect(
        calls
          .filter((call) => call.method === "PUT" && call.path.includes("email-preferences"))
          .map((call) => call.body),
      ).toEqual([{ locale: "es", nonCriticalEmail: false }]);
    });

    it("keeps the previous choice and says so when saving fails", async () => {
      stubApi({
        "/api/v1/identity/preferences": () => Response.json({ sidebarLayout: "navigation" }),
        "GET /api/v1/notifications/email-preferences": () =>
          Response.json({ locale: "es", nonCriticalEmail: true }),
        "PUT /api/v1/notifications/email-preferences": () =>
          Response.json({ code: "api.internal" }, { status: 500 }),
      });
      openAccount(fakeAuth());

      await chooseOnlyActions();

      expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos guardar los avisos");
      expect(screen.getByRole("combobox", { name: "Avisos por email" })).toHaveTextContent(
        "Todos los avisos",
      );
    });

    it("re-saves the email language when the language changes", async () => {
      const calls = stubApi({
        "/api/v1/identity/preferences": () => Response.json({ sidebarLayout: "navigation" }),
        "GET /api/v1/notifications/email-preferences": () =>
          Response.json({ locale: "es", nonCriticalEmail: false }),
        "PUT /api/v1/notifications/email-preferences": () =>
          Response.json({ locale: "en", nonCriticalEmail: false }),
      });
      openAccount(fakeAuth(), async () => undefined);
      const email = screen.getByRole("combobox", { name: "Avisos por email" });
      await waitFor(() => expect(email).toHaveTextContent("Solo los que piden una acción"));
      const user = userEvent.setup();
      await user.click(screen.getByRole("combobox", { name: "Idioma" }));
      await user.click(await screen.findByRole("option", { name: "English" }));

      await waitFor(() =>
        expect(
          calls
            .filter((call) => call.method === "PUT" && call.path.includes("email-preferences"))
            .map((call) => call.body),
        ).toEqual([{ locale: "en", nonCriticalEmail: false }]),
      );
    });
  });

  it("lists sessions with this one first and signs another device out", async () => {
    stubApi({
      "/api/v1/identity/preferences": () => Response.json({ sidebarLayout: "navigation" }),
    });
    const revokeSession = vi.fn(async () => ({ error: null }));
    openAccount(fakeAuth({ revokeSession }));
    const user = userEvent.setup();
    await user.click(screen.getByRole("tab", { name: "Sesiones" }));

    const items = await screen.findAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Chrome en macOS");
    expect(items[0]).toHaveTextContent("Esta sesión");
    await user.click(screen.getByRole("button", { name: "Cerrar la sesión de App de Futrob" }));

    expect(revokeSession).toHaveBeenCalledWith({ token: "t-phone" });
  });

  describe("delete account", () => {
    async function openDelete() {
      const user = userEvent.setup();
      await user.click(screen.getByRole("tab", { name: "Eliminar cuenta" }));
      return user;
    }

    it("explains each responsibility to hand over instead of offering the request", async () => {
      stubApi({
        "/api/v1/identity/preferences": () => Response.json({ sidebarLayout: "navigation" }),
        "/api/v1/identity/account/deletion": () =>
          Response.json({
            deletion: { status: "active" },
            blockers: [
              { kind: "sole-organizer", organizationId: "org-1", organizationName: "Liga Norte" },
              {
                kind: "active-captain",
                competitionId: "c-1",
                competitionName: "Apertura",
                teamId: "t-1",
                teamName: "Halcones",
              },
            ],
          }),
      });
      openAccount(fakeAuth());
      await openDelete();

      expect(await screen.findByText(/único organizador de Liga Norte/)).toBeVisible();
      expect(screen.getByText(/capitán de Halcones en Apertura/)).toBeVisible();
      expect(screen.queryByRole("button", { name: "Eliminar cuenta" })).toBeNull();
    });

    it("keeps the account when the password is wrong, then schedules it and signs out", async () => {
      const calls = stubApi({
        "/api/v1/identity/preferences": () => Response.json({ sidebarLayout: "navigation" }),
        "GET /api/v1/identity/account/deletion": () => Response.json(ACTIVE),
        "POST /api/v1/identity/account/deletion": (init) =>
          JSON.parse(String(init.body)).password === "right-pass"
            ? Response.json(SCHEDULED)
            : Response.json(
                {
                  code: "identity.reauthentication_failed",
                  messageKey: "errors.identity.reauthentication_failed",
                },
                { status: 403 },
              ),
      });
      const signOut = vi.fn(async () => undefined);
      openAccount(fakeAuth({ signOut }));
      const user = await openDelete();

      await user.click(await screen.findByRole("button", { name: "Eliminar cuenta" }));
      await user.type(
        await screen.findByLabelText("Contraseña", { selector: "#settings-delete-password" }),
        "guess",
      );
      await user.click(screen.getByRole("button", { name: "Eliminar mi cuenta" }));
      expect(
        await screen.findByText("La contraseña no coincide. La cuenta sigue activa."),
      ).toBeVisible();
      expect(signOut).not.toHaveBeenCalled();

      const password = screen.getByLabelText("Contraseña", {
        selector: "#settings-delete-password",
      });
      await user.clear(password);
      await user.type(password, "right-pass");
      await user.click(screen.getByRole("button", { name: "Eliminar mi cuenta" }));

      await waitFor(() => expect(signOut).toHaveBeenCalled());
      expect(calls.filter((call) => call.method === "POST").map((call) => call.body)).toEqual([
        { password: "guess" },
        { password: "right-pass" },
      ]);
    });
  });
});

describe("account deletion grace period", () => {
  it("shows only the date and the way to cancel, and cancelling restores the app", async () => {
    let status: unknown = SCHEDULED;
    stubApi({
      "GET /api/v1/identity/account/deletion": () => Response.json(status),
      "DELETE /api/v1/identity/account/deletion": () => {
        status = ACTIVE;
        return Response.json(ACTIVE);
      },
    });
    frame(
      <AccountDeletionGate signOut={async () => undefined}>
        <p>Inicio del jugador</p>
      </AccountDeletionGate>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Tu cuenta se eliminará el 10 de diciembre de 2026",
      }),
    ).toBeVisible();
    expect(screen.queryByText("Inicio del jugador")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar eliminación" }));

    expect(await screen.findByText("Inicio del jugador")).toBeVisible();
  });
});
