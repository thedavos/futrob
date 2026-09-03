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

const SCENARIO_IDS = ["empty", "ready", "loading", "error", "submitting"] as const;

type ScenarioId = (typeof SCENARIO_IDS)[number];

type StoryArgs = {
  readonly scenario: ScenarioId;
};

function scenarioState(id: ScenarioId): PlayerStoryState {
  const rest = {
    teams: playerTeamsFixture({ teams: [], activeRosterMembershipId: null }),
    setActiveTeam: "success" as const,
    acceptRosterInvitation: "success" as const,
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
    case "submitting":
      return { ...rest, profile: playerProfileFixture(), addGameAccount: "pending" };
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
    await expect(canvas.getByRole("heading", { name: "Añadir cuenta" })).toBeVisible();
    await expect(canvas.getByLabelText("Identificador de EA")).toBeVisible();
    await expect(canvas.getByLabelText("Plataforma")).toBeVisible();
    await expect(canvas.getByLabelText("Edición")).toBeVisible();
    await expect(canvas.getByText("Todavía no vinculaste ninguna cuenta.")).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: "Volver al espacio personal" }),
    ).toHaveAttribute("href", "/player");
  },
};

export const LinkedAccounts: Story = {
  name: "Linked accounts",
  args: { scenario: "ready" },
  render: (args) => <GameDataStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("davos282")).toBeVisible();
    await expect(canvas.getByText("PlayStation · FC 26")).toBeVisible();
    await expect(canvas.getByText("davos.pc")).toBeVisible();
    await expect(canvas.getByText("PC · FC 26")).toBeVisible();
    await expect(canvas.queryByText("Todavía no vinculaste ninguna cuenta.")).toBeNull();
  },
};

export const Loading: Story = {
  name: "Loading",
  args: { scenario: "loading" },
  render: (args) => <GameDataStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Cargando cuentas…")).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "Añadir cuenta" })).toBeVisible();
  },
};

export const ErrorState: Story = {
  name: "Error",
  args: { scenario: "error" },
  render: (args) => <GameDataStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText("No se pudieron cargar tus cuentas de juego."),
    ).toBeVisible();
    await expect(canvas.getByText("Todavía no vinculaste ninguna cuenta.")).toBeVisible();
  },
};

export const FieldValidation: Story = {
  name: "Field validation",
  args: { scenario: "empty" },
  render: (args) => <GameDataStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Añadir cuenta" }));
    await expect(canvas.getByText("Escribe el identificador de EA.")).toBeVisible();
    await expect(canvas.getByText("Selecciona una plataforma.")).toBeVisible();
    await expect(canvas.getByText("Escribe la edición.")).toBeVisible();
  },
};

export const Submitting: Story = {
  name: "Submitting",
  args: { scenario: "submitting" },
  render: (args) => <GameDataStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(await canvas.findByLabelText("Identificador de EA"), "davos282");
    await userEvent.click(canvas.getByLabelText("Plataforma"));
    await userEvent.click(
      await within(document.body).findByRole("option", { name: "PlayStation" }),
    );
    await userEvent.type(canvas.getByLabelText("Edición"), "FC 26");
    await userEvent.click(canvas.getByRole("button", { name: "Añadir cuenta" }));
    await expect(await canvas.findByRole("button", { name: "Guardando…" })).toBeDisabled();
  },
};

export const Mobile: Story = {
  name: "Mobile",
  args: { scenario: "ready" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: (args) => <GameDataStoryShell key={args.scenario} {...args} />,
};
