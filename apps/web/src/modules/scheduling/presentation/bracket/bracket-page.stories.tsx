import { useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { GetCurrentCompetitionFixtureResponse } from "@futrob/api-contracts";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { expect, userEvent, waitFor, within } from "storybook/test";
import * as stylex from "@stylexjs/stylex";
import { applyProps } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import type { Locale } from "@/shared/presentation/i18n/catalogs.ts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { competitionFixturePageState } from "../competition-fixture-state.ts";
import {
  eightTeamTwoLegs,
  groupsThenKnockout,
  leagueOnly,
  leagueThenPlayoffs,
  noFixture,
  sixTeamsWithByes,
  sixteenTeamKnockout,
  twoTeamFinal,
  uncertainSources,
} from "./bracket.fixtures.ts";
import { CompetitionBracketPageView } from "./bracket-page.tsx";
import { bracketPageState, type BracketPageState } from "./bracket-state.ts";

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

const retry = () => undefined;

const fromFixture = (data: GetCurrentCompetitionFixtureResponse, failed = false) =>
  bracketPageState(competitionFixturePageState({ data, failed, refused: false, retry }));

type Scenario =
  | "sixteen"
  | "byes"
  | "twoLegs"
  | "final"
  | "groups"
  | "playoffs"
  | "uncertain"
  | "stale"
  | "league"
  | "empty"
  | "loading"
  | "notFound"
  | "error";

const STATES: Record<Scenario, BracketPageState> = {
  sixteen: fromFixture(sixteenTeamKnockout),
  byes: fromFixture(sixTeamsWithByes),
  twoLegs: fromFixture(eightTeamTwoLegs),
  final: fromFixture(twoTeamFinal),
  groups: fromFixture(groupsThenKnockout),
  playoffs: fromFixture(leagueThenPlayoffs),
  uncertain: fromFixture(uncertainSources),
  stale: fromFixture(sixteenTeamKnockout, true),
  league: fromFixture(leagueOnly),
  empty: fromFixture(noFixture),
  loading: { kind: "loading" },
  notFound: { kind: "not_found" },
  error: { kind: "error", retry },
};

type StoryArgs = {
  readonly scenario: Scenario;
  readonly locale: Locale;
  readonly narrow?: boolean;
  readonly team?: string;
};

function BracketStory({ locale, narrow = false, scenario, team }: StoryArgs) {
  const [teamId, setTeamId] = useState<string | null>(team ?? null);
  const router = useMemo(() => {
    const rootRoute = createRootRoute({ component: Outlet });
    const bracketRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId/competitions/$competitionId/bracket",
      component: function BracketHarness() {
        return (
          <CompetitionBracketPageView
            competitionId="competition-1"
            onTeamChange={setTeamId}
            organizationId="org-1"
            state={STATES[scenario]}
            teamId={teamId}
          />
        );
      },
    });
    const encounterRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId/competitions/$competitionId/encounters/$encounterId",
      component: () => <p>Enfrentamiento</p>,
    });
    const fixtureRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId/competitions/$competitionId/fixture",
      component: () => <p>Calendario</p>,
    });
    return createRouter({
      routeTree: rootRoute.addChildren([bracketRoute, encounterRoute, fixtureRoute]),
      history: createMemoryHistory({
        initialEntries: ["/orgs/org-1/competitions/competition-1/bracket"],
      }),
    });
  }, [scenario, teamId]);
  return (
    <I18nProvider initialLocale={locale} persistLocale={async () => undefined}>
      <div {...applyProps(undefined, undefined, styles.frame, narrow && styles.narrow)}>
        <RouterProvider router={router} />
      </div>
    </I18nProvider>
  );
}

const SCENARIOS = Object.keys(STATES) as Scenario[];

const meta = {
  title: "Product/Competition/Bracket",
  parameters: { layout: "fullscreen" },
  args: { scenario: "sixteen", locale: "es" },
  argTypes: {
    scenario: { control: "select", options: SCENARIOS },
    locale: { control: "inline-radio", options: ["es", "en"] },
  },
  render: (args) => (
    <BracketStory key={`${args.scenario}-${args.locale}-${args.team ?? ""}`} {...args} />
  ),
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

export const SixteenTeams: Story = {
  name: "16 equipos",
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { level: 2, name: "Eliminación" })).toBeVisible();
    await expect(canvas.getByRole("region", { name: /Cuadro desplazable/ })).toBeVisible();
    for (const round of ["Octavos de final", "Cuartos de final", "Semifinales", "Final"]) {
      await expect(canvas.getAllByRole("heading", { level: 3, name: round })[0]).toBeVisible();
    }
    await expect(canvasElement.querySelectorAll("[data-slot=bracket-wire]")).toHaveLength(14);
    await expect(canvas.queryByText(/no tiene línea|no tienen línea/)).toBeNull();
    const first = canvas.getByRole("link", { name: /^Octavos de final, cruce 1: Cuervos FC/ });
    await userEvent.click(first);
    await expect(await canvas.findByText("Enfrentamiento")).toBeVisible();
  },
};

