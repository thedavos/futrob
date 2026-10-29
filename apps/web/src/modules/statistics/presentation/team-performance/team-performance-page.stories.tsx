import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { expect, within } from "storybook/test";
import * as stylex from "@stylexjs/stylex";
import { applyProps } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import type { Locale } from "@/shared/presentation/i18n/catalogs.ts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import {
  TEAM_PERFORMANCE_TEAMS,
  projectionIncompleteFixture,
  teamPerformanceRankingFixture,
} from "./team-performance.fixtures.ts";
import {
  TeamPerformancePageView,
  type TeamPerformanceNames,
  type TeamPerformanceState,
} from "./team-performance-page.tsx";

const styles = stylex.create({
  frame: {
    minHeight: "100svh",
    backgroundColor: colors.background,
    paddingInline: { default: "1rem", [media.lg]: "2.5rem" },
    paddingBlock: "1.5rem",
  },
  narrow: {
    width: 360,
    paddingInline: "1rem",
  },
});

type Scenario =
  | "ready"
  | "loading"
  | "notBuilt"
  | "empty"
  | "projectionIncomplete"
  | "forbidden"
  | "notInPlan"
  | "error"
  | "accessError"
  | "refreshError"
  | "notBuiltRefreshError";

const noop = () => undefined;
const ready = teamPerformanceRankingFixture();

const STATES: Record<Scenario, TeamPerformanceState> = {
  ready: { kind: "ready", ranking: ready },
  loading: { kind: "loading" },
  notBuilt: { kind: "ready", ranking: null },
  empty: {
    kind: "ready",
    ranking: teamPerformanceRankingFixture({
      rows: [],
      sources: [],
      window: { ...ready.window, from: null, through: null },
    }),
  },
  projectionIncomplete: { kind: "ready", ranking: projectionIncompleteFixture() },
  forbidden: { kind: "forbidden" },
  notInPlan: { kind: "notInPlan" },
  error: { kind: "error", cause: "load", retry: noop },
  accessError: { kind: "error", cause: "access", retry: noop },
  refreshError: { kind: "ready", ranking: ready, refreshRetry: noop },
  notBuiltRefreshError: { kind: "ready", ranking: null, refreshRetry: noop },
};

type NamesScenario = "ready" | "loading" | "unavailable";

const NAMES: Record<NamesScenario, TeamPerformanceNames> = {
  ready: { kind: "ready", teams: TEAM_PERFORMANCE_TEAMS },
  loading: { kind: "loading" },
  unavailable: { kind: "unavailable" },
};

type StoryArgs = {
  readonly scenario: Scenario;
  readonly names: NamesScenario;
  readonly locale: Locale;
  readonly narrow?: boolean;
};

const BASE = "/orgs/$orgId/competitions/$competitionId";

function TeamPerformanceStory({ locale, names, narrow = false, scenario }: StoryArgs) {
  const router = useMemo(() => {
    const rootRoute = createRootRoute({ component: Outlet });
    const page = createRoute({
      getParentRoute: () => rootRoute,
      path: `${BASE}/team-performance`,
      component: () => (
        <TeamPerformancePageView
          competitionId="competition-1"
          names={NAMES[names]}
          organizationId="org-1"
          state={STATES[scenario]}
        />
      ),
    });
    const stubs = ["", "/standings", "/encounters"].map((suffix) =>
      createRoute({
        getParentRoute: () => rootRoute,
        path: `${BASE}${suffix}`,
        component: () => <p>Destino</p>,
      }),
    );
    const plan = createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId/settings/plan",
      component: () => <p>Destino</p>,
    });
    return createRouter({
      routeTree: rootRoute.addChildren([page, plan, ...stubs]),
      history: createMemoryHistory({
        initialEntries: ["/orgs/org-1/competitions/competition-1/team-performance"],
      }),
    });
  }, [names, scenario]);
  return (
    <I18nProvider initialLocale={locale} persistLocale={async () => undefined}>
      <div {...applyProps(undefined, undefined, styles.frame, narrow && styles.narrow)}>
        <RouterProvider router={router} />
      </div>
    </I18nProvider>
  );
}

const meta = {
  title: "Product/Competition/Team performance",
  parameters: { layout: "fullscreen" },
  args: { scenario: "ready", names: "ready", locale: "es" },
  argTypes: {
    scenario: { control: "select", options: Object.keys(STATES) },
    names: { control: "inline-radio", options: Object.keys(NAMES) },
    locale: { control: "inline-radio", options: ["es", "en"] },
  },
  render: (args) => (
    <TeamPerformanceStory key={`${args.scenario}-${args.names}-${args.locale}`} {...args} />
  ),
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

export const Playground: Story = {};

export const Ready: Story = {
  name: "Con ranking",
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const table = await canvas.findByRole("table");
    await expect(within(table).getByText("Cuervos FC")).toBeVisible();
    await expect(within(table).getByText("Falta: Eficiencia defensiva")).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "Criterio" })).toBeVisible();
  },
};

export const ReadyEnglishNarrow: Story = {
  name: "Con ranking · EN 360",
  args: { locale: "en", narrow: true },
  parameters: { a11y: { test: "error" } },
};

export const Loading: Story = { name: "Cargando", args: { scenario: "loading" } };

export const NamesLoading: Story = {
  name: "Nombres cargando",
  args: { names: "loading" },
};

export const NamesUnavailable: Story = {
  name: "Nombres no disponibles",
  args: { names: "unavailable" },
};

export const NotBuilt: Story = {
  name: "Sin ranking todavía",
  args: { scenario: "notBuilt" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("link", { name: "Ver enfrentamientos" })).toHaveAttribute(
      "href",
      "/orgs/org-1/competitions/competition-1/encounters",
    );
  },
};

export const Empty: Story = { name: "Sin equipos", args: { scenario: "empty" } };

export const ProjectionIncomplete: Story = {
  name: "Pendiente de reconstrucción",
  args: { scenario: "projectionIncomplete" },
};

export const NotInPlan: Story = {
  name: "Fuera del plan",
  args: { scenario: "notInPlan" },
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText("El ranking de rendimiento es de Pro y Liga"),
    ).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Ver la tabla" })).toHaveAttribute(
      "href",
      "/orgs/org-1/competitions/competition-1/standings",
    );
    await expect(canvas.getByRole("link", { name: "Ver plan y uso" })).toHaveAttribute(
      "href",
      "/orgs/org-1/settings/plan",
    );
  },
};

export const Forbidden: Story = {
  name: "Sin permiso",
  args: { scenario: "forbidden" },
  parameters: { a11y: { test: "error" } },
};

export const LoadError: Story = { name: "Error", args: { scenario: "error" } };

export const AccessError: Story = { name: "Error de acceso", args: { scenario: "accessError" } };

export const RefreshError: Story = {
  name: "Error al actualizar con datos en caché",
  args: { scenario: "refreshError" },
};

export const NotBuiltRefreshError: Story = {
  name: "Error al actualizar sin ranking en caché",
  args: { scenario: "notBuiltRefreshError" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText(
        "No pudimos actualizar el ranking. Se muestran los últimos datos cargados.",
      ),
    ).toBeVisible();
    await expect(
      canvas.getByRole("heading", { name: "Aún no hay ranking de rendimiento" }),
    ).toBeVisible();
  },
};

export const NarrowSpanish: Story = {
  name: "Con ranking · ES 360",
  args: { narrow: true },
};
