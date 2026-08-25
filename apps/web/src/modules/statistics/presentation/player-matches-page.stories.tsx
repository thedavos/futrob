import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { expect, userEvent, waitFor, within } from "storybook/test";
import * as stylex from "@stylexjs/stylex";
import { applyHost, typography } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import {
  PLAYER_MATCHES_PAGE_NOW,
  recentMatchesReadyFixture,
  recentProviderMatchFixture,
} from "./player-matches-page.fixtures.ts";
import { PlayerMatchesPage, type PlayerMatchesView } from "./player-matches-page.tsx";
import { PLAYER_MATCHES_VIEWS } from "./player-match-view.ts";
import {
  configurePlayerMatchesStory,
  type PlayerMatchesStoryState,
} from "./player-matches-story-client.ts";

const styles = stylex.create({
  stub: {
    padding: "1.5rem",
    color: colors.mutedForeground,
  },
  frame: {
    minHeight: "100svh",
    backgroundColor: colors.background,
    paddingInline: "1.5rem",
    paddingBlock: "1.5rem",
  },
});

const STORY_CLUB_ID = "10754";

const SCENARIO_IDS = [
  "ready",
  "loading",
  "needsClub",
  "needsGameAccount",
  "recentEmpty",
  "olderMatch",
  "allMatches",
  "error",
] as const;

type ScenarioId = (typeof SCENARIO_IDS)[number];

type StoryArgs = {
  readonly scenario: ScenarioId;
  readonly view: PlayerMatchesView;
};

function scenarioState(id: ScenarioId): PlayerMatchesStoryState {
  switch (id) {
    case "ready":
    case "allMatches":
      return { recent: recentMatchesReadyFixture() };
    case "loading":
      return { recent: "pending" };
    case "needsClub":
      return { recent: { status: "needs_club" } };
    case "needsGameAccount":
      return { recent: { status: "needs_game_account" } };
    case "recentEmpty":
      return { recent: recentMatchesReadyFixture([]) };
    case "olderMatch":
      return {
        recent: recentMatchesReadyFixture([
          recentProviderMatchFixture({
            id: "provider-match-older",
            externalMatchId: "ea-older",
            occurredAt: new Date(2026, 7, 1, 18, 0).toISOString(),
            home: { externalClubId: "44001", name: "Atlético Norte", goals: 1, imageUrl: null },
            appearance: { externalClubId: "44001" },
          }),
        ]),
      };
    case "error":
      return { recent: "error" };
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

function hydratePlayerMatchesQueries(client: QueryClient, state: PlayerMatchesStoryState): void {
  if (state.recent !== "pending" && state.recent !== "error") {
    client.setQueryData(queryKeys.gameData.meRecentMatches(STORY_CLUB_ID), state.recent);
  }
}

function PlayerMatchesStoryShell({
  scenario,
  view,
}: {
  readonly scenario: ScenarioId;
  readonly view: PlayerMatchesView;
}) {
  const client = useMemo(() => {
    const next = scenarioState(scenario);
    configurePlayerMatchesStory(next);
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity, gcTime: Infinity },
        mutations: { retry: false },
      },
    });
    hydratePlayerMatchesQueries(queryClient, next);
    return queryClient;
  }, [scenario]);

  const router = useMemo(() => {
    const rootRoute = createRootRoute({
      component: Outlet,
    });
    const matchesRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/player/matches",
      component: () => (
        <PlayerMatchesPage
          externalClubId={STORY_CLUB_ID}
          now={PLAYER_MATCHES_PAGE_NOW}
          view={view}
        />
      ),
    });
    const gameAccountsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/player/game-accounts",
      component: () => (
        <p {...applyHost(undefined, undefined, typography.body, styles.stub)}>
          Datos de juego (stub de Storybook)
        </p>
      ),
    });
    return createRouter({
      routeTree: rootRoute.addChildren([matchesRoute, gameAccountsRoute]),
      history: createMemoryHistory({ initialEntries: ["/player/matches"] }),
    });
  }, [scenario, view]);

  return (
    <QueryClientProvider client={client}>
      <I18nProvider initialLocale="es" persistLocale={async () => undefined}>
        <div {...applyHost(undefined, undefined, styles.frame)}>
          <RouterProvider router={router} />
        </div>
      </I18nProvider>
    </QueryClientProvider>
  );
}

