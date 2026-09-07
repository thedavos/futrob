import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { daysFromNowIso } from "@futrob/shared-kernel";
import type { PlayerStoryState } from "./player-story-client.ts";
import {
  playerProfileFixture,
  playerRosterInvitationsFixture,
  playerTeamsFixture,
  rosterInvitationInboxItemFixture,
} from "./player-story-fixtures.ts";
import { HistoryPanel, PlayerInvitationsPage } from "./player-invitations-page.tsx";
import { PlayerStoryShell, PlayerStoryStub, type PlayerStoryRoute } from "./player-story-shell.tsx";

const SCENARIO_IDS = [
  "emptySinHistorial",
  "emptyConHistorial",
  "historial",
  "conInvitaciones",
  "loading",
  "error",
] as const;

type ScenarioId = (typeof SCENARIO_IDS)[number];

type StoryArgs = {
  readonly scenario: ScenarioId;
};

function pendingInvitationsFixture() {
  return [
    rosterInvitationInboxItemFixture(),
    rosterInvitationInboxItemFixture({
      invitationId: "invitation-cuervos",
      teamId: "team-cuervos",
      teamName: "Cuervos FC",
      clubName: "Cuervos FC",
      role: "vice_captain",
      invitedBy: { displayName: "Marta Núñez", gamertag: "martanx", role: "captain" },
      message: null,
      createdAt: daysFromNowIso(-1),
      expiresAt: daysFromNowIso(5),
    }),
    rosterInvitationInboxItemFixture({
      invitationId: "invitation-fera",
      teamId: "team-fera",
      teamName: "Fera Enjaulada",
      clubName: "Fera Enjaulada",
      invitedBy: { displayName: "Luis Paredes", gamertag: null, role: "vice_captain" },
      createdAt: daysFromNowIso(-12),
      expiresAt: daysFromNowIso(2),
    }),
  ];
}

function historyInvitationsFixture() {
  return [
    rosterInvitationInboxItemFixture({
      invitationId: "invitation-aceptada",
      clubName: "Sirius FC",
      status: "accepted",
      createdAt: daysFromNowIso(-10),
      expiresAt: daysFromNowIso(-3),
      respondedAt: daysFromNowIso(-9),
    }),
    rosterInvitationInboxItemFixture({
      invitationId: "invitation-rechazada",
      clubName: "Cuervos FC",
      status: "declined",
      createdAt: daysFromNowIso(-20),
      expiresAt: daysFromNowIso(-13),
      respondedAt: daysFromNowIso(-19),
    }),
    rosterInvitationInboxItemFixture({
      invitationId: "invitation-vencida",
      clubName: "White Lions",
      status: "pending",
      createdAt: daysFromNowIso(-30),
      expiresAt: daysFromNowIso(-23),
    }),
    rosterInvitationInboxItemFixture({
      invitationId: "invitation-anulada",
      clubName: "Fera Enjaulada",
      status: "revoked",
      createdAt: daysFromNowIso(-40),
      expiresAt: daysFromNowIso(-33),
    }),
  ];
}

function scenarioState(id: ScenarioId): PlayerStoryState {
  const rest = {
    profile: playerProfileFixture(),
    teams: playerTeamsFixture({ teams: [], activeRosterMembershipId: null }),
    addGameAccount: "success" as const,
    setActiveTeam: "success" as const,
    acceptRosterInvitation: "success" as const,
    respondToRosterInvitation: "success" as const,
  };
  switch (id) {
    case "emptySinHistorial":
      return { ...rest, rosterInvitations: playerRosterInvitationsFixture([]) };
    case "emptyConHistorial":
      return {
        ...rest,
        rosterInvitations: playerRosterInvitationsFixture([
          rosterInvitationInboxItemFixture({
            invitationId: "invitation-aceptada",
            status: "accepted",
            createdAt: daysFromNowIso(-10),
            expiresAt: daysFromNowIso(-3),
            respondedAt: daysFromNowIso(-9),
          }),
        ]),
      };
    case "historial":
      return {
        ...rest,
        rosterInvitations: playerRosterInvitationsFixture(historyInvitationsFixture()),
      };
    case "conInvitaciones":
      return {
        ...rest,
        rosterInvitations: playerRosterInvitationsFixture(pendingInvitationsFixture()),
      };
    case "loading":
      return { ...rest, rosterInvitations: "pending" };
    case "error":
      return { ...rest, rosterInvitations: "error" };
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

const INVITATIONS_ROUTES: readonly PlayerStoryRoute[] = [
  { path: "/invitations", component: PlayerInvitationsPage },
  {
    path: "/invitations/accept",
    component: () => <PlayerStoryStub label="Canje de código (stub de Storybook)" />,
  },
];

function InvitationsStoryShell({ scenario }: { readonly scenario: ScenarioId }) {
  const state = useMemo(() => scenarioState(scenario), [scenario]);
  return <PlayerStoryShell initialPath="/invitations" routes={INVITATIONS_ROUTES} state={state} />;
}

const meta = {
  title: "Product/Player/Invitations inbox",
  parameters: { layout: "fullscreen" },
  args: {
    scenario: "conInvitaciones",
  },
  argTypes: {
    scenario: {
      control: "select",
      options: [...SCENARIO_IDS],
    },
  },
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

export const Playground: Story = {
  render: (args) => <InvitationsStoryShell key={args.scenario} {...args} />,
};

export const EmptySinHistorial: Story = {
  name: "Empty sin historial",
  args: { scenario: "emptySinHistorial" },
  render: (args) => <InvitationsStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("No tienes invitaciones pendientes")).toBeVisible();
    await expect(
      canvas.getByText(
        "¿Esperabas una invitación? Confirma con el capitán que la haya enviado a tu cuenta.",
      ),
    ).toBeVisible();
    await expect(canvas.queryByRole("tab", { name: "Historial" })).not.toBeInTheDocument();
    await expect(canvas.queryByRole("button", { name: "Ver historial" })).not.toBeInTheDocument();
  },
};

export const EmptyConHistorial: Story = {
  name: "Empty con historial",
  args: { scenario: "emptyConHistorial" },
  render: (args) => <InvitationsStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("No tienes invitaciones pendientes")).toBeVisible();
    await expect(canvas.getByRole("tab", { name: "Pendientes" })).toBeVisible();
    const cta = await canvas.findByRole("button", { name: "Ver historial" });
    await userEvent.click(cta);
    await expect(
      await canvas.findByRole("region", { name: "Listado de invitaciones" }),
    ).toBeVisible();
    await expect((await canvas.findAllByText("Aceptada")).length).toBeGreaterThan(0);
  },
};

