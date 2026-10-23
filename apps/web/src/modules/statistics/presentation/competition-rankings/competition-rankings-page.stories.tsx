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
import type { RankingKindDto } from "@futrob/api-contracts";
import { applyProps } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import type { Locale } from "@/shared/presentation/i18n/catalogs.ts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import {
  CompetitionRankingsPageView,
  type CompetitionRankingsState,
} from "./competition-rankings-page.tsx";
import {
  rankingNamesCuervosOnlyFixture,
  rankingNamesFixture,
  rankingsFixture,
} from "./competition-rankings.fixtures.ts";
import { NO_RANKING_NAMES } from "./competition-rankings-view.ts";

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
  | "namesLoading"
  | "namesRestricted"
  | "namesPartiallyRestricted"
  | "namesFailed"
  | "notComputed"
  | "loading"
  | "forbidden"
  | "notFound"
  | "error"
  | "refreshFailed";

const noop = () => undefined;
const ready = (names: Extract<CompetitionRankingsState, { kind: "ready" }>["names"]) =>
  ({ kind: "ready", data: rankingsFixture, names, refreshRetry: null }) as const;

const STATES: Record<Scenario, CompetitionRankingsState> = {
  ready: ready({ status: "ready", names: rankingNamesFixture, restricted: "none" }),
  namesLoading: ready({ status: "loading" }),
  namesRestricted: ready({ status: "ready", names: NO_RANKING_NAMES, restricted: "all" }),
  namesPartiallyRestricted: ready({
    status: "ready",
    names: rankingNamesCuervosOnlyFixture,
    restricted: "some",
  }),
  namesFailed: ready({
    status: "failed",
    names: rankingNamesFixture,
    restricted: "none",
    retry: noop,
  }),
  notComputed: {
    kind: "ready",
    data: { rankings: [] },
    names: { status: "ready", names: rankingNamesFixture, restricted: "none" },
    refreshRetry: null,
  },
  loading: { kind: "loading" },
  forbidden: { kind: "forbidden" },
  notFound: { kind: "not_found" },
  error: { kind: "error", retry: noop },
  refreshFailed: {
    ...ready({ status: "ready", names: rankingNamesFixture, restricted: "none" }),
    refreshRetry: noop,
  },
};

type StoryArgs = {
  readonly scenario: Scenario;
  readonly locale: Locale;
  readonly initialKind?: RankingKindDto;
  readonly narrow?: boolean;
};

function RankingsPage({ initialKind, scenario }: Pick<StoryArgs, "initialKind" | "scenario">) {
  const [kind, setKind] = useState<RankingKindDto>(initialKind ?? "scorer");
  return (
    <CompetitionRankingsPageView
      competitionId="competition-1"
      onRankingKindChange={setKind}
      organizationId="org-1"
      rankingKind={kind}
      state={STATES[scenario]}
    />
  );
}

function RankingsStory({ initialKind, locale, narrow = false, scenario }: StoryArgs) {
  const router = useMemo(() => {
    const rootRoute = createRootRoute({ component: Outlet });
    const rankingsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId/competitions/$competitionId/rankings",
      component: () => <RankingsPage initialKind={initialKind} scenario={scenario} />,
    });
    const competitionRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId/competitions/$competitionId",
      component: () => <p>Competición</p>,
    });
    return createRouter({
      routeTree: rootRoute.addChildren([rankingsRoute, competitionRoute]),
      history: createMemoryHistory({
        initialEntries: ["/orgs/org-1/competitions/competition-1/rankings"],
      }),
    });
  }, [initialKind, scenario]);
  return (
    <I18nProvider initialLocale={locale} persistLocale={async () => undefined}>
      <div {...applyProps(undefined, undefined, styles.frame, narrow && styles.narrow)}>
        <RouterProvider router={router} />
      </div>
    </I18nProvider>
  );
}

const SCENARIOS = [
  "ready",
  "namesLoading",
  "namesRestricted",
  "namesPartiallyRestricted",
  "namesFailed",
  "notComputed",
  "loading",
  "forbidden",
  "notFound",
  "error",
  "refreshFailed",
] satisfies Scenario[];

const meta = {
  title: "Product/Competition/Player rankings",
  parameters: { layout: "fullscreen" },
  args: { scenario: "ready", locale: "es" },
  argTypes: {
    scenario: { control: "select", options: SCENARIOS },
    locale: { control: "inline-radio", options: ["es", "en"] },
    initialKind: {
      control: "select",
      options: ["scorer", "assister", "rating", "mvp", "goalkeeper"] satisfies RankingKindDto[],
    },
  },
  render: (args) => (
    <RankingsStory key={`${args.scenario}-${args.locale}-${args.initialKind}`} {...args} />
  ),
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

export const Playground: Story = {};

export const Ready: Story = {
  name: "Goleadores",
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const table = await canvas.findByRole("table", { name: "Ranking de goleadores" });
    await expect(within(table).getByText("Lucía Pérez")).toBeVisible();
    await expect(canvas.getByText("Más goles en partidos oficiales aprobados.")).toBeVisible();

    await userEvent.click(canvas.getByRole("tab", { name: "Porteros" }));
    const keepers = await canvas.findByRole("table", { name: "Ranking de porteros" });
    await expect(within(keepers).getByRole("columnheader", { name: "Paradas" })).toBeVisible();
  },
};

export const RatingEnglishNarrow: Story = {
  name: "Rating · EN 360",
  args: { locale: "en", narrow: true, initialKind: "rating" },
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("table", { name: "Average rating ranking" });
    // Every kind tab, including the short "Rating" and "MVP", keeps a 44×44 target at 360px.
    for (const tab of canvas.getAllByRole("tab")) {
      const { height, width } = tab.getBoundingClientRect();
      await expect(Math.round(width)).toBeGreaterThanOrEqual(44);
      await expect(Math.round(height)).toBeGreaterThanOrEqual(44);
    }
  },
};

export const NobodyQualifies: Story = {
  name: "MVP sin elegibles",
  args: { initialKind: "mvp" },
};

export const NotComputed: Story = { name: "Sin calcular", args: { scenario: "notComputed" } };

export const NamesLoading: Story = { name: "Nombres cargando", args: { scenario: "namesLoading" } };

export const NamesRestricted: Story = {
  name: "Sin acceso a plantillas",
  args: { scenario: "namesRestricted" },
};

export const NamesPartiallyRestricted: Story = {
  name: "Sin acceso a una plantilla",
  args: { scenario: "namesPartiallyRestricted" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const table = await canvas.findByRole("table", { name: "Ranking de goleadores" });
    await expect(within(table).getByText("Lucía Pérez")).toBeVisible();
    await expect(within(table).getAllByText("Equipo sin nombre visible")).toHaveLength(1);
  },
};

export const NamesFailed: Story = { name: "Nombres con error", args: { scenario: "namesFailed" } };

export const Loading: Story = { name: "Cargando", args: { scenario: "loading" } };

export const Forbidden: Story = {
  name: "Sin permiso",
  args: { scenario: "forbidden" },
  parameters: { a11y: { test: "error" } },
};

export const NotFound: Story = { name: "No disponible", args: { scenario: "notFound" } };

export const LoadError: Story = { name: "Error", args: { scenario: "error" } };

export const RefreshFailed: Story = {
  name: "Error al actualizar con datos previos",
  args: { scenario: "refreshFailed" },
};
