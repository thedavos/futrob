// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { AuthRouterDecorator } from "./auth-story-router.tsx";

beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("SignupForm field composition", () => {
  it("renders all field errors inside their Base UI Field roots", async () => {
    render(<AuthRouterDecorator initialPath="/signup" />);

    fireEvent.click(await screen.findByRole("button", { name: "Crear cuenta" }));

    const requiredMessages = await screen.findAllByText("Este campo es obligatorio.");
    expect(requiredMessages).toHaveLength(4);

    for (const message of requiredMessages) {
      expect(message.closest('[data-slot="field-error"]')).not.toBeNull();
    }
  });

  it("validates when focus leaves a composite field and revalidates on change", async () => {
    render(<AuthRouterDecorator initialPath="/signup" />);

    const password = await screen.findByLabelText("Contraseña");
    const email = screen.getByLabelText("Correo electrónico");
    const visibilityButton = screen.getByRole("button", {
      name: "Mostrar contraseña",
    });

    fireEvent.change(password, { target: { value: "12345678" } });
    fireEvent.blur(password, { relatedTarget: visibilityButton });

    expect(screen.getByText("Mínimo 8 caracteres, incluyendo letras y números.")).toBeTruthy();
    expect(screen.queryByText("Incluye al menos una letra.")).toBeNull();

    fireEvent.blur(visibilityButton, { relatedTarget: email });

    expect(await screen.findByText("Incluye al menos una letra.")).toBeTruthy();
    expect(password.getAttribute("aria-invalid")).toBe("true");

    fireEvent.change(password, { target: { value: "clave1234" } });

    await waitFor(() => {
      expect(screen.queryByText("Incluye al menos una letra.")).toBeNull();
    });
    expect(screen.getByText("Mínimo 8 caracteres, incluyendo letras y números.")).toBeTruthy();
    expect(password.hasAttribute("aria-invalid")).toBe(false);
  });
});

it("revalidates confirmation when either password changes and blocks mismatched submission", async () => {
  render(<AuthRouterDecorator initialPath="/signup" />);
  const password = await screen.findByLabelText("Contraseña");
  const confirmation = screen.getByLabelText("Repetir contraseña");
  fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Ana Pérez" } });
  fireEvent.change(screen.getByLabelText("Correo electrónico"), {
    target: { value: "ana@ejemplo.com" },
  });
  fireEvent.change(password, { target: { value: "clave1234" } });
  fireEvent.change(confirmation, { target: { value: "otra1234" } });
  fireEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));
  expect(await screen.findByText("Las contraseñas no coinciden.")).toBeTruthy();
  expect(confirmation.getAttribute("aria-invalid")).toBe("true");
  expect(screen.getByRole("button", { name: "Crear cuenta" }).hasAttribute("disabled")).toBe(false);
  fireEvent.blur(confirmation);
  fireEvent.change(confirmation, { target: { value: "clave1234" } });
  await waitFor(() => expect(screen.queryByText("Las contraseñas no coinciden.")).toBeNull());
  fireEvent.change(password, { target: { value: "nueva1234" } });
  expect(await screen.findByText("Las contraseñas no coinciden.")).toBeTruthy();
  fireEvent.change(password, { target: { value: "clave1234" } });
  await waitFor(() => expect(screen.queryByText("Las contraseñas no coinciden.")).toBeNull());
});
