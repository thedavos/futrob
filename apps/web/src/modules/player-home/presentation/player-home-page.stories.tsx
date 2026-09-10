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
import type { GetMyGameProfileResponse, GetMyRecentMatchesResponse } from "@futrob/api-contracts";
import { expect, within } from "storybook/test";
import * as stylex from "@stylexjs/stylex";
import { applyProps } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { configureCompetitionsStory } from "@/modules/competitions/presentation/competitions-story-client.ts";
import {
  configurePlayerMatchesStory,
  configurePlayerStatisticsStory,
} from "@/modules/statistics/presentation/player-matches-story-client.ts";
import { configurePlayerStory } from "@/modules/teams/presentation/player-story-client.ts";
import { playerTeamsFixture } from "@/modules/teams/presentation/player-story-fixtures.ts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import {
  competitionsMineFixture,
  gameProfileHomeFixture,
  invitationsEmptyFixture,
  invitationsPendingFixture,
  nextEncounterResponseFixture,
  PLAYER_HOME_CLUB_ID,
  playerHomeProfileFixture,
  recentMatchesNoneFixture,
  recentMatchesSomeFixture,
} from "./player-home-page.fixtures.ts";
import { PlayerHomePage } from "./player-home-page.tsx";

const styles = stylex.create({
  frame: {
    minHeight: "100svh",
    backgroundColor: colors.background,
    paddingInline: "1.5rem",
    paddingBlock: "1.5rem",
  },
});

const SCENARIO_IDS = [
  "matrix01",
  "matrix02",
  "matrix03",
  "matrix04",
  "matrix05",
  "matrix06",
  "matrix07",
  "matrix08",
  "matrix09",
  "matrix10",
  "matrix11",
  "matrix12",
  "empty",
  "selectClub",
  "loadingWithClub",
  "loadingNoClub",
  "partialLoading",
  "refreshing",
  "errorNoData",
  "errorWithCachedData",
  "nextEncounterMissing",
] as const;

type ScenarioId = (typeof SCENARIO_IDS)[number];

type StoryArgs = {
  readonly scenario: ScenarioId;
};

type QueryOverlay = "refreshing" | "error-cached" | null;

type HomeStoryState = {
  readonly profile: ReturnType<typeof playerHomeProfileFixture> | "pending" | "error";
  readonly nextEncounter: ReturnType<typeof nextEncounterResponseFixture> | "pending" | "error";
  readonly rosterInvitations: ReturnType<typeof invitationsPendingFixture> | "pending" | "error";
  readonly recent: GetMyRecentMatchesResponse | "pending" | "error";
  readonly gameProfile: GetMyGameProfileResponse | "pending" | "error";
  readonly competitions: ReturnType<typeof competitionsMineFixture> | "pending" | "error";
  readonly externalClubId?: string;
  readonly overlay: QueryOverlay;
};

function completeDashboard(overrides: Partial<HomeStoryState> = {}): HomeStoryState {
  return {
    profile: playerHomeProfileFixture({ linked: true, club: true }),
    nextEncounter: nextEncounterResponseFixture(),
    rosterInvitations: invitationsPendingFixture(),
    recent: recentMatchesSomeFixture(),
    gameProfile: gameProfileHomeFixture(),
    competitions: competitionsMineFixture(),
    externalClubId: PLAYER_HOME_CLUB_ID,
    overlay: null,
    ...overrides,
  };
}

