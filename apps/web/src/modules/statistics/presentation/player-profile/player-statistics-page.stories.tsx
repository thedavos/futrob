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
  configurePlayerStatisticsStory,
  type PlayerStatisticsStoryState,
} from "../player-matches-story-client.ts";
import {
  PLAYER_STATISTICS_RANGE,
  gameProfileEmptyEvolutionFixture,
  gameProfileEmptySampleFixture,
  gameProfilePartialFixture,
  gameProfileReadyFixture,
  gameProfileUnavailableRatingFixture,
} from "./player-statistics-page.fixtures.ts";
import { gameProfileQueryFromRange } from "./player-statistics-period.ts";
import { PlayerStatisticsPage } from "./player-statistics-page.tsx";

function ignorePeriodChange(): void {}

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
  "unavailableRating",
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
    case "unavailableRating":
      return { profile: { status: "ready", profile: gameProfileUnavailableRatingFixture() } };
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
    const query = gameProfileQueryFromRange({
      externalClubId: "10754",
      range: PLAYER_STATISTICS_RANGE,
    });
    client.setQueryData(queryKeys.gameData.meGameProfile(query), state.profile);
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
      component: () => (
        <PlayerStatisticsPage
          externalClubId="10754"
          onPeriodChange={ignorePeriodChange}
          period={PLAYER_STATISTICS_RANGE}
        />
      ),
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
    await expect(await canvas.findByRole("heading", { name: "Mis estadísticas" })).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "davos282" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Rango de fechas" })).toBeVisible();
    await expect(canvas.getByText("Delantero · Cuervos FC1 · 28 partidos jugados")).toBeVisible();
    expect(
      [
        ...canvas
          .getByRole("region", { name: "Resumen" })
          .querySelectorAll("[data-slot='stat-label']"),
      ].map((label) => label.textContent),
    ).toEqual(["V–E–D", "Rating", "Goles", "Asistencias"]);
    await expect(canvas.getByText("16–4–8")).toBeVisible();
    await expect(canvas.getByText(/de victorias/)).toBeVisible();
    await expect(canvas.getByText("11")).toBeVisible();
    await expect(canvas.getByText("0,39 por partido")).toBeVisible();
    await expect(await canvas.findByRole("heading", { name: "Récord" })).toBeVisible();
    await expect(canvas.getByText("1 sin resultado")).toBeVisible();
    await expect(canvas.getAllByText("Sin resultado")[0]).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "Atributos" })).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "Rating por partido" })).toBeVisible();
    await expect(canvas.queryByRole("tab")).toBeNull();
    await expect(canvas.getByText("16 victorias")).toBeVisible();
    await expect(canvas.getByText("4 empates")).toBeVisible();
    await expect(canvas.getByText("8 derrotas")).toBeVisible();
    await expect(canvas.getByText("Últimos 5 partidos")).toBeVisible();
    await expect(canvas.queryByRole("heading", { name: "Desglose" })).toBeNull();
    await expect(canvas.queryByRole("link", { name: "Volver al espacio personal" })).toBeNull();
    await expect(canvas.queryByText("Datos parciales")).toBeNull();
  },
};

export const CategoryDetail: Story = {
  name: "Category detail",
  args: { scenario: "ready" },
  render: (args) => <PlayerStatisticsStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("heading", { name: "Atributos" })).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "Disciplina · 88" })).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Pase 68" }));
    await expect(canvas.getByRole("heading", { name: "Pase · 68" })).toBeVisible();
    await expect(canvas.getByText("Éxito de pase")).toBeVisible();
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
      canvas.getByText("Algunas métricas no estuvieron disponibles en todos los partidos."),
    ).toBeVisible();
    await expect(canvas.queryByRole("heading", { name: "Desglose" })).toBeNull();
  },
};

export const EmptyEvolution: Story = {
  name: "Empty evolution",
  args: { scenario: "emptyEvolution" },
  render: (args) => <PlayerStatisticsStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("heading", { name: "davos282" })).toBeVisible();
    await expect(
      await canvas.findByText("Aún no hay partidos para trazar tu rating."),
    ).toBeVisible();
  },
};

export const UnavailableRating: Story = {
  name: "Unavailable rating",
  args: { scenario: "unavailableRating" },
  render: (args) => <PlayerStatisticsStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("heading", { name: "davos282" })).toBeVisible();
    await expect(await canvas.findByText("Estos partidos no incluyen rating.")).toBeVisible();
    await expect(canvas.queryByRole("tab")).toBeNull();
  },
};

export const Loading: Story = {
  name: "Loading",
  args: { scenario: "loading" },
  render: (args) => <PlayerStatisticsStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Cargando tus estadísticas…")).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "Mis estadísticas" })).toBeVisible();
    await expect(canvas.queryByText("11")).toBeNull();
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
    await expect(
      canvas.getByText(
        "Solo vemos los últimos 50 partidos que EA tiene ahora. Si no hay apariciones en el rango, prueba otras fechas.",
      ),
    ).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Rango de fechas" })).toBeVisible();
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
    await expect(await canvas.findByText("No pudimos cargar tus estadísticas.")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Reintentar" })).toBeVisible();
    await expect(canvas.queryByText("11")).toBeNull();
  },
};

export const Mobile: Story = {
  name: "Mobile",
  args: { scenario: "ready" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: (args) => <PlayerStatisticsStoryShell key={args.scenario} {...args} />,
};
