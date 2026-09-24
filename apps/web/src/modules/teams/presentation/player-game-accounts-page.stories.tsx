import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import type { PlayerStoryState } from "./player-story-client.ts";
import {
  playerProfileFixture,
  playerTeamsFixture,
  readyPlayerProfileFixture,
} from "./player-story-fixtures.ts";
import { PlayerGameAccountsPage } from "./player-game-accounts-page.tsx";
import { PlayerStoryShell, PlayerStoryStub, type PlayerStoryRoute } from "./player-story-shell.tsx";

const SCENARIO_IDS = ["empty", "ready", "loading", "error"] as const;

type ScenarioId = (typeof SCENARIO_IDS)[number];

type StoryArgs = {
  readonly scenario: ScenarioId;
};

function scenarioState(id: ScenarioId): PlayerStoryState {
  const rest = {
    teams: playerTeamsFixture({ teams: [], activeRosterMembershipId: null }),
    setActiveTeam: "success" as const,
    acceptRosterInvitation: "success" as const,
    rosterInvitations: { invitations: [] },
    respondToRosterInvitation: "success" as const,
  };
  switch (id) {
    case "empty":
      return { ...rest, profile: playerProfileFixture(), addGameAccount: "success" };
    case "ready":
      return { ...rest, profile: readyPlayerProfileFixture(), addGameAccount: "success" };
    case "loading":
      return { ...rest, profile: "pending", addGameAccount: "success" };
    case "error":
      return { ...rest, profile: "error", addGameAccount: "success" };
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

const GAME_DATA_ROUTES: readonly PlayerStoryRoute[] = [
  { path: "/player/game-accounts", component: PlayerGameAccountsPage },
  {
    path: "/player",
    component: () => <PlayerStoryStub label="Espacio personal (stub de Storybook)" />,
  },
  {
    path: "/player/matches",
    component: () => <PlayerStoryStub label="Mis partidos (stub de Storybook)" />,
  },
];

function GameDataStoryShell({ scenario }: { readonly scenario: ScenarioId }) {
  const state = useMemo(() => scenarioState(scenario), [scenario]);
  return (
    <PlayerStoryShell initialPath="/player/game-accounts" routes={GAME_DATA_ROUTES} state={state} />
  );
}

const meta = {
  title: "Product/Player/Game data",
  parameters: { layout: "fullscreen" },
  args: {
    scenario: "empty",
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
  render: (args) => <GameDataStoryShell key={args.scenario} {...args} />,
};

export const Empty: Story = {
  name: "Empty",
  args: { scenario: "empty" },
  render: (args) => <GameDataStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("heading", { name: "Datos de juego" })).toBeVisible();
    await expect(
      canvas.getByText("Registra tu identificador para consultar tu actividad de EA Clubs."),
    ).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Actualizar datos" })).toBeEnabled();
    await expect(
      canvas.getByRole("heading", { name: "Registra tus datos de juego" }),
    ).toBeVisible();
    await expect(
      canvas.getByText(
        "Selecciona tu plataforma, busca tu club de EA Clubs y registra tu identificador.",
      ),
    ).toBeVisible();
    const register = canvas.getByRole("button", { name: "Registra tu identificador" });
    await expect(register).toBeEnabled();
    await userEvent.click(register);
    await expect(register).toBeEnabled();
    await expect(
      canvas.getByText(
        "Los partidos y las estadísticas aparecen cuando registres tu identificador.",
      ),
    ).toBeVisible();
    await expect(canvas.queryByRole("heading", { name: "Identificador del jugador" })).toBeNull();
    await expect(canvas.queryByRole("heading", { name: "Clubes asociados" })).toBeNull();
    await expect(canvas.queryByRole("heading", { name: "Añadir cuenta" })).toBeNull();
  },
};

export const LinkedAccounts: Story = {
  name: "Linked accounts",
  args: { scenario: "ready" },
  render: (args) => <GameDataStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("button", { name: "Actualizar datos" })).toBeEnabled();
    await expect(canvas.getByText("davos282")).toBeVisible();
    await expect(canvas.getByRole("img", { name: "PlayStation" })).toBeVisible();
    await expect(canvas.getByText("Night Owls")).toBeVisible();
    await expect(canvas.getByText("Seleccionado")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Night Owls · 10754" })).toHaveAttribute(
      "href",
      "/player/matches",
    );
    await userEvent.click(canvas.getByRole("button", { name: "Cambiar club Fera Enjaulada" }));
    await expect(canvas.getByRole("button", { name: "Fera Enjaulada · 22110" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Cambiar club Night Owls" })).toBeVisible();
  },
};

export const Loading: Story = {
  name: "Loading",
  args: { scenario: "loading" },
  render: (args) => <GameDataStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: "Actualizar datos" })).toBeDisabled();
    await expect(canvas.getByText("Cargando datos de juego…")).toBeVisible();
    await expect(canvas.queryByRole("heading", { name: "Registra tus datos de juego" })).toBeNull();
    await expect(canvas.queryByRole("heading", { name: "Identificador del jugador" })).toBeNull();
    await expect(canvas.queryByText("Todavía no registraste un identificador de EA.")).toBeNull();
  },
};

export const ErrorState: Story = {
  name: "Error",
  args: { scenario: "error" },
  render: (args) => <GameDataStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("button", { name: "Actualizar datos" })).toBeEnabled();
    await expect(canvas.getByText("No se pudieron cargar tus datos de juego.")).toBeVisible();
    await expect(canvas.queryByRole("heading", { name: "Registra tus datos de juego" })).toBeNull();
    await expect(canvas.queryByText("Todavía no registraste un identificador de EA.")).toBeNull();
  },
};

export const Mobile: Story = {
  name: "Mobile",
  args: { scenario: "ready" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: (args) => <GameDataStoryShell key={args.scenario} {...args} />,
};

export const EmptyMobile: Story = {
  name: "Empty mobile",
  args: { scenario: "empty" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: (args) => <GameDataStoryShell key={args.scenario} {...args} />,
};
