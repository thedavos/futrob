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
import { expect, userEvent, waitFor, within } from "storybook/test";
import * as stylex from "@stylexjs/stylex";
import { applyProps } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import type { Locale } from "@/shared/presentation/i18n/catalogs.ts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { groupsKnockoutFixture, noFixture, swissFixture } from "./competition-fixture.fixtures.ts";
import { CompetitionFixturePageView } from "./competition-fixture-page.tsx";
import {
  competitionFixturePageState,
  type CompetitionFixturePageState,
} from "./competition-fixture-state.ts";
import { FIXTURE_CALENDAR_NOW, leagueFixture } from "./fixture-calendar.fixtures.ts";
import type { FixtureCalendarViewKind } from "./fixture-calendar.tsx";
import type { SwissFixtureCommands } from "./swiss-fixture-commands.ts";
import { fixtureCalendarSearchSchema } from "./fixture-calendar-search.ts";

const styles = stylex.create({
  frame: {
    minHeight: "100svh",
    backgroundColor: colors.background,
    paddingInline: { default: "1rem", [media.lg]: "2.5rem" },
    paddingBlock: "1.5rem",
  },
});

const retry = () => undefined;

type Scenario =
  | "league"
  | "knockout"
  | "stale"
  | "empty"
  | "loading"
  | "notFound"
  | "error"
  | "swiss"
  | "swissManage"
  | "swissGenerate"
  | "swissNeedsTeams";

const generateState = (teamCount: number) =>
  competitionFixturePageState({
    data: noFixture,
    failed: false,
    refused: false,
    retry,
    generate: { timeZone: "America/Lima", teamCount },
  });

const swissCommands: SwissFixtureCommands = {
  generate: async () => undefined,
  withdraw: async () => undefined,
  closeRound: async () => undefined,
};

const STATES: Record<Scenario, CompetitionFixturePageState> = {
  league: competitionFixturePageState({
    data: leagueFixture,
    failed: false,
    refused: false,
    retry,
  }),
  knockout: competitionFixturePageState({
    data: groupsKnockoutFixture,
    failed: false,
    refused: false,
    retry,
  }),
  stale: competitionFixturePageState({ data: leagueFixture, failed: true, refused: false, retry }),
  empty: competitionFixturePageState({ data: noFixture, failed: false, refused: false, retry }),
  loading: { kind: "loading" },
  notFound: { kind: "not_found" },
  error: { kind: "error", retry },
  swiss: competitionFixturePageState({
    data: swissFixture,
    failed: false,
    refused: false,
    retry,
  }),
  swissManage: competitionFixturePageState({
    data: swissFixture,
    failed: false,
    refused: false,
    retry,
    canManageSwiss: true,
  }),
  swissGenerate: generateState(8),
  swissNeedsTeams: generateState(1),
};

type StoryArgs = {
  readonly scenario: Scenario;
  readonly locale: Locale;
  readonly initialView: FixtureCalendarViewKind;
};

function FixtureStory({ initialView, locale, scenario }: StoryArgs) {
  const router = useMemo(() => {
    const rootRoute = createRootRoute({ component: Outlet });
    const fixtureRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId/competitions/$competitionId/fixture",
      validateSearch: fixtureCalendarSearchSchema,
      component: () => (
        <CompetitionFixturePageView
          commands={swissCommands}
          competitionId="competition-1"
          initialView={initialView}
          now={FIXTURE_CALENDAR_NOW}
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
      routeTree: rootRoute.addChildren([fixtureRoute, encounterRoute]),
      history: createMemoryHistory({
        initialEntries: ["/orgs/org-1/competitions/competition-1/fixture"],
      }),
    });
  }, [initialView, scenario]);
  return (
    <I18nProvider initialLocale={locale} persistLocale={async () => undefined}>
      <div {...applyProps(undefined, undefined, styles.frame)}>
        <RouterProvider router={router} />
      </div>
    </I18nProvider>
  );
}

const SCENARIOS = [
  "league",
  "knockout",
  "stale",
  "empty",
  "loading",
  "notFound",
  "error",
  "swiss",
  "swissManage",
  "swissGenerate",
  "swissNeedsTeams",
] satisfies Scenario[];

