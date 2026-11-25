// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
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
  render(
    <I18nProvider initialLocale="es" persistLocale={async () => undefined}>
      <CompetitionTeamsView {...props} />
    </I18nProvider>,
  );
}

describe("CompetitionTeamsView", () => {
  it("renders explicit roster, entry, captaincy and formatted EA club state without granting actions", () => {
    renderView();

    expect(screen.getByRole("heading", { name: "Cuervos FC" })).toBeTruthy();
    expect(screen.getAllByText("Pendiente").length).toBeGreaterThan(0);
    expect(screen.getByText("Cuervos EA · Cross-gen · FC 26")).toBeTruthy();
    expect(screen.getByText("2/11")).toBeTruthy();
    expect(screen.getByText("Abierta")).toBeTruthy();
    expect(screen.getByText("1 asignado")).toBeTruthy();
    expect(screen.getByText("Dani Capitán")).toBeTruthy();
    expect(screen.getByText("PlayStation · FC 26")).toBeTruthy();
    expect(screen.getByText("Sin cuenta EA")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Invitar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Aprobar" })).toBeNull();
  });

  it("keeps the list context in an actionable empty state", () => {
    renderView({ items: [], detail: null, selectedTeamId: null });

    expect(screen.getByText("Sin equipos todavía")).toBeTruthy();
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
    expect(screen.getByRole("button", { name: "Asociar club" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cerrar plantilla" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Aprobar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Rechazar" })).toBeTruthy();
  });

  it("summarizes KPIs and filters teams by status, missing EA club and search query", async () => {
    const user = userEvent.setup();
    const pendingTeam = teamManagementFixture();
    const noClubApproved = {
      ...teamManagementFixture(),
      team: { ...pendingTeam.team, id: "team-2", name: "Halcones Sin Club" },
      entry: { ...pendingTeam.entry, id: "entry-2", teamId: "team-2", status: "approved" as const },
      externalClub: null,
    };

    renderView({
      items: [teamSummaryFixture(pendingTeam), teamSummaryFixture(noClubApproved)],
      detail: pendingTeam,
      selectedTeamId: pendingTeam.team.id,
    });

    expect(screen.getByText("Equipos inscritos")).toBeTruthy();
    expect(screen.getByText("Pendientes de aprobar")).toBeTruthy();
    expect(screen.getAllByText("Sin club EA").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("radio", { name: "Sin club 1" }));
    expect(screen.getByRole("button", { name: /Halcones Sin Club/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Cuervos FC/ })).toBeNull();

    const search = screen.getByRole("searchbox", { name: "Buscar equipo o club…" });
    await user.type(search, "inexistente");
    expect(screen.getByText("Sin coincidencias para este filtro.")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    expect(screen.getByRole("button", { name: /Cuervos FC/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Halcones Sin Club/ })).toBeTruthy();
  });

  it("shows an actionable empty roster state and captaincy warning when a team has no members", () => {
    const emptyDetail = {
      ...teamManagementFixture({ memberCount: 0 }),
      members: [],
    };
    renderView({
      items: [teamSummaryFixture(emptyDetail)],
      detail: emptyDetail,
      selectedTeamId: emptyDetail.team.id,
      capabilities: {
        manageRoster: true,
        manageRoles: true,
        manageInvitations: true,
        manageExternalClub: true,
        manageEntries: true,
        unavailable: false,
      },
    });

    expect(screen.getByText("Sin asignar")).toBeTruthy();
    expect(screen.getByText("Sin jugadores registrados")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Invitar jugador" })).toBeTruthy();
  });

  it("offers an accessible control for the next Team page and notes partial KPI scope", async () => {
    let loads = 0;
    renderView({
      hasMoreTeams: true,
      onLoadMoreTeams: async () => {
        loads += 1;
      },
    });

    expect(
      screen.getByText("Los contadores y filtros corresponden a los 1 equipos cargados."),
    ).toBeTruthy();
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
    fireEvent.click(screen.getByRole("button", { name: "Asociar club" }));
    const input = await screen.findByRole("textbox", { name: "Nombre del club EA" });
    fireEvent.change(input, { target: { value: "Cuervos" } });

    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));

    expect(
      await screen.findByText(
        "No se pudieron buscar clubes. Revisa tu conexión e inténtalo de nuevo.",
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
