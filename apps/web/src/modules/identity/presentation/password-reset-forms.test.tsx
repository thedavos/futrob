// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { AuthRouterDecorator } from "./auth-story-router.tsx";

const auth = vi.hoisted(() => ({
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
}));

vi.mock("@/modules/identity/auth-client.ts", () => ({ authClient: auth }));

function answer(method: ReturnType<typeof vi.fn>, error: { status: number; code?: string } | null) {
  method.mockResolvedValue(
    error === null ? { data: { status: true }, error } : { data: null, error },
  );
}

beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
  auth.requestPasswordReset.mockReset();
  auth.resetPassword.mockReset();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("offers password recovery from the login form", async () => {
  render(<AuthRouterDecorator initialPath="/login" />);
  const link = await screen.findByRole("link", { name: "¿Olvidaste tu contraseña?" });
  expect(link).toHaveAttribute("href", "/forgot-password");
});

describe("ForgotPasswordForm", () => {
  it("asks for a link that lands on the web reset page and confirms without naming the account", async () => {
    answer(auth.requestPasswordReset, null);
    render(<AuthRouterDecorator initialPath="/forgot-password" />);

    fireEvent.change(await screen.findByLabelText("Correo electrónico"), {
      target: { value: " ana@example.test " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar enlace" }));

    expect(await screen.findByText("Revisa tu correo")).toBeTruthy();
    expect(screen.getByText(/Si hay una cuenta con ese correo/)).toBeTruthy();
    expect(auth.requestPasswordReset).toHaveBeenCalledWith({
      email: "ana@example.test",
      redirectTo: "/reset-password",
    });
  });

  it("tells the user to wait when the request is rate limited", async () => {
    answer(auth.requestPasswordReset, { status: 429 });
    render(<AuthRouterDecorator initialPath="/forgot-password" />);

    fireEvent.change(await screen.findByLabelText("Correo electrónico"), {
      target: { value: "ana@example.test" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar enlace" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Demasiados intentos");
  });
});

describe("ResetPasswordForm", () => {
  async function submitNewPassword() {
    fireEvent.change(await screen.findByLabelText("Contraseña nueva"), {
      target: { value: "clave1234" },
    });
    fireEvent.change(screen.getByLabelText("Repetir contraseña"), {
      target: { value: "clave1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar contraseña" }));
  }

  it("offers another link when the auth worker already rejected the link", async () => {
    render(<AuthRouterDecorator initialPath="/reset-password?error=INVALID_TOKEN" />);

    expect(await screen.findByText("Este enlace ya no sirve")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Pedir otro enlace" })).toHaveAttribute(
      "href",
      "/forgot-password",
    );
  });

  it("offers another link when the token was used or expired on submit", async () => {
    answer(auth.resetPassword, { status: 400, code: "INVALID_TOKEN" });
    render(<AuthRouterDecorator initialPath="/reset-password?token=used-token" />);

    await submitNewPassword();

    expect(await screen.findByText("Este enlace ya no sirve")).toBeTruthy();
    expect(auth.resetPassword).toHaveBeenCalledWith({
      newPassword: "clave1234",
      token: "used-token",
    });
  });

  it("confirms the new password and sends the user to sign in", async () => {
    answer(auth.resetPassword, null);
    render(<AuthRouterDecorator initialPath="/reset-password?token=fresh-token" />);

    await submitNewPassword();

    expect(await screen.findByText("Contraseña actualizada")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toHaveAttribute("href", "/login");
  });
});
