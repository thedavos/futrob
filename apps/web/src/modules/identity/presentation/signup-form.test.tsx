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
    expect(requiredMessages).toHaveLength(3);

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
