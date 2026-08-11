// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";
import { CompetitionTeamsView, type CompetitionTeamsViewProps } from "./competition-teams-view.tsx";
import { teamManagementFixture, teamSummaryFixture } from "./competition-teams-view.fixtures.ts";

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
});
