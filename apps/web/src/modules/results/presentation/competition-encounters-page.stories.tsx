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
import type { ListCompetitionEncountersResponse } from "@futrob/api-contracts";
import { applyProps } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import type { Locale } from "@/shared/presentation/i18n/catalogs.ts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
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
      officialMatchCount: 2,
      home: { teamId: "team-1", name: "Cuervos FC" },
      away: { teamId: "team-2", name: "Maderas FC" },
      status: "official",
    },
    {
      encounterId: "encounter-2",
      round: { number: 2, total: 3 },
      scheduledStartAt: "2026-10-19T01:00:00.000Z",
      officialMatchCount: 2,
      home: { teamId: "team-3", name: "Club Atlético Halcones del Pacífico" },
      away: { teamId: "team-1", name: "Cuervos FC" },
      status: "awaiting_result",
    },
    {
      encounterId: "encounter-3",
      round: { number: 3, total: 3 },
      scheduledStartAt: "2026-10-26T01:00:00.000Z",
      officialMatchCount: 1,
      home: { teamId: "team-2", name: "Maderas FC" },
      away: { teamId: "team-3", name: "Club Atlético Halcones del Pacífico" },
      status: "scheduled",
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
};

function ListStory({ locale, narrow = false, scenario }: StoryArgs) {
  const router = useMemo(() => {
    const rootRoute = createRootRoute({ component: Outlet });
    const listRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId/competitions/$competitionId/encounters",
      component: () => (
        <CompetitionEncountersPageView
          competitionId="competition-1"
          organizationId="org-1"
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
  }, [scenario]);
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
  render: (args) => <ListStory key={`${args.scenario}-${args.locale}`} {...args} />,
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
    await expect(canvas.getByText("Horarios en America/Lima")).toBeVisible();
  },
};

export const ReadyEnglishNarrow: Story = {
  name: "Con enfrentamientos · EN 360",
  args: { locale: "en", narrow: true },
  parameters: { a11y: { test: "error" } },
};

export const Empty: Story = { name: "Sin calendario", args: { scenario: "empty" } };

export const Loading: Story = { name: "Cargando", args: { scenario: "loading" } };

export const NotFound: Story = { name: "No disponible", args: { scenario: "notFound" } };

export const LoadError: Story = { name: "Error", args: { scenario: "error" } };