function scenarioState(id: ScenarioId): HomeStoryState {
  switch (id) {
    case "matrix01":
      return completeDashboard();
    case "matrix02":
      return completeDashboard({ rosterInvitations: invitationsEmptyFixture() });
    case "matrix03":
      return completeDashboard({
        competitions: competitionsMineFixture([]),
        nextEncounter: nextEncounterResponseFixture(null),
      });
    case "matrix04":
      return completeDashboard({
        competitions: competitionsMineFixture([]),
        nextEncounter: nextEncounterResponseFixture(null),
        rosterInvitations: invitationsEmptyFixture(),
      });
    case "matrix05":
      return completeDashboard({ recent: recentMatchesNoneFixture() });
    case "matrix06":
      return completeDashboard({
        recent: recentMatchesNoneFixture(),
        rosterInvitations: invitationsEmptyFixture(),
      });
    case "matrix07":
      return completeDashboard({
        recent: recentMatchesNoneFixture(),
        competitions: competitionsMineFixture([]),
        nextEncounter: nextEncounterResponseFixture(null),
      });
    case "matrix08":
      return completeDashboard({
        recent: recentMatchesNoneFixture(),
        competitions: competitionsMineFixture([]),
        nextEncounter: nextEncounterResponseFixture(null),
        rosterInvitations: invitationsEmptyFixture(),
      });
    case "matrix09":
      return completeDashboard({
        profile: playerHomeProfileFixture({ linked: false, club: true }),
        recent: { status: "needs_game_account" },
        gameProfile: { status: "needs_game_account" },
      });
    case "matrix10":
      return completeDashboard({
        profile: playerHomeProfileFixture({ linked: false, club: true }),
        recent: { status: "needs_game_account" },
        gameProfile: { status: "needs_game_account" },
        rosterInvitations: invitationsEmptyFixture(),
      });
    case "matrix11":
      return completeDashboard({
        profile: playerHomeProfileFixture({ linked: false, club: true }),
        recent: { status: "needs_game_account" },
        gameProfile: { status: "needs_game_account" },
        competitions: competitionsMineFixture([]),
        nextEncounter: nextEncounterResponseFixture(null),
      });
    case "matrix12":
      return completeDashboard({
        profile: playerHomeProfileFixture({ linked: false, club: true }),
        recent: { status: "needs_game_account" },
        gameProfile: { status: "needs_game_account" },
        competitions: competitionsMineFixture([]),
        nextEncounter: nextEncounterResponseFixture(null),
        rosterInvitations: invitationsEmptyFixture(),
      });
    case "empty":
      return {
        profile: playerHomeProfileFixture({ linked: false, club: false }),
        nextEncounter: nextEncounterResponseFixture(null),
        rosterInvitations: invitationsEmptyFixture(),
        recent: { status: "needs_club" },
        gameProfile: { status: "needs_club" },
        competitions: competitionsMineFixture([]),
        overlay: null,
      };
    case "selectClub":
      return {
        profile: playerHomeProfileFixture({ linked: true, club: false }),
        nextEncounter: nextEncounterResponseFixture(null),
        rosterInvitations: invitationsEmptyFixture(),
        recent: recentMatchesNoneFixture(),
        gameProfile: gameProfileHomeFixture(),
        competitions: competitionsMineFixture(),
        overlay: null,
      };
    case "loadingWithClub":
      return completeDashboard({ profile: "pending" });
    case "loadingNoClub":
      return {
        ...completeDashboard({ profile: "pending" }),
        externalClubId: undefined,
      };
    case "partialLoading":
      return completeDashboard({ recent: "pending", gameProfile: "pending" });
    case "refreshing":
      return completeDashboard({ overlay: "refreshing" });
    case "errorNoData":
      return completeDashboard({
        profile: "error",
        nextEncounter: "error",
        rosterInvitations: "error",
        recent: "error",
        gameProfile: "error",
        competitions: "error",
      });
    case "errorWithCachedData":
      return completeDashboard({ overlay: "error-cached" });
    case "nextEncounterMissing":
      return completeDashboard({ nextEncounter: nextEncounterResponseFixture(null) });
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

function hydrateHomeQueries(client: QueryClient, state: HomeStoryState): void {
  if (state.profile !== "pending" && state.profile !== "error") {
    client.setQueryData(queryKeys.players.me(), state.profile);
  }
  if (state.nextEncounter !== "pending" && state.nextEncounter !== "error") {
    client.setQueryData(queryKeys.players.meNextEncounter(), state.nextEncounter);
  }
  if (state.rosterInvitations !== "pending" && state.rosterInvitations !== "error") {
    client.setQueryData(queryKeys.players.meRosterInvitations(), state.rosterInvitations);
  }
  if (state.recent !== "pending" && state.recent !== "error") {
    client.setQueryData(queryKeys.gameData.meRecentMatches(state.externalClubId), state.recent);
  }
  if (state.gameProfile !== "pending" && state.gameProfile !== "error") {
    client.setQueryData(
      queryKeys.gameData.meGameProfile(
        state.externalClubId ? { externalClubId: state.externalClubId } : {},
      ),
      state.gameProfile,
    );
  }
  if (state.competitions !== "pending" && state.competitions !== "error") {
    client.setQueryData(queryKeys.competitions.mine(), state.competitions);
  }

  const recentKey = queryKeys.gameData.meRecentMatches(state.externalClubId);
  if (state.overlay === "refreshing") {
    client.getQueryCache().find({ queryKey: recentKey })?.setState({ fetchStatus: "fetching" });
  }
  if (state.overlay === "error-cached") {
    client
      .getQueryCache()
      .find({ queryKey: recentKey })
      ?.setState({
        status: "error",
        error: new Error("unavailable"),
        fetchStatus: "idle",
      });
  }
}

function PlayerHomeStoryShell({ scenario }: { readonly scenario: ScenarioId }) {
  const state = useMemo(() => scenarioState(scenario), [scenario]);
  const client = useMemo(() => {
    configurePlayerStory({
      profile: state.profile,
      teams: playerTeamsFixture({ teams: [], activeRosterMembershipId: null }),
      rosterInvitations:
        state.rosterInvitations === "pending" || state.rosterInvitations === "error"
          ? state.rosterInvitations
          : state.rosterInvitations,
      nextEncounter: state.nextEncounter,
      addGameAccount: "success",
      setActiveTeam: "success",
      acceptRosterInvitation: "success",
      respondToRosterInvitation: "success",
    });
    configurePlayerMatchesStory({ recent: state.recent });
    configurePlayerStatisticsStory({ profile: state.gameProfile });
    configureCompetitionsStory({ competitions: state.competitions });
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity, gcTime: Infinity },
        mutations: { retry: false },
      },
    });
    hydrateHomeQueries(queryClient, state);
    return queryClient;
  }, [state]);

  const router = useMemo(() => {
    const rootRoute = createRootRoute({ component: Outlet });
    const playerRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/player",
      component: () => <PlayerHomePage externalClubId={state.externalClubId} profileReady />,
    });
    const stub = (path: string) =>
      createRoute({
        getParentRoute: () => rootRoute,
        path,
        component: () => null,
      });
    return createRouter({
      routeTree: rootRoute.addChildren([
        playerRoute,
        stub("/player/matches"),
        stub("/player/competitions"),
        stub("/player/game-accounts"),
        stub("/player/ea-clubs"),
        stub("/invitations"),
      ]),
      history: createMemoryHistory({ initialEntries: ["/player"] }),
    });
  }, [state.externalClubId]);

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
  title: "Product/Player/Home",
  parameters: { layout: "fullscreen" },
  args: { scenario: "matrix01" },
  argTypes: {
    scenario: { control: "select", options: [...SCENARIO_IDS] },
  },
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

