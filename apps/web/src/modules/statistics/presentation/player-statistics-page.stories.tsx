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
import { expect, userEvent, within } from "storybook/test";
import * as stylex from "@stylexjs/stylex";
import { applyProps, typography } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import {
  gameProfileEmptyEvolutionFixture,
  gameProfileEmptySampleFixture,
  gameProfilePartialFixture,
  gameProfileReadyFixture,
} from "./player-statistics-page.fixtures.ts";
import { PlayerStatisticsPage } from "./player-statistics-page.tsx";
import {
  configurePlayerStatisticsStory,
  type PlayerStatisticsStoryState,
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

const SCENARIO_IDS = [
  "ready",
  "loading",
  "error",
  "needsClub",
  "needsGameAccount",
  "empty",
  "partial",
  "emptyEvolution",
] as const;

type ScenarioId = (typeof SCENARIO_IDS)[number];

type StoryArgs = {
  readonly scenario: ScenarioId;
};

function scenarioState(id: ScenarioId): PlayerStatisticsStoryState {
  switch (id) {
    case "ready":
      return { profile: { status: "ready", profile: gameProfileReadyFixture() } };
    case "loading":
      return { profile: "pending" };
    case "error":
      return { profile: "error" };
    case "needsClub":
      return { profile: { status: "needs_club" } };
    case "needsGameAccount":
      return { profile: { status: "needs_game_account" } };
    case "empty":
      return { profile: { status: "ready", profile: gameProfileEmptySampleFixture() } };
    case "partial":
      return { profile: { status: "ready", profile: gameProfilePartialFixture() } };
    case "emptyEvolution":
      return { profile: { status: "ready", profile: gameProfileEmptyEvolutionFixture() } };
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

function hydratePlayerStatisticsQueries(
  client: QueryClient,
  state: PlayerStatisticsStoryState,
): void {
  if (state.profile !== "pending" && state.profile !== "error") {
    client.setQueryData(queryKeys.gameData.meGameProfile(), state.profile);
  }
}

function StoryStub({ label }: { readonly label: string }) {
  return <p {...applyProps(undefined, undefined, typography.body, styles.stub)}>{label}</p>;
}

function PlayerStatisticsStoryShell({ scenario }: { readonly scenario: ScenarioId }) {
  const client = useMemo(() => {
    const next = scenarioState(scenario);
    configurePlayerStatisticsStory(next);
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity, gcTime: Infinity },
        mutations: { retry: false },
      },
    });
    hydratePlayerStatisticsQueries(queryClient, next);
    return queryClient;
  }, [scenario]);

  const router = useMemo(() => {
    const rootRoute = createRootRoute({
      component: Outlet,
    });
    const statisticsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/player/statistics",
      component: PlayerStatisticsPage,
    });
    const workspaceRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/player",
      component: () => <StoryStub label="Espacio personal (stub de Storybook)" />,
    });
    const clubsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/player/ea-clubs",
      component: () => <StoryStub label="Clubs EA (stub de Storybook)" />,
    });
    const gameAccountsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/player/game-accounts",
      component: () => <StoryStub label="Datos de juego (stub de Storybook)" />,
    });
    const matchesRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/player/matches",
      component: () => <StoryStub label="Mis partidos (stub de Storybook)" />,
    });
    return createRouter({
      routeTree: rootRoute.addChildren([
        statisticsRoute,
        workspaceRoute,
        clubsRoute,
        gameAccountsRoute,
        matchesRoute,
      ]),
      history: createMemoryHistory({ initialEntries: ["/player/statistics"] }),
    });
  }, [scenario]);

  return (
    <QueryClientProvider client={client}>
      <I18nProvider initialLocale="es" persistLocale={async () => undefined}>
        <div {...applyProps(undefined, undefined, styles.frame)}>
          <RouterProvider router={router} />
        </div>
      </I18nProvider>
    </QueryClientProvider>
  );
}

const meta = {
  title: "Product/Player/Statistics",
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
  render: (args) => <PlayerStatisticsStoryShell key={args.scenario} {...args} />,
};

