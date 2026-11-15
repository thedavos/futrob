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
import type { ListCompetitionDisputesResponse } from "@futrob/api-contracts";
import { applyProps } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import type { Locale } from "@/shared/presentation/i18n/catalogs.ts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import {
  CompetitionDisputesPageView,
  type CompetitionDisputesState,
} from "./competition-disputes-page.tsx";

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

const queue: ListCompetitionDisputesResponse = {
  competition: { id: "competition-1", name: "Liga Apertura", timeZone: "America/Lima" },
  disputes: [
    {
      encounterId: "encounter-1",
      status: "disputed",
      home: { teamId: "team-1", name: "Cuervos FC" },
      away: { teamId: "team-2", name: "Maderas FC" },
      scheduledStartAt: "2026-10-12T01:00:00.000Z",
      since: "2026-10-12T18:00:00.000Z",
      dispute: {
        id: "dispute-1",
        status: "open",
        openedByTeamId: "team-2",
        openedAt: "2026-10-12T18:00:00.000Z",
        reviewStartedAt: null,
      },
    },
    {
      encounterId: "encounter-2",
      status: "organizer_review",
      home: { teamId: "team-3", name: "Club Atlético Halcones del Pacífico" },
      away: { teamId: "team-1", name: null },
      scheduledStartAt: "2026-10-19T01:00:00.000Z",
      since: "2026-10-19T12:00:00.000Z",
      dispute: null,
    },
  ],
};

type Scenario = "ready" | "empty" | "loading" | "notFound" | "error";

const STATES: Record<Scenario, CompetitionDisputesState> = {
  ready: { kind: "ready", data: queue },
  empty: { kind: "ready", data: { ...queue, disputes: [] } },
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
      path: "/orgs/$orgId/competitions/$competitionId/disputes",
      component: () => (
        <CompetitionDisputesPageView
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
        initialEntries: ["/orgs/org-1/competitions/competition-1/disputes"],
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
  title: "Product/Competition/Disputes",
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
  name: "Con disputas",
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const row = await canvas.findByRole("link", {
      name: "Revisar la disputa de Cuervos FC vs Maderas FC",
    });
    await expect(within(row).getByText("En disputa")).toBeVisible();
    await expect(canvas.getByText("Horarios en America/Lima")).toBeVisible();
    await expect(row.getAttribute("href")).toBe(
      "/orgs/org-1/competitions/competition-1/encounters/encounter-1#encounter-review",
    );
  },
};

export const ReadyEnglishNarrow: Story = {
  name: "Con disputas · EN 360",
  args: { locale: "en", narrow: true },
  parameters: { a11y: { test: "error" } },
};

export const Empty: Story = { name: "Sin disputas", args: { scenario: "empty" } };

export const Loading: Story = { name: "Cargando", args: { scenario: "loading" } };

export const NotFound: Story = { name: "No disponible", args: { scenario: "notFound" } };

export const LoadError: Story = { name: "Error", args: { scenario: "error" } };
