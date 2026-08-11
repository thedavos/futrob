// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { QueryTestProvider } from "@/shared/presentation/query/query-test-utils.tsx";
import { OrganizationsClientError } from "./organizations-browser-client.ts";
import { AcceptInvitationForm } from "./accept-invitation-form.tsx";

const mocks = vi.hoisted(() => ({
  accept: vi.fn<(input: unknown) => Promise<unknown>>(),
  navigate: vi.fn<(input: unknown) => Promise<void>>(),
}));

vi.mock("./organizations-browser-client.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./organizations-browser-client.ts")>();
  return {
    ...actual,
    organizationsBrowserClient: {
      ...actual.organizationsBrowserClient,
      acceptInvitation: (input: unknown) => mocks.accept(input),
    },
  };
});

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => mocks.navigate }));

afterEach(() => {
  cleanup();
  mocks.accept.mockReset();
  mocks.navigate.mockReset();
  vi.useRealTimers();
});

describe("AcceptInvitationForm", () => {
  it("keeps the entered token while retry is blocked", async () => {
    mocks.accept.mockRejectedValueOnce(
      new OrganizationsClientError({
        status: 429,
        code: "api.rate_limited",
        message: "api.rate_limited",
        retryAfterSeconds: 2,
      }),
    );
    render(
      <QueryTestProvider>
        <AcceptInvitationForm />
      </QueryTestProvider>,
    );

    const input = screen.getByRole("textbox", { name: "Código de invitación" });
    fireEvent.change(input, { target: { value: "competition-token" } });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fireEvent.click(screen.getByRole("button", { name: "Unirme a la competición" }));

    expect(await screen.findByText("Podrás reintentar en 2 s.")).toBeTruthy();
    expect((input as HTMLInputElement).value).toBe("competition-token");
    expect(
      (screen.getByRole("button", { name: "Reintentar en 2 s" }) as HTMLButtonElement).disabled,
    ).toBe(true);

    void act(() => vi.advanceTimersByTime(2_000));
    expect(
      (screen.getByRole("button", { name: "Unirme a la competición" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });
});
