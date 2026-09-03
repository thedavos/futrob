import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import type { PlayerStoryState } from "./player-story-client.ts";
import { playerProfileFixture, playerTeamsFixture } from "./player-story-fixtures.ts";
import { PlayerCompetitionsPage } from "./player-competitions-page.tsx";
import { PlayerStoryShell, PlayerStoryStub, type PlayerStoryRoute } from "./player-story-shell.tsx";

const SCENARIO_IDS = ["ready", "empty", "loading", "error"] as const;

type ScenarioId = (typeof SCENARIO_IDS)[number];

type StoryArgs = {
  readonly scenario: ScenarioId;
};

function scenarioState(id: ScenarioId): PlayerStoryState {
  const rest = {
    profile: playerProfileFixture(),
    addGameAccount: "success" as const,
    setActiveTeam: "success" as const,
    acceptRosterInvitation: "success" as const,
  };
  switch (id) {
    case "ready":
      return { ...rest, teams: playerTeamsFixture() };
    case "empty":
      return { ...rest, teams: playerTeamsFixture({ teams: [], activeRosterMembershipId: null }) };
    case "loading":
      return { ...rest, teams: "pending" };
    case "error":
      return { ...rest, teams: "error" };
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

const COMPETITION_ROUTES: readonly PlayerStoryRoute[] = [
  { path: "/player/competitions", component: PlayerCompetitionsPage },
  {
    path: "/invitations/accept",
    component: () => <PlayerStoryStub label="Invitaciones (stub de Storybook)" />,
  },
];

function CompetitionsStoryShell({ scenario }: { readonly scenario: ScenarioId }) {
  const state = useMemo(() => scenarioState(scenario), [scenario]);
  return (
    <PlayerStoryShell
      initialPath="/player/competitions"
      routes={COMPETITION_ROUTES}
      state={state}
    />
  );
}

const meta = {
  title: "Product/Player/Competitions",
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
  render: (args) => <CompetitionsStoryShell key={args.scenario} {...args} />,
};

export const Ready: Story = {
  name: "Ready",
  args: { scenario: "ready" },
  render: (args) => <CompetitionsStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("heading", { name: "Competiciones" })).toBeVisible();
    await expect(canvas.getByText("Competición copa-invierno")).toBeVisible();
    await expect(canvas.getByText("Equipo Fera Enjaulada")).toBeVisible();
    await expect(canvas.getByText("Competición liga-nocturna")).toBeVisible();
    await expect(canvas.getByText("Equipo Cuervos FC")).toBeVisible();
  },
};

export const Empty: Story = {
  name: "Empty",
  args: { scenario: "empty" },
  render: (args) => <CompetitionsStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Sin competiciones todavía")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Aceptar invitación" })).toHaveAttribute(
      "href",
      "/invitations/accept",
    );
  },
};

export const Loading: Story = {
  name: "Loading",
  args: { scenario: "loading" },
  render: (args) => <CompetitionsStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Cargando competiciones…")).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "Competiciones" })).toBeVisible();
  },
};

export const ErrorState: Story = {
  name: "Error",
  args: { scenario: "error" },
  render: (args) => <CompetitionsStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText(
        "No se pudieron cargar las competiciones. Comprueba la conexión e inténtalo de nuevo.",
      ),
    ).toBeVisible();
    await expect(canvas.getByText("Sin competiciones todavía")).toBeVisible();
  },
};

export const Mobile: Story = {
  name: "Mobile",
  args: { scenario: "ready" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: (args) => <CompetitionsStoryShell key={args.scenario} {...args} />,
};
