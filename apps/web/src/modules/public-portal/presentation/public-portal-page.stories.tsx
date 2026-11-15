import { useMemo, type ReactNode } from "react";
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
import type { Locale } from "@/shared/presentation/i18n/catalogs.ts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import {
  portalRefFixture,
  publicBracketFixture,
  publicCalendarFixture,
  publicCompetitionFixture,
  publicRankingFixture,
  publicRulesFixture,
  publicStandingsFixture,
} from "./public-portal.fixtures.ts";
import { PortalCalendarView, PortalCoverView } from "./public-portal-calendar.tsx";
import { PublicPortalLayout } from "./public-portal-layout.tsx";
import { portalPath, type PortalSection } from "./public-portal-model.ts";
import { PortalError, PortalLoading, PortalNotFound } from "./public-portal-states.tsx";
import { PortalBracketView, PortalRulesView, PortalTeamsView } from "./public-portal-structure.tsx";
import { PortalRankingView, PortalStandingsView } from "./public-portal-tables.tsx";

type Scenario =
  | "cover"
  | "calendar"
  | "noFixture"
  | "standings"
  | "standingsEmpty"
  | "bracket"
  | "bracketEmpty"
  | "teams"
  | "teamsEmpty"
  | "rankings"
  | "rankingsEmpty"
  | "rules"
  | "loading"
  | "error"
  | "notFound";

const CALENDAR = { timeZone: "America/Lima", entries: publicCalendarFixture };
const NO_CALENDAR = { timeZone: "America/Lima", entries: [] };

const SECTION_OF: Record<Exclude<Scenario, "notFound">, PortalSection> = {
  cover: "cover",
  calendar: "calendar",
  noFixture: "calendar",
  standings: "standings",
  standingsEmpty: "standings",
  bracket: "bracket",
  bracketEmpty: "bracket",
  teams: "teams",
  teamsEmpty: "teams",
  rankings: "rankings",
  rankingsEmpty: "rankings",
  rules: "rules",
  loading: "standings",
  error: "standings",
};

function body(scenario: Exclude<Scenario, "notFound">): ReactNode {
  switch (scenario) {
    case "cover":
      return <PortalCoverView calendar={CALENDAR} portalRef={portalRefFixture} />;
    case "calendar":
      return <PortalCalendarView calendar={CALENDAR} />;
    case "noFixture":
      return <PortalCalendarView calendar={NO_CALENDAR} />;
    case "standings":
      return <PortalStandingsView standings={publicStandingsFixture} />;
    case "standingsEmpty":
      return <PortalStandingsView standings={{ rows: [], swiss: null, updatedAt: null }} />;
    case "bracket":
      return <PortalBracketView bracket={publicBracketFixture} format="league-playoffs" />;
    case "bracketEmpty":
      return <PortalBracketView bracket={null} format="league-playoffs" />;
    case "teams":
      return (
        <PortalTeamsView
          teams={["Atlético Norte", "Deportivo Este", "Real Sur", "Unión Oeste"].map((name) => ({
            name,
          }))}
        />
      );
    case "teamsEmpty":
      return <PortalTeamsView teams={[]} />;
    case "rankings":
      return <PortalRankingView portalRef={portalRefFixture} ranking={publicRankingFixture} />;
    case "rankingsEmpty":
      return (
        <PortalRankingView
          portalRef={portalRefFixture}
          ranking={{ kind: "assister", rows: [], updatedAt: null }}
        />
      );
    case "rules":
      return <PortalRulesView rules={publicRulesFixture} />;
    case "loading":
      return <PortalLoading />;
    case "error":
      return <PortalError onRetry={() => undefined} />;
    default: {
      const exhaustive: never = scenario;
      return exhaustive;
    }
  }
}

function PortalStory({
  locale,
  scenario,
}: {
  readonly locale: Locale;
  readonly scenario: Scenario;
}) {
  const router = useMemo(() => {
    const rootRoute = createRootRoute({ component: Outlet });
    const home = createRoute({
      getParentRoute: () => rootRoute,
      path: "/",
      component: () => <p>Futrob</p>,
    });
    const portal = createRoute({
      getParentRoute: () => rootRoute,
      path: "/$organizationSlug/$competitionKey/$",
      component: () =>
        scenario === "notFound" ? (
          <PortalNotFound />
        ) : (
          <PublicPortalLayout
            competition={publicCompetitionFixture}
            portalRef={portalRefFixture}
            section={SECTION_OF[scenario]}
          >
            {body(scenario)}
          </PublicPortalLayout>
        ),
    });
    const section = scenario === "notFound" ? "cover" : SECTION_OF[scenario];
    return createRouter({
      routeTree: rootRoute.addChildren([home, portal]),
      history: createMemoryHistory({
        initialEntries: [`${portalPath(portalRefFixture, section)}/`],
      }),
    });
  }, [scenario]);
  return (
    <I18nProvider initialLocale={locale} persistLocale={async () => undefined}>
      <RouterProvider router={router} />
    </I18nProvider>
  );
}

const meta = {
  title: "Product/Public portal/Competition",
  parameters: { layout: "fullscreen", a11y: { test: "error" } },
  args: { scenario: "cover", locale: "es" },
  argTypes: {
    scenario: {
      control: "select",
      options: [
        "cover",
        "calendar",
        "noFixture",
        "standings",
        "standingsEmpty",
        "bracket",
        "bracketEmpty",
        "teams",
        "teamsEmpty",
        "rankings",
        "rankingsEmpty",
        "rules",
        "loading",
        "error",
        "notFound",
      ] satisfies Scenario[],
    },
    locale: { control: "inline-radio", options: ["es", "en"] },
  },
  render: (args) => <PortalStory key={`${args.scenario}-${args.locale}`} {...args} />,
} satisfies Meta<{ readonly scenario: Scenario; readonly locale: Locale }>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Cover: Story = {
  name: "Portada",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.findByRole("heading", { level: 1, name: "Liga Norte Apertura" }),
    ).resolves.toBeVisible();
    await expect(canvas.findByLabelText("Resultado oficial 2–1")).resolves.toBeVisible();
    await expect(canvas.queryByRole("button")).toBeNull();
  },
};
export const Calendar: Story = { name: "Calendario y resultados", args: { scenario: "calendar" } };
export const NoFixture: Story = { name: "Sin fixture", args: { scenario: "noFixture" } };
export const Standings: Story = { name: "Tabla", args: { scenario: "standings" } };
export const StandingsEmpty: Story = { name: "Tabla vacía", args: { scenario: "standingsEmpty" } };
export const Bracket: Story = { name: "Bracket", args: { scenario: "bracket" } };
export const BracketEmpty: Story = {
  name: "Bracket sin cuadro",
  args: { scenario: "bracketEmpty" },
};
export const Teams: Story = { name: "Equipos", args: { scenario: "teams" } };
export const TeamsEmpty: Story = { name: "Equipos vacío", args: { scenario: "teamsEmpty" } };
export const Rankings: Story = { name: "Rankings", args: { scenario: "rankings" } };
export const RankingsEmpty: Story = { name: "Ranking vacío", args: { scenario: "rankingsEmpty" } };
export const Rules: Story = { name: "Reglamento", args: { scenario: "rules" } };
export const Loading: Story = { name: "Cargando", args: { scenario: "loading" } };
export const ReadError: Story = { name: "Error de lectura", args: { scenario: "error" } };
export const NotFound: Story = { name: "No disponible", args: { scenario: "notFound" } };
export const CoverEnglishNarrow: Story = {
  name: "Portada (EN, estrecho)",
  args: { scenario: "cover", locale: "en" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
};