const meta = {
  title: "Product/Player/Matches",
  parameters: { layout: "fullscreen" },
  args: {
    scenario: "ready",
    view: "all",
  },
  argTypes: {
    scenario: {
      control: "select",
      options: [...SCENARIO_IDS],
    },
    view: {
      control: "select",
      options: [...PLAYER_MATCHES_VIEWS],
    },
  },
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

export const Playground: Story = {
  render: (args) => <PlayerMatchesStoryShell key={`${args.scenario}-${args.view}`} {...args} />,
};

export const Ready: Story = {
  name: "Ready",
  args: { scenario: "ready", view: "all" },
  render: (args) => <PlayerMatchesStoryShell key={`${args.scenario}-${args.view}`} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("heading", { name: "Mis partidos" })).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "Rendimiento" })).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "Record" })).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "Contribuciones" })).toBeVisible();
    await expect(canvas.getByLabelText("Forma reciente")).toBeVisible();
    await expect(canvas.getByText("Forma reciente")).toBeVisible();
    await expect(canvas.getByText("Hoy")).toBeVisible();
    await expect(canvas.getByText("Ayer")).toBeVisible();
    await expect(canvas.getAllByText("Fera Enjaulada")[0]).toBeVisible();
    await expect(canvas.getByText("davos282 MVP")).toBeVisible();
    await expect(canvas.getByText("Hat-trick")).toBeVisible();
    await expect(canvasElement.querySelector("[data-match-status='finalized']")).toHaveTextContent(
      "Finalizado",
    );
    await expect(canvasElement.querySelector("[data-match-type='leagueMatch']")).toHaveTextContent(
      "Liga",
    );
    await expect(canvasElement.querySelector("[data-match-type='playoffMatch']")).toHaveTextContent(
      "Playoff",
    );
    await expect(canvasElement.querySelector("[data-match-outcome='win']")).toBeTruthy();
    await expect(canvasElement.querySelector("[data-match-outcome='loss']")).toBeTruthy();
    await expect(canvas.getByRole("radio", { name: "Todos" })).toBeVisible();
    await expect(canvas.getByRole("radio", { name: "Liga" })).toBeVisible();
    await expect(canvas.getByRole("radio", { name: "Playoff" })).toBeVisible();
    await expect(canvas.getByRole("radio", { name: "Amistosos" })).toBeVisible();
    await expect(canvas.getByLabelText("Orden de partidos")).toBeVisible();
    await expect(canvas.getByText("3 partidos")).toBeVisible();
    await expect(canvas.queryByText("Oficial")).toBeNull();
  },
};

