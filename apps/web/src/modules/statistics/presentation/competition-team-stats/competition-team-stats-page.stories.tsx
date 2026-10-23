import { useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
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
import { applyProps } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import type { Locale } from "@/shared/presentation/i18n/catalogs.ts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import {
  DEFAULT_TEAM_STATS_SORT,
  DEFAULT_TEAM_STATS_VIEW,
  type TeamStatsSort,
  type TeamStatsView,
} from "./competition-team-stats-model.ts";
import { CompetitionTeamStatsPageView } from "./competition-team-stats-page.tsx";
import type { CompetitionTeamStatsState, TeamNamesState } from "./competition-team-stats-state.ts";
import {
  competitionTeamStatsFixture,
  completeTeamStatsFixture,
  TEAM_NAMES,
} from "./competition-team-stats.fixtures.ts";

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

const noop = () => undefined;

const SCENARIOS = [
  "ready",
  "partial",
  "namesLoading",
  "namesError",
  "namesDenied",
  "namesRefreshFailed",
  "refreshFailed",
  "loading",
  "empty",
  "emptyRefreshFailed",
  "forbidden",
  "notFound",
  "error",
  "accessError",
] as const;
type Scenario = (typeof SCENARIOS)[number];

const READY_NAMES: TeamNamesState = { kind: "ready", names: TEAM_NAMES, refreshFailed: null };

function scenario(id: Scenario): { state: CompetitionTeamStatsState; names: TeamNamesState } {
  const ready = (teams = competitionTeamStatsFixture): CompetitionTeamStatsState => ({
    kind: "ready",
    teams,
    refreshFailed: null,
  });
  switch (id) {
    case "ready":
      return { state: ready(completeTeamStatsFixture), names: READY_NAMES };
    case "partial":
      return { state: ready(), names: READY_NAMES };
    case "namesLoading":
      return { state: ready(), names: { kind: "loading" } };
    case "namesError":
      return { state: ready(), names: { kind: "error", reason: "load", retry: noop } };
    case "namesDenied":
      return { state: ready(), names: { kind: "error", reason: "denied", retry: noop } };
    case "namesRefreshFailed":
      return {
        state: ready(),
        names: { kind: "ready", names: TEAM_NAMES, refreshFailed: { retry: noop } },
      };
    case "refreshFailed":
      return {
        state: {
          kind: "ready",
          teams: competitionTeamStatsFixture,
          refreshFailed: { retry: noop },
        },
        names: READY_NAMES,
      };
    case "loading":
      return { state: { kind: "loading" }, names: { kind: "loading" } };
    case "empty":
      return { state: ready([]), names: READY_NAMES };
    case "emptyRefreshFailed":
      return {
        state: { kind: "ready", teams: [], refreshFailed: { retry: noop } },
        names: { kind: "loading" },
      };
    case "forbidden":
      return { state: { kind: "forbidden" }, names: { kind: "loading" } };
    case "notFound":
      return { state: { kind: "not_found" }, names: { kind: "loading" } };
    case "error":
      return { state: { kind: "error", reason: "load", retry: noop }, names: { kind: "loading" } };
    case "accessError":
      return {
        state: { kind: "error", reason: "access", retry: noop },
        names: { kind: "loading" },
      };
    default: {
      const exhaustive: never = id;
      return exhaustive;
    }
  }
}

type StoryArgs = {
  readonly scenario: Scenario;
  readonly locale: Locale;
  readonly narrow?: boolean;
};

function StatsPage({ scenario: id }: { readonly scenario: Scenario }) {
  const [view, setView] = useState<TeamStatsView>(DEFAULT_TEAM_STATS_VIEW);
  const [sort, setSort] = useState<TeamStatsSort>(DEFAULT_TEAM_STATS_SORT);
  const { names, state } = scenario(id);
  return (
    <CompetitionTeamStatsPageView
      competitionId="competition-1"
      names={names}
      onSortChange={setSort}
      onViewChange={setView}
      organizationId="org-1"
      sort={sort}
      state={state}
      view={view}
    />
  );
}

function Story({ locale, narrow = false, scenario: id }: StoryArgs) {
  const router = useMemo(() => {
    const rootRoute = createRootRoute({ component: Outlet });
    const statsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId/competitions/$competitionId/stats",
      component: () => <StatsPage scenario={id} />,
    });
    const encountersRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId/competitions/$competitionId/encounters",
      component: () => <p>Enfrentamientos</p>,
    });
    const orgRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId",
      component: () => <p>Organización</p>,
    });
    return createRouter({
      routeTree: rootRoute.addChildren([statsRoute, encountersRoute, orgRoute]),
      history: createMemoryHistory({
        initialEntries: ["/orgs/org-1/competitions/competition-1/stats"],
      }),
    });
  }, [id]);
  return (
    <I18nProvider initialLocale={locale} persistLocale={async () => undefined}>
      <div {...applyProps(undefined, undefined, styles.frame, narrow && styles.narrow)}>
        <RouterProvider router={router} />
      </div>
    </I18nProvider>
  );
}

