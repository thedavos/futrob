// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { CompetitionTeamsView, type CompetitionTeamsViewProps } from "./competition-teams-view.tsx";
import { teamManagementFixture, teamSummaryFixture } from "./competition-teams-view.fixtures.ts";

afterEach(cleanup);

function renderView(overrides: Partial<CompetitionTeamsViewProps> = {}) {
  const detail = teamManagementFixture();
  const props: CompetitionTeamsViewProps = {
    items: [teamSummaryFixture(detail)],
    detail,
    selectedTeamId: detail.team.id,
    capabilities: {
      manageRoster: false,
      manageRoles: false,
      manageInvitations: false,
      manageExternalClub: false,
      manageEntries: false,
      unavailable: false,
    },
    onSelectTeam: () => undefined,
    onChangeRole: async () => undefined,
    onSetRosterOpen: async () => undefined,
    onCreateInvitation: async () => undefined,
    onSearchClubs: async () => [],
    onConnectClub: async () => undefined,
    onDecideEntry: async () => undefined,
    ...overrides,
  };
  render(<CompetitionTeamsView {...props} />);
}

describe("CompetitionTeamsView", () => {
  it("renders explicit roster, entry and club state without granting actions", () => {
    renderView();

    expect(screen.getByRole("heading", { name: "Cuervos FC" })).toBeTruthy();
    expect(screen.getAllByText("Pendiente").length).toBeGreaterThan(0);
    expect(screen.getByText("Cuervos EA · common-gen5")).toBeTruthy();
    expect(screen.getByText("2/11")).toBeTruthy();
    expect(screen.getByText("Abierta")).toBeTruthy();
    expect(screen.getByText("Dani Capitán")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Invitar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Aprobar" })).toBeNull();
  });

  it("keeps the list context in an actionable empty state", () => {
    renderView({ items: [], detail: null, selectedTeamId: null });

    expect(screen.getByText("Aún no hay equipos")).toBeTruthy();
    expect(screen.getByText("Selecciona un equipo")).toBeTruthy();
  });

  it("exposes management controls only when effective capabilities allow them", () => {
    renderView({
      capabilities: {
        manageRoster: true,
        manageRoles: true,
        manageInvitations: true,
        manageExternalClub: true,
        manageEntries: true,
        unavailable: false,
      },
    });

    expect(screen.getByRole("button", { name: "Invitar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Vincular club" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cerrar plantilla" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Aprobar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Rechazar" })).toBeTruthy();
  });

  it("offers an accessible control for the next Team page", async () => {
    let loads = 0;
    renderView({
      hasMoreTeams: true,
      onLoadMoreTeams: async () => {
        loads += 1;
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "Cargar más equipos" }));

    await waitFor(() => expect(loads).toBe(1));
  });

  it("keeps the club query and shows actionable search feedback", async () => {
    renderView({
      capabilities: {
        manageRoster: false,
        manageRoles: false,
        manageInvitations: false,
        manageExternalClub: true,
        manageEntries: false,
        unavailable: false,
      },
      onSearchClubs: async () => {
        throw new Error("network");
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Vincular club" }));
    const input = await screen.findByRole("textbox", { name: "Nombre del club EA" });
    fireEvent.change(input, { target: { value: "Cuervos" } });

    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));

    expect(
      await screen.findByText(
        "No pudimos buscar clubes. Conservamos tu selección para que puedas reintentar.",
      ),
    ).toBeTruthy();
    expect(input).toHaveProperty("value", "Cuervos");
  });

  it("confirms a role change before invoking the action", async () => {
    const user = userEvent.setup();
    const changes: Array<{ membershipId: string; role: string }> = [];
    renderView({
      capabilities: {
        manageRoster: false,
        manageRoles: true,
        manageInvitations: false,
        manageExternalClub: false,
        manageEntries: false,
        unavailable: false,
      },
      onChangeRole: async (membershipId, role) => {
        changes.push({ membershipId, role });
      },
    });

    await user.click(screen.getByRole("combobox", { name: "Rol de Dani Capitán" }));
    await user.click(await screen.findByRole("option", { name: "Jugador" }));

    expect(await screen.findByRole("heading", { name: "Confirmar cambio de rol" })).toBeTruthy();
    expect(changes).toHaveLength(0);
    await user.click(screen.getByRole("button", { name: "Cambiar rol" }));
    await waitFor(() => expect(changes).toEqual([{ membershipId: "member-1", role: "player" }]));
  });
});
