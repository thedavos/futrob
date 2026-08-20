// @vitest-environment jsdom

import type { ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { AcceptRosterInvitationRequest } from "@futrob/api-contracts";
import { QueryTestProvider } from "@/shared/presentation/query/query-test-utils.tsx";
import { TeamsClientError } from "./teams-browser-client.ts";
import { AcceptRosterInvitationForm } from "./accept-roster-invitation-form.tsx";

type TestNavigateInput = {
  readonly to: string;
  readonly search?: Record<string, string | undefined>;
};

const mocks = vi.hoisted(() => ({
  accept: vi.fn<(input: AcceptRosterInvitationRequest) => Promise<Record<string, never>>>(),
  navigate: vi.fn<(input: TestNavigateInput) => Promise<void>>(),
}));

vi.mock("./teams-browser-client.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./teams-browser-client.ts")>();
  return {
    ...actual,
    teamsBrowserClient: {
      ...actual.teamsBrowserClient,
      acceptRosterInvitation: (input: AcceptRosterInvitationRequest) => mocks.accept(input),
    },
  };
});

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children?: ReactNode; to: string }) => (
    <a {...props}>{children}</a>
  ),
  useNavigate: () => mocks.navigate,
}));

afterEach(() => {
  cleanup();
  mocks.accept.mockReset();
  mocks.navigate.mockReset();
  vi.useRealTimers();
});

describe("AcceptRosterInvitationForm", () => {
  it("offers a usable retry after auto-accept is rate limited", async () => {
    mocks.accept
      .mockRejectedValueOnce(
        new TeamsClientError(429, "api.rate_limited", "2170e2f6-a47e-4338-83c3-27c054630800", 2),
      )
      .mockResolvedValueOnce({});
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(
      <QueryTestProvider>
        <AcceptRosterInvitationForm autoAccept initialToken="roster-token" />
      </QueryTestProvider>,
    );

    expect(await screen.findByText("Podrás reintentar en 2 s.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reintentar en 2 s" })).toBeDisabled();

    void act(() => vi.advanceTimersByTime(2_000));
    fireEvent.click(screen.getByRole("button", { name: "Reintentar invitación" }));

    await waitFor(() => expect(mocks.accept).toHaveBeenCalledTimes(2));
    expect(mocks.accept).toHaveBeenLastCalledWith({ token: "roster-token" });
  });
});