const meta = {
  title: "Product/Competition/Team statistics",
  parameters: { layout: "fullscreen" },
  args: { scenario: "ready", locale: "es" },
  argTypes: {
    scenario: { control: "select", options: SCENARIOS },
    locale: { control: "inline-radio", options: ["es", "en"] },
  },
  render: (args) => <Story key={`${args.scenario}-${args.locale}`} {...args} />,
} satisfies Meta<StoryArgs>;

export default meta;
type StoryObject = StoryObj<StoryArgs>;

export const Ready: StoryObject = {
  name: "Con estadísticas",
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("heading", { level: 1, name: "Estadísticas de equipos" }),
    ).toBeVisible();
    const goals = canvas.getByRole("columnheader", { name: /^Goles/ });
    await expect(goals).toHaveAttribute("aria-sort", "descending");
    const rows = () => canvas.getAllByRole("rowheader").map((cell) => cell.textContent);
    await expect(rows()[0]).toBe("Club Atlético Halcones del Pacífico");

    await userEvent.click(within(goals).getByRole("button"));
    await expect(goals).toHaveAttribute("aria-sort", "ascending");
    await expect(rows()[0]).toBe("Maderas FC");

    await userEvent.click(canvas.getByRole("radio", { name: "Por partido" }));
    await expect(canvas.getByRole("radio", { name: "Por partido" })).toBeChecked();
    await expect(canvas.queryByText("Datos parciales")).toBeNull();
  },
};

export const Partial: StoryObject = {
  name: "Datos parciales y sin dato",
  args: { scenario: "partial" },
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Datos parciales")).toBeVisible();
    await expect(canvas.getAllByText(", dato parcial").length).toBeGreaterThan(0);
    await expect(canvas.getAllByText("Sin datos").length).toBeGreaterThan(0);
  },
};

export const ReadyEnglishNarrow: StoryObject = {
  name: "Con estadísticas · EN 360",
  args: { scenario: "partial", locale: "en", narrow: true },
  parameters: { a11y: { test: "error" } },
};

export const NamesLoading: StoryObject = {
  name: "Nombres cargando",
  args: { scenario: "namesLoading" },
};

export const NamesError: StoryObject = {
  name: "Nombres no disponibles",
  args: { scenario: "namesError" },
};

export const NamesDenied: StoryObject = {
  name: "Nombres sin permiso",
  args: { scenario: "namesDenied" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText(
        "No tienes acceso a los nombres de los equipos. Las cifras siguen disponibles.",
      ),
    ).toBeVisible();
    await expect(canvas.queryByText("Cuervos FC")).toBeNull();
    await expect(canvas.getByRole("table")).toBeVisible();
  },
};

export const NamesRefreshFailed: StoryObject = {
  name: "Error al actualizar nombres (nombres en caché)",
  args: { scenario: "namesRefreshFailed" },
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText(
        "No pudimos actualizar los nombres de los equipos. Se muestran los últimos cargados.",
      ),
    ).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Reintentar" })).toBeVisible();
    await expect(canvas.getAllByText("Cuervos FC").length).toBeGreaterThan(0);
  },
};

export const RefreshFailed: StoryObject = {
  name: "Error al actualizar (datos en caché)",
  args: { scenario: "refreshFailed" },
};

export const Loading: StoryObject = { name: "Cargando", args: { scenario: "loading" } };

export const Empty: StoryObject = {
  name: "Sin resultados aprobados",
  args: { scenario: "empty" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("link", { name: "Ver enfrentamientos" })).toBeVisible();
  },
};

export const EmptyRefreshFailed: StoryObject = {
  name: "Sin resultados aprobados · error al actualizar",
  args: { scenario: "emptyRefreshFailed" },
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText(
        "No pudimos actualizar las estadísticas. Se muestran los últimos datos cargados.",
      ),
    ).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Reintentar" })).toBeVisible();
    await expect(canvas.getByText("Aún no hay estadísticas oficiales")).toBeVisible();
  },
};

export const Forbidden: StoryObject = {
  name: "Sin permiso",
  args: { scenario: "forbidden" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("link", { name: "Volver a la organización" }),
    ).toBeVisible();
  },
};

export const NotFound: StoryObject = { name: "No disponible", args: { scenario: "notFound" } };

export const LoadError: StoryObject = { name: "Error", args: { scenario: "error" } };

export const AccessError: StoryObject = {
  name: "Error al comprobar acceso",
  args: { scenario: "accessError" },
};
