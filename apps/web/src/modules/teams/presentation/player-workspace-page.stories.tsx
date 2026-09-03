import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import type { PlayerStoryState } from "./player-story-client.ts";
import {
  playerProfileFixture,
  playerTeamsFixture,
  readyPlayerProfileFixture,
} from "./player-story-fixtures.ts";
import { PlayerStoryShell, PlayerStoryStub, type PlayerStoryRoute } from "./player-story-shell.tsx";
import { PlayerWorkspacePage } from "./player-workspace-page.tsx";

const SCENARIO_IDS = ["ready", "empty", "noAccounts"] as const;

type ScenarioId = (typeof SCENARIO_IDS)[number];

type StoryArgs = {
  readonly scenario: ScenarioId;
};

function scenarioState(id: ScenarioId): PlayerStoryState {
  switch (id) {
    case "ready":
      return {
        profile: readyPlayerProfileFixture(),
        teams: playerTeamsFixture(),
        addGameAccount: "success",
        setActiveTeam: "success",
        acceptRosterInvitation: "success",
      };
    case "empty":
      return {
        profile: playerProfileFixture(),
        teams: playerTeamsFixture({ teams: [], activeRosterMembershipId: null }),
        addGameAccount: "success",
        setActiveTeam: "success",
        acceptRosterInvitation: "success",
      };
    case "noAccounts":
      return {
        profile: playerProfileFixture(),
        teams: playerTeamsFixture(),
        addGameAccount: "success",
        setActiveTeam: "success",
        acceptRosterInvitation: "success",
      };
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

const HOME_ROUTES: readonly PlayerStoryRoute[] = [
  { path: "/player", component: PlayerWorkspacePage },
  {
    path: "/player/matches",
    component: () => <PlayerStoryStub label="Mis partidos (stub de Storybook)" />,
  },
  {
    path: "/player/statistics",
    component: () => <PlayerStoryStub label="Mis estadísticas (stub de Storybook)" />,
  },
  {
    path: "/player/game-accounts",
    component: () => <PlayerStoryStub label="Datos de juego (stub de Storybook)" />,
  },
  {
    path: "/invitations/accept",
    component: () => <PlayerStoryStub label="Invitaciones (stub de Storybook)" />,
  },
  {
    path: "/orgs/new",
    component: () => <PlayerStoryStub label="Crear organización (stub de Storybook)" />,
  },
];

function HomeStoryShell({ scenario }: { readonly scenario: ScenarioId }) {
  const state = useMemo(() => scenarioState(scenario), [scenario]);
  return <PlayerStoryShell initialPath="/player" routes={HOME_ROUTES} state={state} />;
}

const meta = {
  title: "Product/Player/Home",
  parameters: { layout: "fullscreen" },
  args: {
    scenario: "ready",
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
  render: (args) => <HomeStoryShell key={args.scenario} {...args} />,
};

export const Ready: Story = {
  name: "Ready",
  args: { scenario: "ready" },
  render: (args) => <HomeStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("heading", { name: "Tu espacio de jugador" }),
    ).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "Mis partidos" })).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "Mis estadísticas" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Abrir Mis partidos" })).toHaveAttribute(
      "href",
      "/player/matches",
    );
    await expect(canvas.getByRole("button", { name: "Abrir tu perfil" })).toHaveAttribute(
      "href",
      "/player/statistics",
    );
    await expect(canvas.getByText("Fera Enjaulada")).toBeVisible();
    await expect(canvas.getByText("Cuervos FC")).toBeVisible();
    await expect(canvas.getByText(/Rol Capitán/)).toBeVisible();
    await expect(canvas.getByText(/davos282 · PlayStation · FC 26/)).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Administrar cuentas" })).toHaveAttribute(
      "href",
      "/player/game-accounts",
    );
    await expect(canvas.getByRole("button", { name: "Aceptar invitación" })).toHaveAttribute(
      "href",
      "/invitations/accept",
    );
  },
};

export const Empty: Story = {
  name: "Empty",
  args: { scenario: "empty" },
  render: (args) => <HomeStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Sin plantillas todavía")).toBeVisible();
    await expect(canvas.getByText(/Vincula un identificador/)).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Vincular cuenta" })).toHaveAttribute(
      "href",
      "/player/game-accounts",
    );
    await expect(canvas.getByRole("button", { name: "Aceptar invitación" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Crear organización" })).toHaveAttribute(
      "href",
      "/orgs/new",
    );
  },
};

export const NoAccounts: Story = {
  name: "Teams without game accounts",
  args: { scenario: "noAccounts" },
  render: (args) => <HomeStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Fera Enjaulada")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Vincular cuenta" })).toBeVisible();
    await expect(canvas.queryByText("davos282")).toBeNull();
  },
};

export const SetActiveTeam: Story = {
  name: "Set active team",
  args: { scenario: "ready" },
  render: (args) => <HomeStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Cuervos FC")).toBeVisible();
    await userEvent.click(canvas.getByRole("radio", { name: /Cuervos FC/ }));
    await waitFor(() => {
      expect(canvas.getByRole("radio", { name: /Cuervos FC/ })).toHaveAttribute(
        "aria-checked",
        "true",
      );
    });
  },
};

export const Mobile: Story = {
  name: "Mobile",
  args: { scenario: "ready" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: (args) => <HomeStoryShell key={args.scenario} {...args} />,
};