const meta = {
  title: "Product/Competition/Fixture",
  parameters: { layout: "fullscreen" },
  args: { scenario: "league", locale: "es", initialView: "agenda" },
  argTypes: {
    scenario: { control: "select", options: SCENARIOS },
    locale: { control: "inline-radio", options: ["es", "en"] },
    initialView: { control: "inline-radio", options: ["agenda", "month", "rounds"] },
  },
  render: (args) => (
    <FixtureStory key={`${args.scenario}-${args.locale}-${args.initialView}`} {...args} />
  ),
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

const narrow = { viewport: { defaultViewport: "mobile1" } };

export const Agenda: Story = {
  name: "Agenda",
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("tab", { name: "Agenda" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(canvas.getByRole("tab", { name: "Calendario" })).toBeVisible();
    await expect(canvas.getByText("Horarios en Europe/Madrid")).toBeVisible();
    await expect(
      canvas.getByRole("heading", { level: 2, name: "lunes, 9 de noviembre" }),
    ).toBeVisible();
    // 23:15 UTC on the 13th is listed on Saturday the 14th in Madrid.
    await expect(
      canvas.getByRole("heading", { level: 2, name: "sábado, 14 de noviembre" }),
    ).toBeVisible();
    await expect(canvas.getByRole("status")).toHaveTextContent("12 enfrentamientos en 7 fechas");
    const row = canvas.getByRole("link", {
      name: "Abrir Atlas FC vs Norte United, lunes, 9 de noviembre, 21:00",
    });
    await userEvent.click(row);
    await expect(await canvas.findByText("Enfrentamiento")).toBeVisible();
  },
};

export const Month: Story = {
  name: "Calendario mensual",
  args: { initialView: "month" },
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: "Noviembre de 2026" })).toBeVisible();
    // Opens on the next date.
    await expect(
      canvas.getByRole("button", { name: "lunes, 9 de noviembre: 2 enfrentamientos" }),
    ).toHaveAttribute("aria-pressed", "true");
    const busy = canvas.getByRole("button", { name: "lunes, 16 de noviembre: 3 enfrentamientos" });
    await expect(busy).toHaveTextContent("+1 más");
    await userEvent.click(busy);
    await expect(busy).toHaveAttribute("aria-pressed", "true");
    await expect(
      canvas.getByRole("heading", { level: 3, name: "lunes, 16 de noviembre" }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("link", {
        name: "Abrir Rayo Esports vs Unión Club, lunes, 16 de noviembre, 21:30",
      }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Mes siguiente" }));
    await expect(canvas.getByRole("heading", { name: "Diciembre de 2026" })).toBeVisible();
    await expect(
      canvas.getByRole("heading", { level: 3, name: "martes, 1 de diciembre" }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Mes siguiente" }));
    await expect(canvas.getByText("No hay enfrentamientos este mes.")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Ver Diciembre de 2026" }));
    await expect(canvas.getByRole("heading", { name: "Diciembre de 2026" })).toBeVisible();
  },
};

export const RoundsEnglish: Story = {
  name: "Jornadas · EN",
  args: { locale: "en", initialView: "rounds" },
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { level: 2, name: "League" })).toBeVisible();
    for (const round of ["Matchday 1", "Matchday 2", "Matchday 3"]) {
      await expect(canvas.getByRole("heading", { level: 3, name: round })).toBeVisible();
    }
    await expect(canvas.getByText("Up next")).toBeVisible();
    await expect(canvas.getByRole("region", { name: "League rounds" })).toBeVisible();
  },
};

export const FilteredEmpty: Story = {
  name: "Filtros sin resultados",
  args: { scenario: "knockout" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(canvas.getByRole("combobox", { name: "Equipo" }));
    await userEvent.click(await page.findByRole("option", { name: "Cuervos FC" }));
    await expect(canvas.getByRole("status")).toHaveTextContent("2 enfrentamientos en 2 fechas");
    await userEvent.click(canvas.getByRole("combobox", { name: "Ronda" }));
    await userEvent.click(await page.findByRole("option", { name: "Eliminación · Final" }));
    await expect(
      canvas.getByRole("heading", { name: "Sin enfrentamientos con estos filtros" }),
    ).toBeVisible();
    const [reset] = canvas.getAllByRole("button", { name: "Limpiar filtros" });
    if (!reset) throw new Error("reset expected");
    await userEvent.click(reset);
    await expect(canvas.getByRole("status")).toHaveTextContent("7 enfrentamientos en 4 fechas");
    await expect(canvas.getByRole("combobox", { name: "Equipo" })).toHaveFocus();
  },
};

export const OpenSlots: Story = {
  name: "Plazas por definir",
  args: { scenario: "knockout" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Horarios en America/Lima")).toBeVisible();
    await expect(canvas.getAllByText("Equipo no disponible").length).toBeGreaterThan(0);
    await expect(canvas.getByText("Ganador de la semifinal 1")).toBeVisible();
    await expect(canvas.getAllByText("1.º del grupo A").length).toBeGreaterThan(0);
  },
};

export const NarrowAgenda: Story = {
  name: "Agenda · 320",
  parameters: { ...narrow, a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("tab", { name: "Agenda" })).toBeVisible();
    await expect(canvas.getByRole("tab", { name: "Jornadas" })).toBeVisible();
    await expect(canvas.queryByRole("tab", { name: "Calendario" })).toBeNull();
  },
};

