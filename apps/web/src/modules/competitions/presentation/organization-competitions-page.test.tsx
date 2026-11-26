// @vitest-environment jsdom

import type { ReactNode } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { ListOrganizationCompetitionsResponse } from "@futrob/api-contracts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { QueryTestProvider } from "@/shared/presentation/query/query-test-utils.tsx";
import { OrganizationCompetitionsPage } from "./organization-competitions-page.tsx";
import { ORGANIZATION_COMPETITIONS_SKELETON_ROWS } from "./organization-competitions-skeleton.tsx";

const listOrganizationCompetitions = vi.fn<() => Promise<ListOrganizationCompetitionsResponse>>();

vi.mock("./competitions-browser-client.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./competitions-browser-client.ts")>()),
  listOrganizationCompetitions: () => listOrganizationCompetitions(),
}));

vi.mock("@/shared/presentation/permissions/index.ts", () => ({
  useCan: () => ({ allowed: true, loading: false }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    children,
    ...props
  }: {
    to: string;
    params?: Record<string, string>;
    children?: ReactNode;
  }) => (
    <a href={to.replaceAll(/\$(\w+)/g, (_, key: string) => params?.[key] ?? "")} {...props}>
      {children}
    </a>
  ),
}));

function renderPage() {
  return render(
    <I18nProvider initialLocale="es" persistLocale={async () => undefined}>
      <QueryTestProvider>
        <OrganizationCompetitionsPage organizationId="org-1" />
      </QueryTestProvider>
    </I18nProvider>,
  );
}

describe("OrganizationCompetitionsPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("mirrors the competition list with a busy skeleton while loading", async () => {
    listOrganizationCompetitions.mockImplementation(() => new Promise(() => undefined));

    const { container } = renderPage();

    await expect(screen.findByRole("heading", { name: "Competiciones" })).resolves.toBeTruthy();
    const status = await screen.findByRole("status", { name: "Cargando competiciones…" });
    expect(status.textContent).toBe("Cargando competiciones…");
    expect(status.closest("[aria-busy='true']")).toBeNull();
    const busyRegion = container.querySelector("[aria-busy='true']");
    expect(busyRegion).not.toBeNull();
    expect(busyRegion?.contains(status)).toBe(false);
    expect(busyRegion?.querySelectorAll("[data-slot='skeleton']")).toHaveLength(
      ORGANIZATION_COMPETITIONS_SKELETON_ROWS * 3,
    );
    expect(busyRegion?.querySelector("ul")?.getAttribute("aria-hidden")).toBe("true");
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("announces loading outside the busy container and clears it when competitions arrive", async () => {
    let resolveCompetitions: (value: ListOrganizationCompetitionsResponse) => void = () => {};
    listOrganizationCompetitions.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCompetitions = resolve;
        }),
    );

    const { container } = renderPage();
    const activeBefore = document.activeElement;

    const status = await screen.findByRole("status", { name: "Cargando competiciones…" });
    expect(status.textContent).toBe("Cargando competiciones…");
    expect(status.closest("[aria-busy='true']")).toBeNull();
    const busyRegion = container.querySelector("[aria-busy='true']");
    expect(busyRegion).not.toBeNull();
    expect(busyRegion?.contains(status)).toBe(false);

    resolveCompetitions({
      competitions: [
        {
          id: "league",
          organizationId: "org-1",
          name: "Liga Metropolitana",
          status: "published",
          modality: "fc-clubs",
          exploreListing: "listed",
          gameEdition: "FC 26",
          platform: "playstation",
          region: "south-america",
          timeZone: "America/Lima",
          format: "league",
          teams: { min: 2, max: null },
          schedule: { startsOn: null, endsOn: null },
          cover: { kind: "preset", preset: "league" },
          createdAt: "2026-08-01T00:00:00.000Z",
          updatedAt: "2026-10-05T12:00:00.000Z",
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /Liga Metropolitana/ })).toBeTruthy();
    });
    expect(status.isConnected).toBe(true);
    expect(status.textContent).toBe("");
    expect(screen.queryByRole("status", { name: "Cargando competiciones…" })).toBeNull();
    expect(container.querySelector("[aria-busy='true']")).toBeNull();
    expect(document.activeElement).toBe(activeBefore);
  });

  it("lists competitions when the organization query resolves", async () => {
    listOrganizationCompetitions.mockResolvedValue({
      competitions: [
        {
          id: "league",
          organizationId: "org-1",
          name: "Liga Metropolitana",
          status: "published",
          modality: "fc-clubs",
          exploreListing: "listed",
          gameEdition: "FC 26",
          platform: "playstation",
          region: "south-america",
          timeZone: "America/Lima",
          format: "league",
          teams: { min: 2, max: null },
          schedule: { startsOn: null, endsOn: null },
          cover: { kind: "preset", preset: "league" },
          createdAt: "2026-08-01T00:00:00.000Z",
          updatedAt: "2026-10-05T12:00:00.000Z",
        },
      ],
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /Liga Metropolitana/ })).toBeTruthy();
    });
    expect(screen.getByRole("link", { name: /Liga Metropolitana/ }).getAttribute("href")).toBe(
      "/orgs/org-1/competitions/league",
    );
    expect(screen.getByText("Publicada")).toBeTruthy();
    expect(screen.queryByRole("status", { name: "Cargando competiciones…" })).toBeNull();
  });

  it("shows the empty draft CTA when the organization has no competitions", async () => {
    listOrganizationCompetitions.mockResolvedValue({ competitions: [] });

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Sin competiciones todavía" })).toBeTruthy();
    });
    expect(screen.getByRole("button", { name: "Nueva competición" }).getAttribute("href")).toBe(
      "/orgs/org-1/competitions/new",
    );
  });

  it("surfaces a recoverable error instead of the list", async () => {
    listOrganizationCompetitions.mockRejectedValue(new Error("unavailable"));

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText(
          "No se pudieron cargar las competiciones. Comprueba la conexión e inténtalo de nuevo.",
        ),
      ).toBeTruthy();
    });
    expect(screen.queryByRole("status", { name: "Cargando competiciones…" })).toBeNull();
  });
});