function story(name: string, scenario: ScenarioId, play?: Story["play"]): Story {
  return {
    name,
    args: { scenario },
    render: (args) => <PlayerHomeStoryShell key={args.scenario} scenario={args.scenario} />,
    play,
  };
}

async function expectText(canvasElement: HTMLElement, text: string | RegExp) {
  const canvas = within(canvasElement);
  const matches = await canvas.findAllByText(text);
  await expect(matches[0]).toBeVisible();
}

export const Playground = story("Playground", "matrix01");

export const DatosCompletos = story("Datos completos", "matrix01", async ({ canvasElement }) => {
  await expectText(canvasElement, "Tu próximo enfrentamiento");
  await expectText(canvasElement, /Liga Futrob · Jornada 4/);
  await expectText(canvasElement, "1 invitación por responder");
  await expectText(canvasElement, "davos282");
  await expectText(canvasElement, "davos282 MVP");
});

export const SinInvitaciones = story("Sin invitaciones", "matrix02", async ({ canvasElement }) => {
  await expectText(canvasElement, "Sin invitaciones pendientes");
  await expectText(canvasElement, "Ver historial");
});

export const PartidosEInvitaciones = story(
  "Partidos e invitaciones",
  "matrix03",
  async ({ canvasElement }) => {
    await expectText(canvasElement, "Da el salto a la competición");
    await expectText(canvasElement, "1 invitación por responder");
  },
);

