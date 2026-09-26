import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import type { PlayerStoryState } from "./player-story-client.ts";
import {
  playerProfileFixture,
  playerTeamsFixture,
  readyPlayerProfileFixture,
} from "./player-story-fixtures.ts";
import { PlayerCompetitionsExplorePage } from "./player-competitions-explore-page.tsx";
import { PlayerCompetitionsPage } from "./player-competitions-page.tsx";
import { PlayerStoryShell, PlayerStoryStub, type PlayerStoryRoute } from "./player-story-shell.tsx";

const SCENARIO_IDS = ["ready", "empty", "emptyMultipleClubs", "loading", "error"] as const;

type ScenarioId = (typeof SCENARIO_IDS)[number];

type StoryArgs = {
  readonly scenario: ScenarioId;
};

function scenarioState(id: ScenarioId): PlayerStoryState {
  const rest = {
    addGameAccount: "success" as const,
    setActiveTeam: "success" as const,
    acceptRosterInvitation: "success" as const,
    rosterInvitations: { invitations: [] },
    respondToRosterInvitation: "success" as const,
  };
  switch (id) {
    case "ready":
      return { ...rest, profile: playerProfileFixture(), teams: playerTeamsFixture() };
    case "empty":
      return {
        ...rest,
        profile: playerProfileFixture(),
        teams: playerTeamsFixture({ teams: [], activeRosterMembershipId: null }),
      };
    case "emptyMultipleClubs":
      return {
        ...rest,
        profile: readyPlayerProfileFixture(),
        teams: playerTeamsFixture({ teams: [], activeRosterMembershipId: null }),
      };
    case "loading":
      return { ...rest, profile: playerProfileFixture(), teams: "pending" };
    case "error":
      return { ...rest, profile: playerProfileFixture(), teams: "error" };
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

const COMPETITION_ROUTES: readonly PlayerStoryRoute[] = [
  { path: "/player/competitions", component: PlayerCompetitionsPage },
  { path: "/player/competitions/explore", component: PlayerCompetitionsExplorePage },
  {
    path: "/player/game-accounts",
    component: () => <PlayerStoryStub label="Datos de juego (stub de Storybook)" />,
  },
];

function CompetitionsStoryShell({
  initialPath = "/player/competitions",
  scenario,
}: {
  readonly initialPath?: string;
  readonly scenario: ScenarioId;
}) {
  const state = useMemo(() => scenarioState(scenario), [scenario]);
  return <PlayerStoryShell initialPath={initialPath} routes={COMPETITION_ROUTES} state={state} />;
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
    await expect(await canvas.findByRole("heading", { name: "Mis competiciones" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Explorar competiciones" })).toHaveAttribute(
      "href",
      "/player/competitions/explore",
    );
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
    await expect(
      await canvas.findByRole("heading", { name: "Tu club aún no participa en competiciones" }),
    ).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Explorar competiciones" })).toHaveAttribute(
      "href",
      "/player/competitions/explore",
    );
    await expect(canvas.queryByRole("link", { name: "Cambiar club" })).toBeNull();
    await expect(canvas.queryByRole("button", { name: "Aceptar invitación" })).toBeNull();
  },
};

export const EmptyMultipleClubs: Story = {
  name: "Empty with clubs",
  args: { scenario: "emptyMultipleClubs" },
  render: (args) => <CompetitionsStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("heading", { name: "Tu club aún no participa en competiciones" }),
    ).toBeVisible();
    const switchClub = await canvas.findByRole("link", { name: "Cambiar club" });
    await expect(switchClub).toHaveAttribute("href", "/player/game-accounts");
    await expect(canvas.getByText("¿Buscas otro club?", { exact: false })).toBeVisible();
  },
};

export const Loading: Story = {
  name: "Loading",
  args: { scenario: "loading" },
  render: (args) => <CompetitionsStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Cargando competiciones…")).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "Mis competiciones" })).toBeVisible();
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
    await expect(
      canvas.getByRole("heading", { name: "Tu club aún no participa en competiciones" }),
    ).toBeVisible();
  },
};

export const Mobile: Story = {
  name: "Mobile",
  args: { scenario: "ready" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: (args) => <CompetitionsStoryShell key={args.scenario} {...args} />,
};

export const EmptyMobile: Story = {
  name: "Empty mobile",
  args: { scenario: "empty" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: (args) => <CompetitionsStoryShell key={args.scenario} {...args} />,
};

export const Explore: Story = {
  name: "Explore header",
  args: { scenario: "ready" },
  render: (args) => (
    <CompetitionsStoryShell
      initialPath="/player/competitions/explore"
      key={args.scenario}
      {...args}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("heading", { name: "Explorar competiciones" }),
    ).toBeVisible();
    await expect(
      canvas.getByText("Descubre torneos para seguir y compartir con tu club."),
    ).toBeVisible();
    await expect(canvas.getByText("Competiciones")).toBeVisible();
    await expect(canvas.getByText("Explorar")).toBeVisible();
  },
};