export const FollowTeam: Story = {
  name: "16 equipos · equipo seguido",
  args: { team: "team-3" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/1 de 15 cruces destacados/)).toBeVisible();
    await expect(canvas.getAllByRole("link", { name: /Fuera del filtro/ })).toHaveLength(14);
    await expect(canvasElement.querySelectorAll("[data-slot=bracket-wire]")).toHaveLength(14);
    await userEvent.click(canvas.getByRole("button", { name: "Quitar filtro" }));
    await expect(canvas.queryByRole("link", { name: /Fuera del filtro/ })).toBeNull();
  },
};

export const AccessibleList: Story = {
  name: "Lista por rondas",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Ver eliminatorias en lista" }));
    await waitFor(() =>
      expect(canvas.getByRole("link", { name: /Cuervos FC vs Maderas FC/ })).toBeVisible(),
    );
    await expect(
      canvas.getByRole("link", { name: /^Ganador de octavos 1 vs Ganador de octavos 2/ }),
    ).toBeVisible();
  },
};

export const Byes: Story = {
  name: "Con descansos",
  args: { scenario: "byes" },
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("2 descansos")).toBeVisible();
    await expect(canvas.getAllByText("Descansa")).toHaveLength(2);
    await expect(canvas.getAllByText("Sin rival")).toHaveLength(2);
  },
};

export const TwoLegs: Story = {
  name: "Ida y vuelta · EN",
  args: { scenario: "twoLegs", locale: "en" },
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { level: 2, name: "Knockout" })).toBeVisible();
    await expect(canvas.getAllByText(/Two legs/).length).toBeGreaterThan(1);
  },
};

export const FinalOnly: Story = { name: "Solo final", args: { scenario: "final" } };

export const GroupsThenKnockout: Story = {
  name: "Grupos y eliminatorias",
  args: { scenario: "groups" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("heading", { name: "Grupos" })).toBeNull();
    await expect(canvas.getAllByText("1.º del grupo A")[0]).toBeVisible();
  },
};

export const Playoffs: Story = { name: "Liga y playoffs", args: { scenario: "playoffs" } };

export const UncertainSources: Story = {
  name: "Plazas sin origen",
  args: { scenario: "uncertain" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/1 plaza no indica de qué cruce llega/)).toBeVisible();
    await expect(canvasElement.querySelectorAll("[data-slot=bracket-wire]")).toHaveLength(4);
    await expect(canvas.getAllByText("Ganador por definir")[0]).toBeVisible();
  },
};

export const Narrow: Story = {
  name: "16 equipos · 360",
  args: { narrow: true },
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/Desliza el cuadro/)).toBeVisible();
    const region = canvas.getByRole("region", { name: /Cuadro desplazable/ });
    await expect(region.scrollWidth).toBeGreaterThan(region.clientWidth);
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth + 1,
    );
  },
};

export const Stale: Story = {
  name: "Última lectura",
  args: { scenario: "stale" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("No pudimos actualizar el cuadro. Ves la última lectura correcta."),
    ).toBeVisible();
    await expect(canvas.getAllByRole("link")).toHaveLength(15);
  },
};

export const LeagueOnly: Story = {
  name: "Sin eliminatorias",
  args: { scenario: "league" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: "Esta competición no tiene eliminatorias" }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole("link", { name: "Ver calendario" }));
    await expect(await canvas.findByText("Calendario")).toBeVisible();
  },
};

export const Empty: Story = {
  name: "Sin calendario",
  args: { scenario: "empty" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: "Aún no hay cuadro" })).toBeVisible();
    await expect(canvas.queryByRole("link")).toBeNull();
  },
};

export const Loading: Story = { name: "Cargando", args: { scenario: "loading" } };

export const NotFound: Story = { name: "No disponible", args: { scenario: "notFound" } };

export const LoadError: Story = { name: "Error", args: { scenario: "error" } };
