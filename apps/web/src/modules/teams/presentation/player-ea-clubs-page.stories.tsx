import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import type { PlayerStoryState } from "./player-story-client.ts";
import {
  playerProfileFixture,
  playerTeamsFixture,
  readyPlayerProfileFixture,
} from "./player-story-fixtures.ts";
import { PlayerEaClubsPage } from "./player-ea-clubs-page.tsx";
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
    addGameAccount: "success" as const,
  };
  switch (id) {
    case "empty":
      return { ...rest, profile: playerProfileFixture() };
    case "ready":
      return { ...rest, profile: readyPlayerProfileFixture() };
    case "loading":
      return { ...rest, profile: "pending" };
    case "error":
      return { ...rest, profile: "error" };
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

const EA_CLUBS_ROUTES: readonly PlayerStoryRoute[] = [
  { path: "/player/ea-clubs", component: PlayerEaClubsPage },
  {
    path: "/player",
    component: () => <PlayerStoryStub label="Espacio personal (stub de Storybook)" />,
  },
];

function EaClubsStoryShell({ scenario }: { readonly scenario: ScenarioId }) {
  const state = useMemo(() => scenarioState(scenario), [scenario]);
  return <PlayerStoryShell initialPath="/player/ea-clubs" routes={EA_CLUBS_ROUTES} state={state} />;
}

const meta = {
  title: "Product/Player/EA Clubs",
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
  render: (args) => <EaClubsStoryShell key={args.scenario} {...args} />,
};

export const LinkedClubs: Story = {
  name: "Linked clubs",
  args: { scenario: "ready" },
  render: (args) => <EaClubsStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("heading", { name: "Clubes EA" })).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "Night Owls" })).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "Fera Enjaulada" })).toBeVisible();
    await expect(canvas.getByText(/ID 10754/)).toBeVisible();
    await expect(canvas.queryByRole("status", { name: "Cargando clubes…" })).toBeNull();
  },
};

export const Loading: Story = {
  name: "Loading",
  args: { scenario: "loading" },
  render: (args) => <EaClubsStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: "Clubes EA" })).toBeVisible();
    const status = canvas.getByRole("status", { name: "Cargando clubes…" });
    await expect(status).toBeVisible();
    await expect(status).toHaveAttribute("aria-busy", "true");
    await expect(canvasElement.querySelector("[data-slot='skeleton']")).not.toBeNull();
    await expect(canvas.queryByRole("heading", { name: "Night Owls" })).toBeNull();
    await expect(canvas.queryByText("Sin clubes asociados")).toBeNull();
    for (const bone of canvasElement.querySelectorAll("[data-slot='skeleton']")) {
      await expect(bone).toHaveAttribute("aria-hidden", "true");
    }
  },
};

export const Empty: Story = {
  name: "Empty",
  args: { scenario: "empty" },
  render: (args) => <EaClubsStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("heading", { name: "Sin clubes asociados" }),
    ).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Ir al espacio personal" })).toHaveAttribute(
      "href",
      "/player",
    );
    await expect(canvas.queryByRole("status", { name: "Cargando clubes…" })).toBeNull();
  },
};

export const ErrorState: Story = {
  name: "Error",
  args: { scenario: "error" },
  render: (args) => <EaClubsStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText(
        "No se pudieron cargar los clubes. Comprueba la conexión e inténtalo de nuevo.",
      ),
    ).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "Sin clubes asociados" })).toBeVisible();
    await expect(canvas.queryByRole("status", { name: "Cargando clubes…" })).toBeNull();
  },
};

export const Mobile: Story = {
  name: "Mobile",
  args: { scenario: "ready" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: (args) => <EaClubsStoryShell key={args.scenario} {...args} />,
};

export const LoadingMobile: Story = {
  name: "Loading mobile",
  args: { scenario: "loading" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: (args) => <EaClubsStoryShell key={args.scenario} {...args} />,
};

export const EmptyMobile: Story = {
  name: "Empty mobile",
  args: { scenario: "empty" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: (args) => <EaClubsStoryShell key={args.scenario} {...args} />,
};
