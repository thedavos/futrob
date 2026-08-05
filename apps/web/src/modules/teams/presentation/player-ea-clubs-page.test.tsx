// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { QueryTestProvider } from "@/shared/presentation/query/query-test-utils.tsx";
import { PlayerEaClubsPage } from "./player-ea-clubs-page.tsx";

const getMyProfile = vi.fn<() => Promise<unknown>>();

vi.mock("./teams-browser-client.ts", () => ({
  teamsBrowserClient: {
    getMyProfile: () => getMyProfile(),
  },
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: { to: string; children?: unknown }) => (
    <a href={to} {...props}>
      {children as never}
    </a>
  ),
}));

describe("PlayerEaClubsPage", () => {
  beforeEach(() => {
    class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      complete = false;
      naturalWidth = 0;
      referrerPolicy = "";
      crossOrigin: string | null = null;
      sizes = "";
      set src(_value: string) {
        this.complete = true;
        this.naturalWidth = 256;
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal("Image", MockImage);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows the associated club with its crest from the profile", async () => {
    getMyProfile.mockResolvedValue({
      profile: { id: "p1", createdAt: "2026-08-01T00:00:00.000Z" },
      gameAccounts: [],
      externalClub: {
        playerProfileId: "p1",
        providerKey: "ea-clubs",
        externalClubId: "10754",
        externalClubName: "Night Owls",
        platform: "common-gen5",
        gameEdition: "fc26",
        imageUrl: "https://example.com/crest.png",
        associatedAt: "2026-08-01T12:00:00.000Z",
      },
    });

    render(
      <QueryTestProvider>
        <PlayerEaClubsPage />
      </QueryTestProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Clubes EA" })).toBeTruthy();
      expect(screen.getByRole("heading", { name: "Night Owls" })).toBeTruthy();
    });
    expect(screen.getByText(/ID 10754/)).toBeTruthy();
    // Club name also appears as the page label above the heading.
    expect(screen.getAllByText("Night Owls").length).toBeGreaterThanOrEqual(2);
    await waitFor(() => {
      expect(document.querySelector('[data-slot="avatar-image"]')).toBeTruthy();
    });
  });

  it("shows empty state when no club is associated", async () => {
    getMyProfile.mockResolvedValue({
      profile: { id: "p1", createdAt: "2026-08-01T00:00:00.000Z" },
      gameAccounts: [],
      externalClub: null,
    });

    render(
      <QueryTestProvider>
        <PlayerEaClubsPage />
      </QueryTestProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Sin club asociado")).toBeTruthy();
    });
    expect(screen.getByRole("button", { name: "Ir al espacio personal" })).toBeTruthy();
  });
});