export const SoloActividad = story(
  "Solo actividad de juego",
  "matrix04",
  async ({ canvasElement }) => {
    await expectText(canvasElement, "Da el salto a la competición");
    await expectText(canvasElement, "Sin competiciones por ahora");
  },
);

export const CompsInvitacionesSinApariciones = story(
  "Competiciones e invitaciones, sin apariciones",
  "matrix05",
  async ({ canvasElement }) => {
    await expectText(canvasElement, "Actualizar partidos");
    await expectText(canvasElement, "Todavía no hay partidos registrados");
  },
);

export const CompsSinApariciones = story(
  "Competiciones, sin apariciones",
  "matrix06",
  async ({ canvasElement }) => {
    await expectText(
      canvasElement,
      "Tus estadísticas aparecerán cuando tengas partidos registrados.",
    );
  },
);

export const VinculadoConInvitaciones = story(
  "Vinculado, con invitaciones",
  "matrix07",
  async ({ canvasElement }) => {
    await expectText(canvasElement, "Da el salto a la competición");
    await expectText(canvasElement, "1 invitación por responder");
  },
);

export const VinculadoEsperando = story(
  "Vinculado, esperando actividad",
  "matrix08",
  async ({ canvasElement }) => {
    await expectText(canvasElement, "Sin invitaciones pendientes");
    await expectText(canvasElement, "Sin competiciones por ahora");
  },
);

export const ActividadPendiente = story(
  "Actividad de Futrob, pendiente de vinculación",
  "matrix09",
  async ({ canvasElement }) => {
    await expectText(canvasElement, "Registrar identificador");
    await expectText(canvasElement, "Rendimiento personal no disponible");
    await expectText(canvasElement, "Ver mis competiciones");
  },
);

export const CompsPendiente = story(
  "Competiciones, pendiente de vinculación",
  "matrix10",
  async ({ canvasElement }) => {
    await expectText(canvasElement, "Aún no podemos identificar tu actuación en los partidos.");
  },
);

export const InvitacionesParaEmpezar = story(
  "Invitaciones para empezar",
  "matrix11",
  async ({ canvasElement }) => {
    await expectText(canvasElement, "Da el salto a la competición");
    await expectText(canvasElement, "1 invitación por responder");
  },
);

export const VacioInicial = story("Vacío inicial", "matrix12", async ({ canvasElement }) => {
  await expectText(canvasElement, "Da el salto a la competición");
  await expectText(canvasElement, "Sin invitaciones pendientes");
  await expectText(canvasElement, "Registrar identificador");
});

export const Empty = story("Empty", "empty", async ({ canvasElement }) => {
  await expectText(canvasElement, "Empieza con tus datos de juego");
  await expectText(canvasElement, "Registrar identificador");
});

export const SelectClub = story("Select club", "selectClub", async ({ canvasElement }) => {
  await expectText(canvasElement, "Selecciona un club");
  await expectText(canvasElement, "Seleccionar club");
});

export const LoadingWithClub = story("Loading with club", "loadingWithClub");

export const LoadingNoClub = story("Loading without club", "loadingNoClub");

export const PartialLoading = story(
  "Partial loading",
  "partialLoading",
  async ({ canvasElement }) => {
    await expectText(canvasElement, "Tu próximo enfrentamiento");
  },
);

export const Refreshing = story("Refreshing", "refreshing", async ({ canvasElement }) => {
  await expectText(canvasElement, /Actualizado/);
});

export const ErrorNoData = story("Error without data", "errorNoData", async ({ canvasElement }) => {
  await expectText(canvasElement, "No se pudo cargar");
});

export const ErrorWithCachedData = story(
  "Error with cached data",
  "errorWithCachedData",
  async ({ canvasElement }) => {
    await expectText(canvasElement, "davos282 MVP");
    await expectText(canvasElement, /Actualizado/);
  },
);

export const NextEncounterMissing = story(
  "Next encounter missing",
  "nextEncounterMissing",
  async ({ canvasElement }) => {
    await expectText(canvasElement, "Sin enfrentamientos programados");
    await expectText(canvasElement, "Ver mis competiciones");
  },
);

export const Mobile: Story = {
  name: "Mobile",
  args: { scenario: "matrix01" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: (args) => <PlayerHomeStoryShell key={args.scenario} scenario={args.scenario} />,
};
