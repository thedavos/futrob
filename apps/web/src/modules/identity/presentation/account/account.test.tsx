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

beforeEach(() => {
  vi.stubGlobal("PointerEvent", MouseEvent);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function frame(children: ReactNode, persistLocale = async () => undefined) {
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

  it("rejects mismatched passwords before contacting auth", async () => {
    const changePassword = vi.fn();
    frame(<SettingsDialog changePassword={changePassword} onOpenChange={() => undefined} open />);
    fireEvent.change(screen.getByLabelText("Contraseña actual"), {
      target: { value: "current-password" },
    });
    fireEvent.change(screen.getByLabelText("Nueva contraseña"), {
      target: { value: "new-password" },
    });
    fireEvent.change(screen.getByLabelText("Repetir nueva contraseña"), {
      target: { value: "different-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("deben coincidir");
    expect(changePassword).not.toHaveBeenCalled();
  });

  it("reports a successful password change separately when language persistence fails", async () => {
    const changePassword = vi.fn().mockResolvedValue({ error: null });
    const persist = vi.fn().mockRejectedValue(new Error("offline"));
    frame(
      <SettingsDialog changePassword={changePassword} onOpenChange={() => undefined} open />,
      persist,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("combobox", { name: "Idioma" }));
    await user.click(await screen.findByRole("option", { name: "English" }));
    fireEvent.change(screen.getByLabelText("Contraseña actual"), {
      target: { value: "current-password" },
    });
    fireEvent.change(screen.getByLabelText("Nueva contraseña"), {
      target: { value: "new-password" },
    });
    fireEvent.change(screen.getByLabelText("Repetir nueva contraseña"), {
      target: { value: "new-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("La contraseña se cambió");
    expect(changePassword).toHaveBeenCalledWith({
      currentPassword: "current-password",
      newPassword: "new-password",
      revokeOtherSessions: true,
    });
    expect(screen.getByLabelText("Nueva contraseña")).toHaveValue("");
    expect(persist).toHaveBeenCalledWith("en");
  });

  it("persists the selected language and updates the dialog copy", async () => {
    const persist = vi.fn().mockResolvedValue(undefined);
    frame(<SettingsDialog onOpenChange={() => undefined} open />, persist);
    const user = userEvent.setup();
    await user.click(screen.getByRole("combobox", { name: "Idioma" }));
    await user.click(await screen.findByRole("option", { name: "English" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(persist).toHaveBeenCalledWith("en"));
    expect(await screen.findByText("Changes saved.")).toBeVisible();
  });

  describe("sidebar layout", () => {
    function stubPreferencesApi(save: () => Response) {
      const saved: unknown[] = [];
      vi.stubGlobal(
        "fetch",
        vi.fn(async (_url: unknown, init: RequestInit = {}) => {
          if (init.method !== "PUT") return Response.json({ sidebarLayout: "navigation" });
          saved.push(init.body);
          return save();
        }),
      );
      return saved;
    }

    async function chooseWithPendingItems() {
      const layout = screen.getByRole("combobox", { name: "Barra lateral" });
      await waitFor(() => expect(layout).toBeEnabled());
      const user = userEvent.setup();
      await user.click(layout);
      await user.click(await screen.findByRole("option", { name: "Con pendientes" }));
    }

    it("sends the chosen layout to the account on Guardar cambios, not before", async () => {
      const saved = stubPreferencesApi(() => Response.json({ sidebarLayout: "pending-queue" }));
      frame(<SettingsDialog onOpenChange={() => undefined} open />);

      await chooseWithPendingItems();
      expect(saved).toEqual([]);

      fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

      expect(await screen.findByText("Cambios guardados.")).toBeVisible();
      expect(saved).toEqual([JSON.stringify({ sidebarLayout: "pending-queue" })]);
    });

    it("keeps the choice and reports the failure when saving fails", async () => {
      stubPreferencesApi(() => Response.json({ code: "api.internal" }, { status: 500 }));
      frame(<SettingsDialog onOpenChange={() => undefined} open />);

      await chooseWithPendingItems();
      fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

      expect(await screen.findByRole("alert")).toBeVisible();
      expect(screen.getByRole("combobox", { name: "Barra lateral" })).toHaveTextContent(
        "Con pendientes",
      );
    });
  });

  describe("email notifications", () => {
    function stubEmailApi(save: () => Response) {
      const saved: unknown[] = [];
      vi.stubGlobal(
        "fetch",
        vi.fn(async (url: unknown, init: RequestInit = {}) => {
          if (!String(url).includes("email-preferences")) {
            return Response.json({ sidebarLayout: "navigation" });
          }
          if (init.method !== "PUT") return Response.json({ locale: "es", nonCriticalEmail: true });
          saved.push(init.body);
          return save();
        }),
      );
      return saved;
    }

    async function chooseOnlyActions() {
      const email = screen.getByRole("combobox", { name: "Avisos por email" });
      await waitFor(() => expect(email).toHaveTextContent("Todos los avisos"));
      const user = userEvent.setup();
      await user.click(email);
      await user.click(
        await screen.findByRole("option", { name: "Solo los que piden una acción" }),
      );
    }

    it("turns off non-critical email on Guardar cambios, in the dialog's language", async () => {
      const saved = stubEmailApi(() => Response.json({ locale: "es", nonCriticalEmail: false }));
      frame(<SettingsDialog onOpenChange={() => undefined} open />);

      await chooseOnlyActions();
      expect(saved).toEqual([]);
      fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

      expect(await screen.findByText("Cambios guardados.")).toBeVisible();
      expect(saved).toEqual([JSON.stringify({ locale: "es", nonCriticalEmail: false })]);
    });

    it("keeps the choice and reports the failure when saving fails", async () => {
      stubEmailApi(() => Response.json({ code: "api.internal" }, { status: 500 }));
      frame(<SettingsDialog onOpenChange={() => undefined} open />);

      await chooseOnlyActions();
      fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos guardar");
      expect(screen.getByRole("combobox", { name: "Avisos por email" })).toHaveTextContent(
        "Solo los que piden una acción",
      );
    });
  });
});
