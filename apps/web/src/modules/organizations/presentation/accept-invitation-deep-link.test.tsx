// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type {
  AcceptCompetitionInvitationResponse,
  AcceptInvitationRequest,
} from "@futrob/api-contracts";
import { QueryTestProvider } from "@/shared/presentation/query/query-test-utils.tsx";
import { OrganizationsClientError } from "./organizations-browser-client.ts";
import { AcceptInvitationDeepLink } from "./accept-invitation-deep-link.tsx";

type TestNavigateInput = {
  readonly to: string;
  readonly params?: Record<string, string>;
};

const mocks = vi.hoisted(() => ({
  accept: vi.fn<(input: AcceptInvitationRequest) => Promise<AcceptCompetitionInvitationResponse>>(),
  navigate: vi.fn<(input: TestNavigateInput) => Promise<void>>(),
}));

vi.mock("./organizations-browser-client.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./organizations-browser-client.ts")>();
  return {
    ...actual,
    organizationsBrowserClient: {
      ...actual.organizationsBrowserClient,
      acceptInvitation: (input: AcceptInvitationRequest) => mocks.accept(input),
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

describe("AcceptInvitationDeepLink", () => {
  it("keeps the token available for manual retry after rate limiting", async () => {
    mocks.accept
      .mockRejectedValueOnce(
        new OrganizationsClientError({
          status: 429,
          code: "api.rate_limited",
          message: "api.rate_limited",
          requestId: "2170e2f6-a47e-4338-83c3-27c054630800",
          retryAfterSeconds: 2,
        }),
      )
      .mockResolvedValueOnce({
        organizationId: "org-1",
        organizationName: "Org Test",
        role: "member",
        competitionId: "comp-1",
        competitionName: "Liga Test",
        destination: { kind: "competition", organizationId: "org-1", competitionId: "comp-1" },
      });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(
      <QueryTestProvider>
        <AcceptInvitationDeepLink plainToken="competition-token" />
      </QueryTestProvider>,
    );

    expect(await screen.findByText("Podrás reintentar en 2 s.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reintentar en 2 s" })).toBeDisabled();

    void act(() => vi.advanceTimersByTime(2_000));
    fireEvent.click(screen.getByRole("button", { name: "Reintentar invitación" }));

    await waitFor(() => expect(mocks.accept).toHaveBeenCalledTimes(2));
    expect(mocks.accept).toHaveBeenLastCalledWith({ token: "competition-token" });
  });
});
