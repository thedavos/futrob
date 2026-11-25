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
import { expect, userEvent, within } from "storybook/test";
import * as stylex from "@stylexjs/stylex";
import type { ListCompetitionEncountersResponse } from "@futrob/api-contracts";
import { applyProps } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import type { Locale } from "@/shared/presentation/i18n/catalogs.ts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { CompetitionEncountersFilters } from "./competition-encounters-model.ts";
import {
  CompetitionEncountersPageView,
  type CompetitionEncountersState,
} from "./competition-encounters-page.tsx";

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

const list: ListCompetitionEncountersResponse = {
  competition: { id: "competition-1", name: "Liga Apertura", timeZone: "America/Lima" },
  encounters: [
    {
      encounterId: "encounter-1",
      round: { number: 1, total: 3 },
      scheduledStartAt: "2026-10-12T01:00:00.000Z",
      officialMatchCount: 1,
      resolutionMode: null,
      home: { teamId: "team-1", name: "Cuervos FC" },
      away: { teamId: "team-2", name: "Maderas FC" },
      status: "official",
      score: [{ homeGoals: 3, awayGoals: 1 }],
    },
    {
      encounterId: "encounter-1b",
      round: { number: 1, total: 3 },
      scheduledStartAt: "2026-10-12T01:00:00.000Z",
      officialMatchCount: 2,
      resolutionMode: "aggregate_score",
      home: { teamId: "team-4", name: "Inti United" },
      away: { teamId: "team-3", name: "Club Atlético Halcones del Pacífico" },
      status: "official",
      score: [
        { homeGoals: 2, awayGoals: 1 },
        { homeGoals: 2, awayGoals: 0 },
      ],
    },
    {
      encounterId: "encounter-2",
      round: { number: 2, total: 3 },
      scheduledStartAt: "2026-10-19T01:00:00.000Z",
      officialMatchCount: 2,
      resolutionMode: "independent_matches",
      home: { teamId: "team-3", name: "Club Atlético Halcones del Pacífico" },
      away: { teamId: "team-1", name: "Cuervos FC" },
      status: "awaiting_result",
      score: null,
    },
    {
      encounterId: "encounter-2b",
      round: { number: 2, total: 3 },
      scheduledStartAt: "2026-10-19T02:00:00.000Z",
      officialMatchCount: 2,
      resolutionMode: "independent_matches",
      home: { teamId: "team-2", name: "Maderas FC" },
      away: { teamId: "team-4", name: "Inti United" },
      status: "official",
      score: [
        { homeGoals: 1, awayGoals: 1 },
        { homeGoals: 0, awayGoals: 2 },
      ],
    },
    {
      encounterId: "encounter-3",
      round: { number: 3, total: 3 },
      scheduledStartAt: "2026-10-26T01:00:00.000Z",
      officialMatchCount: 1,
      resolutionMode: null,
      home: { teamId: "team-2", name: "Maderas FC" },
      away: { teamId: "team-3", name: "Club Atlético Halcones del Pacífico" },
      status: "scheduled",
      score: null,
    },
  ],
};

type Scenario = "ready" | "empty" | "loading" | "notFound" | "error";

const STATES: Record<Scenario, CompetitionEncountersState> = {
  ready: { kind: "ready", data: list },
  empty: { kind: "ready", data: { ...list, encounters: [] } },
  loading: { kind: "loading" },
  notFound: { kind: "not_found" },
  error: { kind: "error", retry: () => undefined },
};

type StoryArgs = {
  readonly scenario: Scenario;
  readonly locale: Locale;
  readonly narrow?: boolean;
  readonly page?: "competition.encounters" | "competitionPlayer.matches";
  readonly initialFilters?: CompetitionEncountersFilters;
};

function ListStory({
  initialFilters,
  locale,
  narrow = false,
  page = "competition.encounters",
  scenario,
}: StoryArgs) {
  const router = useMemo(() => {
    const rootRoute = createRootRoute({ component: Outlet });
    const listRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId/competitions/$competitionId/encounters",
      component: () => (
        <CompetitionEncountersPageView
          competitionId="competition-1"
          filters={initialFilters}
          organizationId="org-1"
          page={page}
          state={STATES[scenario]}
        />
      ),
    });
    const encounterRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId/competitions/$competitionId/encounters/$encounterId",
      component: () => <p>Enfrentamiento</p>,
    });
    return createRouter({
      routeTree: rootRoute.addChildren([listRoute, encounterRoute]),
      history: createMemoryHistory({
        initialEntries: ["/orgs/org-1/competitions/competition-1/encounters"],
      }),
    });
  }, [initialFilters, page, scenario]);
  return (
    <I18nProvider initialLocale={locale} persistLocale={async () => undefined}>
      <div {...applyProps(undefined, undefined, styles.frame, narrow && styles.narrow)}>
        <RouterProvider router={router} />
      </div>
    </I18nProvider>
  );
}

const meta = {
  title: "Product/Competition/Encounters",
  parameters: { layout: "fullscreen" },
  args: { scenario: "ready", locale: "es" },
  argTypes: {
    scenario: {
      control: "select",
      options: ["ready", "empty", "loading", "notFound", "error"] satisfies Scenario[],
    },
    locale: { control: "inline-radio", options: ["es", "en"] },
  },
  render: (args) => (
    <ListStory
      key={`${args.page ?? "competition.encounters"}-${args.scenario}-${args.locale}`}
      {...args}
    />
  ),
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

export const Ready: Story = {
  name: "Con enfrentamientos",
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const row = await canvas.findByRole("link", { name: "Abrir Cuervos FC vs Maderas FC" });
    await expect(within(row).getByText("Resultado oficial")).toBeVisible();
    await expect(within(row).getByLabelText("Marcador oficial 3 a 1")).toBeVisible();
    await expect(canvas.getByText("Horarios en America/Lima")).toBeVisible();

    await userEvent.click(canvas.getByRole("radio", { name: /Pendientes/i }));
    await expect(
      canvas.getByRole("link", {
        name: "Abrir Club Atlético Halcones del Pacífico vs Cuervos FC",
      }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole("link", { name: "Abrir Cuervos FC vs Maderas FC" }),
    ).not.toBeInTheDocument();
  },
};

export const ReadyEnglishNarrow: Story = {
  name: "Con enfrentamientos · EN 360",
  args: { locale: "en", narrow: true },
  parameters: { a11y: { test: "error" } },
};

export const FilteredEmpty: Story = {
  name: "Sin coincidencias al filtrar",
  args: {
    initialFilters: { status: "scheduled", roundNumber: 1, teamId: null },
  },
  parameters: { a11y: { test: "error" } },
};

export const PlayerMatches: Story = {
  name: "Partidos del jugador",
  args: { page: "competitionPlayer.matches" },
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: "Partidos" })).toBeVisible();
    await expect(
      canvas.getByRole("link", { name: "Abrir Cuervos FC vs Maderas FC" }),
    ).toBeVisible();
  },
};

export const Empty: Story = { name: "Sin calendario", args: { scenario: "empty" } };

export const Loading: Story = { name: "Cargando", args: { scenario: "loading" } };

export const NotFound: Story = { name: "No disponible", args: { scenario: "notFound" } };

export const LoadError: Story = { name: "Error", args: { scenario: "error" } };
