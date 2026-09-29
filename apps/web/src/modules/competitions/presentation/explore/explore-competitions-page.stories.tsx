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
  useNavigate,
} from "@tanstack/react-router";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import * as stylex from "@stylexjs/stylex";
import { applyProps } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { configureCompetitionsStory } from "@/modules/competitions/presentation/competitions-story-client.ts";
import { configureOrganizationsStory } from "@/modules/organizations/presentation/organizations-story-client.ts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { ExploreCompetitionDetailPage } from "./explore-competition-detail-page.tsx";
import { PlayerCompetitionsExplorePage } from "./explore-competitions-page.tsx";
import {
  exploreAccessibleFixture,
  exploreCompetitionFixture,
  exploreMembershipsFixture,
  explorePageFixture,
} from "./explore-competitions.fixtures.ts";
import { exploreCompetitionsSearchSchema, toExploreSearchParams } from "./explore-search.ts";

const styles = stylex.create({
  frame: {
    display: "flex",
    minHeight: "100svh",
    flexDirection: "column",
    backgroundColor: colors.background,
    paddingInline: "1.5rem",
    paddingBlock: "1.5rem",
  },
});

const SCENARIO_IDS = [
  "ready",
  "loading",
  "filteredEmpty",
  "noCompetitions",
  "error",
  "manager",
  "participant",
  "moreResults",
  "longNames",
] as const;

type ScenarioId = (typeof SCENARIO_IDS)[number];

type StoryArgs = {
  readonly scenario: ScenarioId;
  readonly initialPath: string;
};

function configureScenario(id: ScenarioId): void {
  configureOrganizationsStory({ memberships: { memberships: [] } });
  configureCompetitionsStory({
    competitions: { competitions: [] },
    explore: explorePageFixture(),
    exploreNext: null,
  });
  switch (id) {
    case "ready":
      return;
    case "loading":
      configureCompetitionsStory({ explore: "pending" });
      return;
    case "filteredEmpty":
    case "noCompetitions":
      configureCompetitionsStory({ explore: explorePageFixture([]) });
      return;
    case "error":
      configureCompetitionsStory({ explore: "error" });
      return;
    case "manager":
      configureOrganizationsStory({ memberships: exploreMembershipsFixture("organizer") });
      return;
    case "participant":
      configureCompetitionsStory({ competitions: exploreAccessibleFixture() });
      return;
    case "moreResults":
      configureCompetitionsStory({
        explore: {
          items: [exploreCompetitionFixture()],
          total: 2,
          nextCursor: "page-2",
        },
        exploreNext: {
          items: [
            exploreCompetitionFixture({
              competition: { id: "competition-segunda", name: "Liga Segunda" },
              organization: { id: "org-segunda", name: "Club Segunda" },
            }),
          ],
          total: 2,
          nextCursor: null,
        },
      });
      return;
    case "longNames":
      configureCompetitionsStory({
        explore: explorePageFixture([
          exploreCompetitionFixture({
            competition: {
              name: "Campeonato Internacional de Clubes Nocturnos de América del Sur y Europa",
            },
            organization: {
              name: "Asociación Continental de Organizadores de Ligas Virtuales",
            },
          }),
        ]),
      });
      return;
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

function ExploreStoryShell({
  initialPath,
  scenario,
}: {
  readonly initialPath: string;
  readonly scenario: ScenarioId;
}) {
  const client = useMemo(() => {
    configureScenario(scenario);
    return new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity, gcTime: Infinity },
        mutations: { retry: false },
      },
    });
  }, [scenario]);

  const router = useMemo(() => {
    const rootRoute = createRootRoute({ component: Outlet });
    const exploreRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/player/competitions/explore",
      validateSearch: exploreCompetitionsSearchSchema,
      component: function ExploreRoutePage() {
        const navigate = useNavigate({ from: exploreRoute.fullPath });
        const search = toExploreSearchParams(exploreRoute.useSearch());
        return (
          <PlayerCompetitionsExplorePage
            onSearchChange={(next) => {
              void navigate({ search: next, replace: true });
            }}
            search={search}
          />
        );
      },
    });
    const detailRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/player/competitions/$competitionId",
      component: function DetailRoutePage() {
        const { competitionId } = detailRoute.useParams();
        return <ExploreCompetitionDetailPage competitionId={competitionId} />;
      },
    });
    const competitionsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/player/competitions",
      component: () => <p>Mis competiciones</p>,
    });
    const manageRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId/competitions/$competitionId",
      component: () => <p>Gestionar competición</p>,
    });
    return createRouter({
      routeTree: rootRoute.addChildren([exploreRoute, detailRoute, competitionsRoute, manageRoute]),
      history: createMemoryHistory({ initialEntries: [initialPath] }),
    });
  }, [initialPath]);

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
  title: "Product/Player/Competitions/Explore",
  parameters: { layout: "fullscreen" },
  args: {
    scenario: "ready",
    initialPath: "/player/competitions/explore",
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

function renderExplore(args: StoryArgs) {
  return (
    <ExploreStoryShell
      initialPath={args.initialPath}
      key={`${args.scenario}:${args.initialPath}`}
      scenario={args.scenario}
    />
  );
}

export const Ready: Story = {
  render: renderExplore,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("heading", { name: "Explorar competiciones" }),
    ).toBeVisible();
    await expect(await canvas.findByText("Liga Nocturna")).toBeVisible();
    await expect(canvas.getByText("4 competiciones")).toBeVisible();
    await expect(canvas.getAllByRole("button", { name: "Ver competición" })).toHaveLength(4);
    const covers = canvasElement.querySelectorAll<HTMLImageElement>("section img");
    await expect(covers[3]?.getAttribute("src")).toBe(
      "/media/competition-covers/org-atlas/super-final.png",
    );
    await expect(covers[0]?.getAttribute("src")).toContain("trophy-league");
  },
};