export const Ready: Story = {
  name: "Ready",
  args: { scenario: "ready" },
  render: (args) => <PlayerStatisticsStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("heading", { name: "davos282" })).toBeVisible();
    await expect(canvas.getByText("Delantero · 28 partidos jugados")).toBeVisible();
    await expect(canvas.getByText("1512")).toBeVisible();
    await expect(canvas.getByText("16–4–8")).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "Perfil por categorías" })).toBeVisible();
    await expect(canvas.getByText("Ataque")).toBeVisible();
    await expect(canvas.getByText("Pase")).toBeVisible();
    await expect(canvas.getByText("Defensa")).toBeVisible();
    await expect(canvas.getByText("Impacto")).toBeVisible();
    await expect(canvas.getByText("Disciplina")).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "Evolución" })).toBeVisible();
    await expect(canvas.getByRole("tab", { name: "Generales" })).toBeVisible();
    await expect(canvas.getByRole("tab", { name: "Por equipo" })).toBeVisible();
    await expect(canvas.getByRole("tab", { name: "Por posición" })).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Volver al espacio personal" })).toHaveAttribute(
      "href",
      "/player",
    );
    await expect(canvas.queryByText("Datos parciales")).toBeNull();
  },
};

export const PartialData: Story = {
  name: "Partial data",
  args: { scenario: "partial" },
  render: (args) => <PlayerStatisticsStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("heading", { name: "davos282" })).toBeVisible();
    await expect(canvas.getAllByText("Sin datos").length).toBeGreaterThan(0);
    await expect(
      canvas.getByText(
        "Algunas métricas no estuvieron disponibles en todos los partidos y se marcan en la tabla.",
      ),
    ).toBeVisible();
    await expect(canvas.getAllByText("Datos parciales").length).toBeGreaterThan(0);
  },
};

export const EmptyEvolution: Story = {
  name: "Empty evolution",
  args: { scenario: "emptyEvolution" },
  render: (args) => <PlayerStatisticsStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("heading", { name: "davos282" })).toBeVisible();
    await expect(canvas.getByText("Juega más partidos para ver tu evolución.")).toBeVisible();
  },
};

export const Loading: Story = {
  name: "Loading",
  args: { scenario: "loading" },
  render: (args) => <PlayerStatisticsStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Cargando tu perfil…")).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "Tu perfil" })).toBeVisible();
    await expect(canvas.queryByText("1512")).toBeNull();
  },
};

export const NeedsClub: Story = {
  name: "Needs club",
  args: { scenario: "needsClub" },
  render: (args) => <PlayerStatisticsStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText("Asocia un club para reconocer tus partidos"),
    ).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Añadir club" })).toHaveAttribute(
      "href",
      "/player/ea-clubs",
    );
  },
};

export const NeedsGameAccount: Story = {
  name: "Needs game account",
  args: { scenario: "needsGameAccount" },
  render: (args) => <PlayerStatisticsStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Registra tu identificador de juego")).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Revisar datos de juego" })).toHaveAttribute(
      "href",
      "/player/game-accounts",
    );
  },
};

export const Empty: Story = {
  name: "Empty",
  args: { scenario: "empty" },
  render: (args) => <PlayerStatisticsStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Aún no hay apariciones tuyas")).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Mis partidos" })).toHaveAttribute(
      "href",
      "/player/matches",
    );
  },
};

export const ErrorState: Story = {
  name: "Error",
  args: { scenario: "error" },
  render: (args) => <PlayerStatisticsStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("No pudimos cargar tu perfil.")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Reintentar" })).toBeVisible();
    await expect(canvas.queryByText("1512")).toBeNull();
  },
};

export const ByTeam: Story = {
  name: "By team",
  args: { scenario: "ready" },
  render: (args) => <PlayerStatisticsStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("heading", { name: "davos282" })).toBeVisible();
    await userEvent.click(canvas.getByRole("tab", { name: "Por equipo" }));
    await expect(canvas.getByRole("columnheader", { name: "Equipo" })).toBeVisible();
    await expect(canvas.getAllByText("Cuervos FC1")[0]).toBeVisible();
    await expect(canvas.getAllByText("White Lions")[0]).toBeVisible();
  },
};

export const Mobile: Story = {
  name: "Mobile",
  args: { scenario: "ready" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: (args) => <PlayerStatisticsStoryShell key={args.scenario} {...args} />,
};