export const AllMatches: Story = {
  name: "All matches",
  args: { scenario: "allMatches", view: "all" },
  render: (args) => <PlayerMatchesStoryShell key={`${args.scenario}-${args.view}`} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Atlético Norte")).toBeVisible();
    await expect(
      canvasElement.querySelector("[data-match-type='friendlyMatch']"),
    ).toHaveTextContent("Amistoso");
    await expect(canvas.getByText("Hoy")).toBeVisible();
    await expect(canvas.getByText("1 de agosto del 2026")).toBeVisible();
    await expect(canvas.getByRole("radio", { name: "Todos" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  },
};

export const League: Story = {
  name: "League",
  args: { scenario: "ready", view: "league" },
  render: (args) => <PlayerMatchesStoryShell key={`${args.scenario}-${args.view}`} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Fera Enjaulada")).toBeVisible();
    await expect(canvas.getByRole("radio", { name: "Liga" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(canvas.queryByText("Cuervos FC")).toBeNull();
    await expect(canvas.queryByText("Atlético Norte")).toBeNull();
    await expect(canvas.queryByLabelText("Forma reciente")).toBeNull();
    await expect(canvasElement.querySelector("[data-match-type]")).toBeNull();
  },
};

export const Playoff: Story = {
  name: "Playoff",
  args: { scenario: "ready", view: "playoff" },
  render: (args) => <PlayerMatchesStoryShell key={`${args.scenario}-${args.view}`} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Cuervos FC")).toBeVisible();
    await expect(canvas.getByRole("radio", { name: "Playoff" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(canvas.queryByText("Atlético Norte")).toBeNull();
  },
};

export const Friendlies: Story = {
  name: "Friendlies",
  args: { scenario: "ready", view: "friendly" },
  render: (args) => <PlayerMatchesStoryShell key={`${args.scenario}-${args.view}`} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Atlético Norte")).toBeVisible();
    await expect(canvas.getByRole("radio", { name: "Amistosos" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(canvas.queryByText("Cuervos FC")).toBeNull();
  },
};

export const Loading: Story = {
  name: "Loading",
  args: { scenario: "loading" },
  render: (args) => <PlayerMatchesStoryShell key={`${args.scenario}-${args.view}`} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Cargando tus partidos…")).toBeVisible();
    await expect(canvas.queryByText("Cargando partidos oficiales…")).toBeNull();
  },
};

export const NeedsClub: Story = {
  name: "Needs club",
  args: { scenario: "needsClub" },
  render: (args) => <PlayerMatchesStoryShell key={`${args.scenario}-${args.view}`} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText("Asocia un club para ver partidos recientes"),
    ).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Añadir club" })).toBeVisible();
    await expect(canvas.queryByText("Aún no hay partidos oficiales")).toBeNull();
  },
};

export const NeedsClubDialog: Story = {
  name: "Needs club / Add club dialog",
  args: { scenario: "needsClub" },
  render: (args) => <PlayerMatchesStoryShell key={`${args.scenario}-${args.view}`} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Añadir club" }));
    await waitFor(async () => {
      await expect(
        within(document.body).getByRole("heading", { name: "Añadir club" }),
      ).toBeVisible();
    });
  },
};

export const NeedsGameAccount: Story = {
  name: "Needs game account",
  args: { scenario: "needsGameAccount" },
  render: (args) => <PlayerMatchesStoryShell key={`${args.scenario}-${args.view}`} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Añade una cuenta de juego")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Revisar datos de juego" })).toHaveAttribute(
      "href",
      "/player/game-accounts",
    );
  },
};

export const RecentEmpty: Story = {
  name: "Recent empty",
  args: { scenario: "recentEmpty" },
  render: (args) => <PlayerMatchesStoryShell key={`${args.scenario}-${args.view}`} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("No hay partidos")).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Revisar datos de juego" })).toBeNull();
  },
};

export const OlderMatch: Story = {
  name: "Older match",
  args: { scenario: "olderMatch", view: "all" },
  render: (args) => <PlayerMatchesStoryShell key={`${args.scenario}-${args.view}`} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Atlético Norte")).toBeVisible();
    await expect(canvas.getByText("1 partido")).toBeVisible();
  },
};

export const ErrorState: Story = {
  name: "Error",
  args: { scenario: "error" },
  render: (args) => <PlayerMatchesStoryShell key={`${args.scenario}-${args.view}`} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("No pudimos cargar tus partidos.")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Reintentar" })).toBeVisible();
    await expect(canvas.queryByText("Ganados")).toBeNull();
  },
};

export const Mobile: Story = {
  name: "Mobile",
  args: { scenario: "ready" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: (args) => <PlayerMatchesStoryShell key={`${args.scenario}-${args.view}`} {...args} />,
};