export const Loading: Story = {
  args: { scenario: "loading" },
  render: renderExplore,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("status", { name: "Cargando competiciones…" })).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "Explorar competiciones" })).toBeVisible();
  },
};

export const FilteredEmpty: Story = {
  args: {
    scenario: "filteredEmpty",
    initialPath: "/player/competitions/explore?q=zzzz",
  },
  render: renderExplore,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("heading", { name: "No encontramos competiciones" }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Limpiar búsqueda y filtros" }));
    await waitFor(() => {
      expect(canvas.getByLabelText("Buscar por nombre")).toHaveValue("");
    });
  },
};

export const NoCompetitions: Story = {
  args: { scenario: "noCompetitions" },
  render: renderExplore,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("heading", { name: "Aún no hay competiciones publicadas" }),
    ).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Limpiar búsqueda y filtros" })).toBeNull();
  },
};

export const ErrorState: Story = {
  name: "Error",
  args: { scenario: "error" },
  render: renderExplore,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText(
        "No se pudieron cargar las competiciones. Comprueba la conexión e inténtalo de nuevo.",
      ),
    ).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Reintentar" })).toBeVisible();
    await expect(
      canvas.queryByRole("heading", { name: "Aún no hay competiciones publicadas" }),
    ).toBeNull();
  },
};

export const ManagerActions: Story = {
  args: { scenario: "manager" },
  render: renderExplore,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const manage = await canvas.findByRole("link", { name: "Gestionar" });
    await expect(manage).toHaveAttribute(
      "href",
      "/orgs/org-cuervos/competitions/competition-liga-nocturna",
    );
  },
};

export const ParticipantBadge: Story = {
  args: { scenario: "participant" },
  render: renderExplore,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Tu equipo participa")).toBeVisible();
    await expect(canvas.queryByRole("link", { name: "Gestionar" })).toBeNull();
  },
};

export const ShareCopiesLink: Story = {
  args: { scenario: "ready" },
  render: renderExplore,
  play: async ({ canvasElement }) => {
    const writeText = fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const canvas = within(canvasElement);
    const share = await canvas.findAllByRole("button", { name: "Compartir competición" });
    await userEvent.click(share[0]!);
    await expect(await canvas.findByText("Enlace copiado")).toBeVisible();
    expect(writeText).toHaveBeenCalled();
  },
};

export const MoreResults: Story = {
  args: { scenario: "moreResults" },
  render: renderExplore,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Liga Nocturna")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Mostrar más" }));
    await expect(await canvas.findByText("Liga Segunda")).toBeVisible();
  },
};

export const Mobile: Story = {
  args: { scenario: "ready" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: renderExplore,
};

export const LongNames: Story = {
  args: { scenario: "longNames" },
  render: renderExplore,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText(
        "Campeonato Internacional de Clubes Nocturnos de América del Sur y Europa",
      ),
    ).toBeVisible();
  },
};
