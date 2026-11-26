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
import { expect, userEvent, within } from "storybook/test";
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
import { PortalFrameLoading, PortalSectionLoading } from "./public-portal-skeleton.tsx";
import { PortalError, PortalNotFound } from "./public-portal-states.tsx";
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
  | "loadingCover"
  | "loadingCalendar"
  | "loadingStandings"
  | "loadingBracket"
  | "loadingTeams"
  | "loadingRankings"
  | "loadingRules"
  | "loadingFrame"
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
  loadingCover: "cover",
  loadingCalendar: "calendar",
  loadingStandings: "standings",
  loadingBracket: "bracket",
  loadingTeams: "teams",
  loadingRankings: "rankings",
  loadingRules: "rules",
  loadingFrame: "standings",
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
    case "loadingCover":
      return <PortalSectionLoading portalRef={portalRefFixture} section="cover" />;
    case "loadingCalendar":
      return <PortalSectionLoading section="calendar" />;
    case "loadingStandings":
      return <PortalSectionLoading section="standings" />;
    case "loadingBracket":
      return <PortalSectionLoading section="bracket" />;
    case "loadingTeams":
      return <PortalSectionLoading section="teams" />;
    case "loadingRankings":
      return <PortalSectionLoading section="rankings" />;
    case "loadingRules":
      return <PortalSectionLoading section="rules" />;
    case "loadingFrame":
      return <PortalFrameLoading />;
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
        ) : scenario === "loadingFrame" ? (
          body(scenario)
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
        "loadingCover",
        "loadingCalendar",
        "loadingStandings",
        "loadingBracket",
        "loadingTeams",
        "loadingRankings",
        "loadingRules",
        "loadingFrame",
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
export const LoadingCover: Story = { name: "Cargando portada", args: { scenario: "loadingCover" } };
export const LoadingCalendar: Story = {
  name: "Cargando calendario",
  args: { scenario: "loadingCalendar" },
};
export const LoadingStandings: Story = {
  name: "Cargando tabla",
  args: { scenario: "loadingStandings" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const busy = canvasElement.querySelector("[aria-busy='true']");
    const status = canvas.getByRole("status", { name: "Cargando la sección" });
    await expect(busy).toHaveAttribute("aria-label", "Cargando la sección");
    await expect(busy?.contains(status)).toBe(false);
    await expect(
      canvas.findByText("Tabla oficial, calculada solo con resultados oficializados."),
    ).resolves.toBeVisible();
    const tables = canvasElement.querySelectorAll("[data-slot='table-container']");
    await expect(tables).toHaveLength(1);
    await expect(tables[0]).toHaveAttribute("tabindex", "-1");
    canvas.getByRole("link", { name: "Reglamento" }).focus();
    await userEvent.tab();
    await expect(tables[0]).not.toHaveFocus();
    await expect(canvas.queryByText("Atlético Norte")).toBeNull();
  },
};
export const LoadingBracket: Story = {
  name: "Cargando bracket",
  args: { scenario: "loadingBracket" },
};
export const LoadingTeams: Story = { name: "Cargando equipos", args: { scenario: "loadingTeams" } };
export const LoadingRankings: Story = {
  name: "Cargando rankings",
  args: { scenario: "loadingRankings" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.findByRole("navigation", { name: "Tipo de ranking" }),
    ).resolves.toBeVisible();
    await expect(canvas.findByText("Goleadores")).resolves.toBeVisible();
    await expect(
      canvas.getByRole("navigation", { name: "Tipo de ranking" }).querySelector("a"),
    ).toBeNull();
    const table = canvasElement.querySelector("[data-slot='table-container']");
    await expect(table).toHaveAttribute("tabindex", "-1");
  },
};
export const LoadingRules: Story = {
  name: "Cargando reglamento",
  args: { scenario: "loadingRules" },
};
export const LoadingFrame: Story = {
  name: "Cargando competición",
  args: { scenario: "loadingFrame" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const busy = canvasElement.querySelector("[aria-busy='true']");
    const status = canvas.getByRole("status", { name: "Cargando la competición" });
    await expect(busy).toHaveAttribute("aria-label", "Cargando la competición");
    await expect(busy?.contains(status)).toBe(false);
    await expect(canvas.queryByRole("heading", { name: "Liga Norte Apertura" })).toBeNull();
    await expect(canvas.findByRole("link", { name: "Futrob" })).resolves.toBeVisible();
    await expect(canvas.queryByRole("link", { name: "Tabla" })).toBeNull();
    await expect(canvas.findByText("Tabla")).resolves.toBeVisible();
    const table = canvasElement.querySelector("[data-slot='table-container']");
    await expect(table).toHaveAttribute("tabindex", "-1");
  },
};
export const LoadingFrameNarrow: Story = {
  name: "Cargando competición · 390",
  args: { scenario: "loadingFrame" },
  // A real 390 px viewport so the pending tab strip overflows horizontally and needs keyboard scroll.
  globals: { viewport: { value: "phone390" } },
  parameters: {
    viewport: {
      options: { phone390: { name: "Phone 390", styles: { width: "390px", height: "844px" } } },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const busy = canvasElement.querySelector("[aria-busy='true']");
    const status = canvas.getByRole("status", { name: "Cargando la competición" });
    await expect(busy).toHaveAttribute("aria-label", "Cargando la competición");
    await expect(busy?.contains(status)).toBe(false);

    const nav = await canvas.findByRole("navigation", { name: "Secciones de la competición" });
    await expect(nav.querySelector("a")).toBeNull();

    const tabs = within(nav).getByRole("list", { name: "Secciones de la competición" });
    await expect(tabs).toHaveAttribute("tabindex", "0");
    await expect(tabs.scrollWidth).toBeGreaterThan(tabs.clientWidth);

    const brand = canvas.getByRole("link", { name: "Futrob" });
    brand.focus();
    await userEvent.tab();
    await expect(tabs).toHaveFocus();

    const lastLabel = within(tabs).getByText("Reglamento");
    await expect(lastLabel.getBoundingClientRect().right).toBeGreaterThan(
      tabs.getBoundingClientRect().right,
    );
    lastLabel.scrollIntoView({ inline: "end", block: "nearest" });
    await expect(tabs.scrollLeft).toBeGreaterThan(0);
    await expect(lastLabel.getBoundingClientRect().right).toBeLessThanOrEqual(
      tabs.getBoundingClientRect().right + 1,
    );
    await expect(lastLabel).toBeVisible();
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  },
};
export const LoadingStandingsNarrow: Story = {
  name: "Cargando tabla · 390",
  args: { scenario: "loadingStandings" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
};
export const ReadError: Story = { name: "Error de lectura", args: { scenario: "error" } };
export const NotFound: Story = { name: "No disponible", args: { scenario: "notFound" } };
export const CoverEnglishNarrow: Story = {
  name: "Portada (EN, estrecho)",
  args: { scenario: "cover", locale: "en" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
};
