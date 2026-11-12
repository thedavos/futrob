// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { AuthRouterDecorator } from "./auth-story-router.tsx";
import { EmailVerificationNotice } from "./email-verification.tsx";

const auth = vi.hoisted(() => ({
  useSession: vi.fn(),
  sendVerificationEmail: vi.fn(),
}));

vi.mock("@/modules/identity/auth-client.ts", () => ({ authClient: auth }));

const refetch = vi.fn();

function signedIn(emailVerified: boolean | null) {
  auth.useSession.mockReturnValue({
    isPending: false,
    refetch,
    data: emailVerified === null ? null : { user: { email: "ana@example.test", emailVerified } },
  });
}

function answer(error: { status: number; code?: string } | null) {
  auth.sendVerificationEmail.mockResolvedValue(
    error === null ? { data: { status: true }, error } : { data: null, error },
  );
}

beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
  auth.useSession.mockReset();
  auth.sendVerificationEmail.mockReset();
  refetch.mockReset();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("EmailVerificationNotice", () => {
  function renderNotice() {
    render(
      <I18nProvider initialLocale="es">
        <EmailVerificationNotice />
      </I18nProvider>,
    );
  }

  it("stays out of the way once the email is verified", () => {
    signedIn(true);
    renderNotice();
    expect(screen.queryByText("Confirma tu correo")).toBeNull();
  });

  it("names the address and sends another link that lands on the web page", async () => {
    signedIn(false);
    answer(null);
    renderNotice();

    expect(screen.getByRole("status")).toHaveTextContent("ana@example.test");
    fireEvent.click(screen.getByRole("button", { name: "Enviar otro enlace" }));

    expect(await screen.findByText(/Te enviamos otro enlace/)).toBeTruthy();
    expect(auth.sendVerificationEmail).toHaveBeenCalledWith({
      email: "ana@example.test",
      callbackURL: "/verify-email",
    });
  });

  it("asks to wait when resends are rate limited", async () => {
    signedIn(false);
    answer({ status: 429 });
    renderNotice();

    fireEvent.click(screen.getByRole("button", { name: "Enviar otro enlace" }));

    expect(await screen.findByText(/Demasiados intentos/)).toBeTruthy();
  });

  it("refreshes the session when another tab already verified the email", async () => {
    signedIn(false);
    answer({ status: 400, code: "EMAIL_ALREADY_VERIFIED" });
    renderNotice();

    fireEvent.click(screen.getByRole("button", { name: "Enviar otro enlace" }));

    await vi.waitFor(() => expect(refetch).toHaveBeenCalled());
  });
});

describe("VerifyEmailResult", () => {
  it("confirms a verified email and leads into the app", async () => {
    signedIn(true);
    render(<AuthRouterDecorator initialPath="/verify-email" />);

    expect(await screen.findByText("Correo confirmado")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ir a Futrob" })).toHaveAttribute("href", "/player");
  });

  it("offers another link for a used or expired one while the email is unverified", async () => {
    signedIn(false);
    answer(null);
    render(<AuthRouterDecorator initialPath="/verify-email?error=TOKEN_EXPIRED" />);

    expect(await screen.findByText("Este enlace ya no sirve")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Enviar otro enlace" }));
    expect(await screen.findByText(/Te enviamos otro enlace/)).toBeTruthy();
  });

  it("does not offer a link the account no longer needs", async () => {
    signedIn(true);
    render(<AuthRouterDecorator initialPath="/verify-email?error=TOKEN_USED" />);

    expect(await screen.findByText("Tu correo ya está confirmado")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Enviar otro enlace" })).toBeNull();
  });

  it("asks a signed-out visitor to sign in before sending another link", async () => {
    signedIn(null);
    render(<AuthRouterDecorator initialPath="/verify-email?error=INVALID_TOKEN" />);

    const link = await screen.findByRole("link", { name: "Inicia sesión para pedir otro enlace" });
    expect(link.getAttribute("href")).toContain("/login");
  });
});
