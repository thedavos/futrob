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
import type { CompetitionStandingSnapshotDto } from "@futrob/api-contracts";
import { applyProps } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import type { Locale } from "@/shared/presentation/i18n/catalogs.ts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { teamNamesFrom } from "./competition-standings-model.ts";
import {
  CompetitionStandingsPageView,
  type CompetitionStandingsState,
} from "./competition-standings-page.tsx";

const styles = stylex.create({
  frame: {
    minHeight: "100svh",
    backgroundColor: colors.background,
    paddingInline: { default: "1rem", [media.lg]: "2.5rem" },
    paddingBlock: "1.5rem",
  },
  narrow: { width: 360, paddingInline: "1rem" },
});

const row = (
  position: number,
  teamId: string,
  [played, wins, draws, losses, goalsFor, goalsAgainst]: readonly number[],
) => ({
  position,
  teamId,
  played: played!,
  wins: wins!,
  draws: draws!,
  losses: losses!,
  goalsFor: goalsFor!,
  goalsAgainst: goalsAgainst!,
  goalDifference: goalsFor! - goalsAgainst!,
  points: wins! * 3 + draws!,
});

const snapshot: CompetitionStandingSnapshotDto = {
  competitionId: "competition-1",
  organizationId: "org-1",
  formulaVersion: "points-gd-gf-v1",
  rows: [
    row(1, "team-1", [4, 3, 1, 0, 11, 3]),
    row(2, "team-2", [4, 2, 1, 1, 7, 5]),
    row(3, "team-3", [4, 1, 0, 3, 4, 9]),
    row(4, "team-4", [4, 0, 0, 4, 2, 12]),
  ],
  sourceRevisionMax: 8,
  updatedAt: "2026-10-12T01:00:00.000Z",
};

const names = {
  kind: "ready",
  byId: teamNamesFrom([
    { id: "team-1", name: "Cuervos FC" },
    { id: "team-2", name: "Maderas FC" },
    { id: "team-3", name: "Club Atlético Halcones del Pacífico" },
    { id: "team-4", name: "Sobrenaturales" },
  ]),
} as const;

type Scenario =
  | "ready"
  | "namesLoading"
  | "namesError"
  | "refreshFailed"
  | "empty"
  | "loading"
  | "forbidden"
  | "accessError"
  | "error";

const noop = () => undefined;
type ReadyState = Extract<CompetitionStandingsState, { kind: "ready" }>;
const ready = (teamNames: ReadyState["names"]): CompetitionStandingsState => ({
  kind: "ready",
  snapshot,
  names: teamNames,
  refreshFailed: false,
  namesRefreshFailed: false,
  retry: noop,
  retryNames: noop,
});

const STATES: Record<Scenario, CompetitionStandingsState> = {
  ready: ready(names),
  namesLoading: ready({ kind: "loading" }),
  namesError: ready({ kind: "unavailable" }),
  refreshFailed: {
    kind: "ready",
    snapshot,
    names,
    refreshFailed: true,
    namesRefreshFailed: true,
    retry: noop,
    retryNames: noop,
  },
  empty: { kind: "empty" },
  loading: { kind: "loading" },
  forbidden: { kind: "forbidden" },
  accessError: { kind: "access_error", retry: noop },
  error: { kind: "error", retry: noop },
};

type StoryArgs = {
  readonly scenario: Scenario;
  readonly locale: Locale;
  readonly narrow?: boolean;
};

function StandingsStory({ locale, narrow = false, scenario }: StoryArgs) {
  const router = useMemo(() => {
    const rootRoute = createRootRoute({ component: Outlet });
    const page = createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId/competitions/$competitionId/standings",
      component: () => (
        <CompetitionStandingsPageView organizationId="org-1" state={STATES[scenario]} />
      ),
    });
    const org = createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId",
      component: () => <p>Organización</p>,
    });
    return createRouter({
      routeTree: rootRoute.addChildren([page, org]),
      history: createMemoryHistory({
        initialEntries: ["/orgs/org-1/competitions/competition-1/standings"],
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
  title: "Product/Competition/Standings",
  parameters: { layout: "fullscreen" },
  args: { scenario: "ready", locale: "es" },
  argTypes: {
    scenario: {
      control: "select",
      options: [
        "ready",
        "namesLoading",
        "namesError",
        "refreshFailed",
        "empty",
        "loading",
        "forbidden",
        "accessError",
        "error",
      ] satisfies Scenario[],
    },
    locale: { control: "inline-radio", options: ["es", "en"] },
  },
  render: (args) => <StandingsStory key={`${args.scenario}-${args.locale}`} {...args} />,
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

export const Ready: Story = {
  name: "Con clasificación",
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Cuervos FC")).toBeVisible();
    await expect(canvas.getByText("Fórmula points-gd-gf-v1")).toBeVisible();
  },
};

export const ReadyEnglishNarrow: Story = {
  name: "Con clasificación · EN 360",
  args: { locale: "en", narrow: true },
  parameters: { a11y: { test: "error" } },
};

export const NamesLoading: Story = { name: "Nombres cargando", args: { scenario: "namesLoading" } };
export const NamesError: Story = {
  name: "Nombres no disponibles",
  args: { scenario: "namesError" },
};
export const RefreshFailed: Story = {
  name: "Actualización fallida con datos previos",
  args: { scenario: "refreshFailed" },
};
export const Empty: Story = { name: "Sin resultados aprobados", args: { scenario: "empty" } };
export const Loading: Story = { name: "Cargando", args: { scenario: "loading" } };
export const Forbidden: Story = { name: "Sin permiso", args: { scenario: "forbidden" } };
export const AccessError: Story = { name: "Error de acceso", args: { scenario: "accessError" } };
export const LoadError: Story = { name: "Error", args: { scenario: "error" } };
