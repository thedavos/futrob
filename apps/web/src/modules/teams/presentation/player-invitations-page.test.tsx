// @vitest-environment jsdom

import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type {
  ListMyRosterInvitationsResponse,
  RespondToRosterInvitationResponse,
} from "@futrob/api-contracts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { QueryTestProvider } from "@/shared/presentation/query/query-test-utils.tsx";
import { PlayerInvitationsPage } from "./player-invitations-page.tsx";
import {
  playerRosterInvitationsFixture,
  rosterInvitationInboxItemFixture,
} from "./player-story-fixtures.ts";

const listMyRosterInvitations = vi.fn<() => Promise<ListMyRosterInvitationsResponse>>();
const respondToRosterInvitation =
  vi.fn<
    (invitationId: string, input: { action: string }) => Promise<RespondToRosterInvitationResponse>
  >();

vi.mock("./teams-browser-client.ts", () => ({
  teamsBrowserClient: {
    listMyRosterInvitations: () => listMyRosterInvitations(),
    respondToRosterInvitation: (invitationId: string, input: { action: string }) =>
      respondToRosterInvitation(invitationId, input),
  },
}));

vi.mock("@/modules/competitions/presentation/entry-invitations-browser-client.ts", () => ({
  listMyEntryInvitations: async () => ({ invitations: [] }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: { to: string; children?: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

const pending = playerRosterInvitationsFixture([
  rosterInvitationInboxItemFixture({ invitationId: "invitation-sirius", clubName: "Sirius FC" }),
]);

function renderPage() {
  return render(
    <I18nProvider initialLocale="es" persistLocale={async () => undefined}>
      <QueryTestProvider>
        <PlayerInvitationsPage />
      </QueryTestProvider>
    </I18nProvider>,
  );
}

describe("PlayerInvitationsPage responses", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("moves a declined invitation out of pending before the server answers", async () => {
    listMyRosterInvitations.mockResolvedValue(pending);
    respondToRosterInvitation.mockReturnValue(new Promise(() => undefined));
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Rechazar invitación" }));

    expect(await screen.findByText("No tienes invitaciones pendientes")).toBeTruthy();
    expect(respondToRosterInvitation).toHaveBeenCalledWith("invitation-sirius", {
      action: "decline",
    });
  });

  it("brings the invitation back with an error when the decline fails", async () => {
    listMyRosterInvitations
      .mockResolvedValueOnce(pending)
      .mockReturnValue(new Promise(() => undefined));
    let reject: (error: Error) => void = () => {};
    respondToRosterInvitation.mockReturnValue(
      new Promise((_resolve, rejectRespond) => {
        reject = rejectRespond;
      }),
    );
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Rechazar invitación" }));
    await screen.findByText("No tienes invitaciones pendientes");
    reject(new Error("network"));

    expect(
      await screen.findByText("No pudimos registrar tu respuesta. Inténtalo de nuevo."),
    ).toBeTruthy();
    expect(screen.queryByText("No tienes invitaciones pendientes")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Rechazar invitación" }).hasAttribute("disabled"),
    ).toBe(false);
  });

  it("keeps an accepted invitation pending until the server answers", async () => {
    listMyRosterInvitations.mockResolvedValue(pending);
    respondToRosterInvitation.mockReturnValue(new Promise(() => undefined));
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Aceptar invitación" }));

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Aceptar invitación" }).hasAttribute("disabled"),
      ).toBe(true),
    );
    expect(screen.queryByText("No tienes invitaciones pendientes")).toBeNull();
  });
});