export const HistorialVacio: Story = {
  name: "Historial vacío",
  args: { scenario: "emptySinHistorial" },
  render: () => <HistoryPanel items={[]} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Sin invitaciones anteriores")).toBeVisible();
    await expect(
      canvas.getByText(
        "Cuando respondas una invitación, quedará registrada aquí con su resultado.",
      ),
    ).toBeVisible();
    await expect(canvas.queryByRole("button")).not.toBeInTheDocument();
  },
};

export const Historial: Story = {
  name: "Historial",
  args: { scenario: "historial" },
  render: (args) => <InvitationsStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("tab", { name: "Historial" }));
    await expect((await canvas.findAllByText("Aceptada")).length).toBeGreaterThan(0);
    await expect(canvas.getAllByText("Rechazada").length).toBeGreaterThan(0);
    await expect(canvas.getAllByText("Vencida").length).toBeGreaterThan(0);
    await expect(canvas.getAllByText("Anulada").length).toBeGreaterThan(0);
    await expect(
      canvas.queryByRole("button", { name: "Aceptar invitación" }),
    ).not.toBeInTheDocument();
  },
};

export const Loading: Story = {
  name: "Loading",
  args: { scenario: "loading" },
  render: (args) => <InvitationsStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("heading", { name: "Invitaciones" })).toBeVisible();
  },
};

export const ErrorState: Story = {
  name: "Error",
  args: { scenario: "error" },
  render: (args) => <InvitationsStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText(
        "No se pudieron cargar las invitaciones. Comprueba la conexión e inténtalo de nuevo.",
      ),
    ).toBeVisible();
  },
};

export const ConInvitaciones: Story = {
  name: "Con invitaciones",
  args: { scenario: "conInvitaciones" },
  render: (args) => <InvitationsStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Primer item preseleccionado controla el detalle.
    await expect(
      await canvas.findByRole("region", { name: "Detalle de la invitación de Sirius FC" }),
    ).toBeVisible();
    await expect(canvas.getByText("Mensaje del capitán")).toBeVisible();
    await expect(
      canvas.getByText("Al aceptar, te unirás al equipo de Sirius FC en Futrob."),
    ).toBeVisible();

    // Seleccionar otro item actualiza el detalle.
    await userEvent.click(canvas.getByRole("button", { name: /Cuervos FC/ }));
    await expect(
      await canvas.findByRole("region", { name: "Detalle de la invitación de Cuervos FC" }),
    ).toBeVisible();
    // Sin mensaje: el bloque se oculta.
    await expect(canvas.queryByText("Mensaje del capitán")).not.toBeInTheDocument();

    // La búsqueda filtra por nombre del invitador.
    const search = canvas.getByPlaceholderText("Buscar invitación");
    await userEvent.type(search, "Luis");
    await expect(canvas.queryByRole("button", { name: /Sirius FC/ })).not.toBeInTheDocument();
    await expect(
      await canvas.findByRole("region", { name: "Detalle de la invitación de Fera Enjaulada" }),
    ).toBeVisible();
  },
};

export const Aceptar: Story = {
  name: "Aceptar",
  args: { scenario: "conInvitaciones" },
  render: (args) => <InvitationsStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("region", { name: "Detalle de la invitación de Sirius FC" }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Aceptar invitación" }));
    // La invitación pasa al historial y aparecen los tabs.
    await expect(await canvas.findByRole("tab", { name: "Historial" })).toBeVisible();
    await waitFor(() => {
      expect(canvas.queryByRole("button", { name: /Sirius FC/ })).not.toBeInTheDocument();
    });
  },
};

export const Rechazar: Story = {
  name: "Rechazar",
  args: { scenario: "conInvitaciones" },
  render: (args) => <InvitationsStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("region", { name: "Detalle de la invitación de Sirius FC" }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Rechazar invitación" }));
    await expect(await canvas.findByRole("tab", { name: "Historial" })).toBeVisible();
    await userEvent.click(canvas.getByRole("tab", { name: "Historial" }));
    await expect((await canvas.findAllByText("Rechazada")).length).toBeGreaterThan(0);
  },
};

export const Mobile: Story = {
  name: "Mobile",
  args: { scenario: "conInvitaciones" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: (args) => <InvitationsStoryShell key={args.scenario} {...args} />,
};