export const NarrowFallsBackToAgenda: Story = {
  name: "Calendario en móvil → Agenda",
  args: { initialView: "month" },
  parameters: narrow,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("tab", { name: "Agenda" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(canvas.queryByRole("heading", { name: "Noviembre de 2026" })).toBeNull();
    await expect(
      canvas.getByRole("heading", { level: 2, name: "lunes, 9 de noviembre" }),
    ).toBeVisible();
  },
};

export const NarrowRoundsEnglish: Story = {
  name: "Jornadas · EN 320",
  args: { locale: "en", initialView: "rounds" },
  parameters: narrow,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { level: 3, name: "Matchday 1" })).toBeVisible();
    await expect(canvas.queryByRole("tab", { name: "Calendar" })).toBeNull();
  },
};

export const Stale: Story = {
  name: "Última lectura",
  args: { scenario: "stale" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("No pudimos actualizar el calendario. Ves la última lectura correcta."),
    ).toBeVisible();
    await expect(
      canvas.getByRole("link", {
        name: "Abrir Atlas FC vs Norte United, lunes, 9 de noviembre, 21:00",
      }),
    ).toBeVisible();
  },
};

export const Empty: Story = {
  name: "Sin calendario",
  args: { scenario: "empty" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: "Aún no hay calendario" })).toBeVisible();
    await expect(canvas.queryByRole("link")).toBeNull();
    await expect(canvas.queryByRole("tablist")).toBeNull();
  },
};

export const Loading: Story = { name: "Cargando", args: { scenario: "loading" } };

export const NotFound: Story = { name: "No disponible", args: { scenario: "notFound" } };

export const LoadError: Story = { name: "Error", args: { scenario: "error" } };

export const Swiss: Story = {
  name: "Suizo · espectador",
  args: { scenario: "swiss" },
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: "Fase suiza" })).toBeVisible();
    await expect(canvas.getByText("Rondas emparejadas: 2 de 4")).toBeVisible();
    await expect(canvas.getByText("Se empareja cuando se oficialice la ronda 2")).toBeVisible();
    await expect(canvas.getByText("Sur United descansa").closest("a")).toBeNull();
    await expect(canvas.getByText("No disputado").closest("a")).toBeNull();
    await expect(canvas.queryByRole("button", { name: "Retirar equipo" })).toBeNull();
  },
};

export const SwissEnglishNarrow: Story = {
  name: "Suizo · EN 360",
  args: { scenario: "swissManage", locale: "en" },
  parameters: { ...narrow, a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: "Swiss stage" })).toBeVisible();
    await expect(canvas.getByText("Maderas FC has a bye")).toBeVisible();
    const close = canvas.getByRole("button", { name: "Close round without result" });
    await expect(close.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  },
};

export const SwissWithdrawDialog: Story = {
  name: "Suizo · retirar equipo",
  args: { scenario: "swissManage" },
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Retirar equipo" }));
    const body = within(canvasElement.ownerDocument.body);
    const popup = await body.findByRole("alertdialog");
    await waitFor(() => expect(popup).toBeVisible());
    const dialog = within(popup);
    await userEvent.click(dialog.getByRole("button", { name: "Confirmar retirada" }));
    await waitFor(() => expect(dialog.getByText("Selecciona el equipo.")).toBeVisible());
    await userEvent.click(dialog.getByRole("combobox", { name: "Equipo" }));
    await userEvent.click(await body.findByRole("option", { name: "Sur United" }));
    await userEvent.type(dialog.getByRole("textbox", { name: "Motivo" }), "Abandona el torneo");
    await userEvent.click(dialog.getByRole("button", { name: "Confirmar retirada" }));
    await waitFor(() => expect(body.queryByRole("alertdialog")).toBeNull());
    await waitFor(() => expect(canvas.getByText("Sur United queda retirado.")).toBeVisible());
  },
};

export const SwissCloseDialog: Story = {
  name: "Suizo · cerrar ronda",
  args: { scenario: "swissManage" },
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Cerrar ronda sin resultado" }));
    const body = within(canvasElement.ownerDocument.body);
    const dialog = within(await body.findByRole("alertdialog"));
    await waitFor(() =>
      expect(
        dialog.getByRole("heading", { name: "Cerrar la ronda 2 sin resultado" }),
      ).toBeVisible(),
    );
    await expect(dialog.getByText(/nadie suma puntos/)).toBeVisible();
  },
};

export const SwissGenerate: Story = {
  name: "Suizo · generar calendario",
  args: { scenario: "swissGenerate" },
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: "Genera el calendario" })).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Generar calendario" }));
    await expect(await canvas.findByText("Indica una fecha y hora futuras.")).toBeVisible();
  },
};

export const SwissNeedsTeams: Story = {
  name: "Suizo · faltan equipos",
  args: { scenario: "swissNeedsTeams" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: "Aún no hay calendario" })).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Generar calendario" })).toBeNull();
  },
};
