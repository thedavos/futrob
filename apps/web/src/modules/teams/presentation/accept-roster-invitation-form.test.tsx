// @vitest-environment jsdom

import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type {
  AcceptRosterInvitationRequest,
  AcceptRosterInvitationResponse,
} from "@futrob/api-contracts";
import { QueryTestProvider } from "@/shared/presentation/query/query-test-utils.tsx";
import { AcceptRosterInvitationForm } from "./accept-roster-invitation-form.tsx";

const accepted: AcceptRosterInvitationResponse = {
  id: "membership-1",
  organizationId: "org-1",
  competitionId: "comp-1",
  teamId: "team-1",
  playerProfileId: "profile-1",
  gameAccountId: null,
  role: "player",
  createdAt: "2026-08-14T22:00:00.000Z",
};

type TestNavigateInput = {
  readonly to: string;
  readonly search?: Record<string, string | undefined>;
};

const mocks = vi.hoisted(() => ({
  accept:
    vi.fn<(input: AcceptRosterInvitationRequest) => Promise<AcceptRosterInvitationResponse>>(),
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
});

describe("AcceptRosterInvitationForm", () => {
  it("accepts a typed token through the mutation, not a query", async () => {
    mocks.accept.mockResolvedValue(accepted);
    render(
      <QueryTestProvider>
        <AcceptRosterInvitationForm />
      </QueryTestProvider>,
    );
    fireEvent.change(screen.getByLabelText("Código de invitación"), {
      target: { value: "typed-token" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Unirme a la plantilla" }));
    await waitFor(() => expect(mocks.accept).toHaveBeenCalledTimes(1));
    expect(mocks.accept).toHaveBeenCalledWith({ token: "typed-token" });
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: "/player" }));
  });
});
