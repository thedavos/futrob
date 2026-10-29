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
  overviewActivities,
  overviewCompetition,
  overviewEncounters,
  overviewEntries,
  OVERVIEW_COMPETITION_ID,
  OVERVIEW_NOW,
  OVERVIEW_ORG_ID,
  overviewTeams,
} from "./competition-overview.fixtures.ts";
import type { OverviewSlice } from "./competition-overview-model.ts";
import {
  CompetitionOverviewAccessError,
  CompetitionOverviewMember,
  CompetitionOverviewView,
} from "./competition-overview-page.tsx";

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
  | "empty"
  | "loading"
  | "countsLoading"
  | "competitionError"
  | "sectionsError"
  | "entriesError"
  | "encountersError"
  | "entriesErrorWithData"
  | "draft"
  | "member"
  | "accessError";

const retryCalls = { competition: 0, access: 0 };

function ready<T>(data: T): OverviewSlice<T> {
  return { status: "ready", data };
}

function failed(retry: () => void): OverviewSlice<never> {
  return { status: "error", retry };
}

const loading = { status: "loading" } as const;

function OverviewStory({
  locale,
  narrow = false,
  scenario,
}: {
  readonly locale: Locale;
  readonly narrow?: boolean;
  readonly scenario: Scenario;
}) {
  const router = useMemo(() => {
    const rootRoute = createRootRoute({ component: Outlet });
    const home = createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId/competitions/$competitionId",
      component: () => <OverviewBody scenario={scenario} />,
    });
    const setup = createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId/competitions/$competitionId/setup",
      component: () => <p>Configuración</p>,
    });
    const teams = createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId/competitions/$competitionId/teams",
      component: () => <p>Listado de equipos</p>,
    });
    const encounters = createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId/competitions/$competitionId/encounters",
      component: () => <p>Enfrentamientos</p>,
    });
    const encounter = createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId/competitions/$competitionId/encounters/$encounterId",
      component: () => <p>Enfrentamiento</p>,
    });
    const disputes = createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId/competitions/$competitionId/disputes",
      component: () => <p>Disputas</p>,
    });
    return createRouter({
      routeTree: rootRoute.addChildren([home, setup, teams, encounters, encounter, disputes]),
      history: createMemoryHistory({
        initialEntries: [`/orgs/${OVERVIEW_ORG_ID}/competitions/${OVERVIEW_COMPETITION_ID}`],
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

function OverviewBody({ scenario }: { readonly scenario: Scenario }) {
  const [recovered, setRecovered] = useState(false);
  if (scenario === "member") return <CompetitionOverviewMember />;
  if (scenario === "accessError") {
    return (
      <CompetitionOverviewAccessError
        onRetry={() => {
          retryCalls.access += 1;
        }}
      />
    );
  }

  const isLoading = scenario === "loading";
  const countsLoading = scenario === "countsLoading";
  const sectionsFailed = scenario === "sectionsError";
  const isEmpty = scenario === "empty";
  const entriesFailed =
    !recovered && (scenario === "entriesError" || scenario === "entriesErrorWithData");
  const encountersFailed = !recovered && scenario === "encountersError";
  const competition = isLoading
    ? loading
    : scenario === "competitionError"
      ? failed(() => {
          retryCalls.competition += 1;
        })
      : ready(
          scenario === "draft"
            ? { ...overviewCompetition, status: "draft" as const }
            : overviewCompetition,
        );
  const encounters =
    isLoading || countsLoading
      ? loading
      : sectionsFailed || encountersFailed
        ? failed(() => setRecovered(true))
        : ready(
            isEmpty || scenario === "entriesError"
              ? { ...overviewEncounters, encounters: [] }
              : overviewEncounters,
          );
  const entries =
    isLoading || countsLoading
      ? loading
      : sectionsFailed || entriesFailed
        ? failed(() => setRecovered(true))
        : ready(isEmpty ? [] : overviewEntries);
  const teams = isLoading
    ? loading
    : sectionsFailed
      ? failed(() => undefined)
      : ready(isEmpty ? [] : overviewTeams);
  const activities = isLoading
    ? loading
    : sectionsFailed
      ? failed(() => undefined)
      : ready(
          isEmpty || countsLoading || scenario === "entriesError" || scenario === "encountersError"
            ? []
            : overviewActivities,
        );

  return (
    <CompetitionOverviewView
      activities={activities}
      competition={competition}
      competitionId={OVERVIEW_COMPETITION_ID}
      encounters={encounters}
      entries={entries}
      now={OVERVIEW_NOW}
      organizationId={OVERVIEW_ORG_ID}
      teams={teams}
    />
  );
}

const meta = {
  title: "Product/Competition/Overview",
  parameters: { layout: "fullscreen" },
  args: { scenario: "ready", locale: "es" },
  argTypes: {
    scenario: {
      control: "select",
      options: [
        "ready",
        "empty",
        "loading",
        "countsLoading",
        "competitionError",
        "sectionsError",
        "entriesError",
        "encountersError",
        "entriesErrorWithData",
        "draft",
        "member",
        "accessError",
      ] satisfies Scenario[],
    },
    locale: { control: "inline-radio", options: ["es", "en"] },
  },
  render: (args) => <OverviewStory key={`${args.scenario}-${args.locale}`} {...args} />,
} satisfies Meta<{
  readonly scenario: Scenario;
  readonly locale: Locale;
  readonly narrow?: boolean;
}>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Ready: Story = {
  name: "Con datos",
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.findByRole("heading", { name: "Liga Nocturna" })).resolves.toBeVisible();
    await expect(canvas.findByText("Publicada")).resolves.toBeVisible();
    await expect(canvas.findByText(/2 de 8 equipos/)).resolves.toBeVisible();
    await expect(canvas.findByText("1 inscripción de equipo por revisar")).resolves.toBeVisible();
    await expect(
      canvas.findByText("1 enfrentamiento sin resultado oficial"),
    ).resolves.toBeVisible();
    await expect(canvas.findByText("Resolver disputa")).resolves.toBeVisible();
    await expect(
      canvas.findByRole("link", { name: "Abrir Orion vs Atlas" }),
    ).resolves.toBeVisible();
    await expect(canvas.findByText("Horarios en America/Lima")).resolves.toBeVisible();
    await expect(canvas.findByText("Atlas")).resolves.toBeVisible();
    await expect(canvas.queryByText("Rechazado SC")).toBeNull();
    await expect(canvas.queryByText("Inscrito")).toBeNull();
  },
};

export const OpenEncounter: Story = {
  name: "Abrir un enfrentamiento",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("link", { name: "Abrir Orion vs Atlas" }));
    await expect(canvas.findByText("Enfrentamiento")).resolves.toBeVisible();
  },
};

export const ReadyEnglishNarrow: Story = {
  name: "Con datos · EN 360",
  args: { locale: "en", narrow: true },
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.findByText("Published")).resolves.toBeVisible();
    await expect(canvas.findByText("1 team entry to review")).resolves.toBeVisible();
    await expect(canvas.findAllByText("Upcoming encounters")).resolves.toHaveLength(2);
    await expect(canvas.findByRole("link", { name: "Open Orion vs Atlas" })).resolves.toBeVisible();
  },
};

export const Empty: Story = {
  name: "Sin datos",
  args: { scenario: "empty" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.findByText("Todo al día")).resolves.toBeVisible();
    await expect(canvas.findByText("Sin enfrentamientos programados")).resolves.toBeVisible();
    await expect(canvas.findByText("Aún no hay equipos")).resolves.toBeVisible();
    const zeros = await canvas.findAllByText("0");
    await expect(zeros).toHaveLength(4);
    await expect(canvas.queryByText("Sin datos")).toBeNull();
    await userEvent.click(canvas.getByRole("button", { name: "Gestionar equipos" }));
    await expect(canvas.findByText("Listado de equipos")).resolves.toBeVisible();
  },
};

export const Loading: Story = {
  name: "Cargando",
  args: { scenario: "loading" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.findAllByRole("status")).resolves.not.toHaveLength(0);
    await expect(canvas.queryByText("0")).toBeNull();
    await expect(canvas.queryByText("Todo al día")).toBeNull();
    await expect(canvas.queryByText("Liga Nocturna")).toBeNull();
  },
};

export const CountsLoading: Story = {
  name: "Pendientes aún cargando",
  args: { scenario: "countsLoading" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.findByRole("heading", { name: "Liga Nocturna" })).resolves.toBeVisible();
    await expect(canvas.findAllByRole("status")).resolves.not.toHaveLength(0);
    await expect(canvas.queryByText("Todo al día")).toBeNull();
    await expect(canvas.queryByText("0")).toBeNull();
  },
};

export const CompetitionError: Story = {
  name: "La competición no carga",
  args: { scenario: "competitionError" },
  play: async ({ canvasElement }) => {
    retryCalls.competition = 0;
    const canvas = within(canvasElement);
    await expect(canvas.findByText("No pudimos cargar la competición.")).resolves.toBeVisible();
    await expect(
      canvas.findByRole("link", { name: "Abrir Orion vs Atlas" }),
    ).resolves.toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Reintentar" }));
    await expect(retryCalls.competition).toBe(1);
  },
};

export const SectionsError: Story = {
  name: "Fallan las secciones",
  args: { scenario: "sectionsError" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.findByRole("heading", { name: "Liga Nocturna" })).resolves.toBeVisible();
    await expect(
      canvas.findByText("No pudimos cargar los enfrentamientos."),
    ).resolves.toBeVisible();
    await expect(canvas.findByText("No pudimos cargar los equipos.")).resolves.toBeVisible();
    await expect(
      canvas.findByText("No pudimos cargar todas las tareas pendientes."),
    ).resolves.toBeVisible();
    await expect(canvas.findAllByText("Sin datos")).resolves.toHaveLength(4);
    await expect(canvas.queryByRole("status")).toBeNull();
    await expect(canvas.queryByText("Todo al día")).toBeNull();
    await expect(canvas.queryByText("0")).toBeNull();
  },
};

export const Draft: Story = {
  name: "Borrador",
  args: { scenario: "draft" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.findByText("Borrador")).resolves.toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Continuar configuración" }));
    await expect(canvas.findByText("Configuración")).resolves.toBeVisible();
  },
};

export const Member: Story = {
  name: "Sin permiso de operador",
  args: { scenario: "member" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.findByRole("heading", { name: "Ya formas parte de la competición" }),
    ).resolves.toBeVisible();
    await expect(canvas.queryByText("Equipos aprobados")).toBeNull();
  },
};

export const AccessError: Story = {
  name: "No se pudo comprobar el acceso",
  args: { scenario: "accessError" },
  play: async ({ canvasElement }) => {
    retryCalls.access = 0;
    const canvas = within(canvasElement);
    await expect(
      canvas.findByText("No pudimos comprobar tu acceso a la competición."),
    ).resolves.toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Reintentar" }));
    await expect(retryCalls.access).toBe(1);
  },
};

export const EntriesError: Story = {
  name: "Inscripciones fallidas con recuperación",
  args: { scenario: "entriesError" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const pending = within(await canvas.findByRole("region", { name: "Pendientes" }));
    await expect(
      pending.findByText("No pudimos cargar todas las tareas pendientes."),
    ).resolves.toBeVisible();
    await expect(pending.queryByRole("status")).toBeNull();
    await expect(pending.queryByText("Todo al día")).toBeNull();
    await userEvent.click(pending.getByRole("button", { name: "Reintentar" }));
    await expect(pending.findByText("1 inscripción de equipo por revisar")).resolves.toBeVisible();
    await expect(pending.queryByText("No pudimos cargar todas las tareas pendientes.")).toBeNull();
  },
};

export const EncountersError: Story = {
  name: "Enfrentamientos fallidos con recuperación",
  args: { scenario: "encountersError" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const pending = within(await canvas.findByRole("region", { name: "Pendientes" }));
    await expect(
      pending.findByText("No pudimos cargar todas las tareas pendientes."),
    ).resolves.toBeVisible();
    await expect(pending.findByText("1 inscripción de equipo por revisar")).resolves.toBeVisible();
    await expect(pending.queryByRole("status")).toBeNull();
    await userEvent.click(pending.getByRole("button", { name: "Reintentar" }));
    await expect(
      pending.findByText("1 enfrentamiento sin resultado oficial"),
    ).resolves.toBeVisible();
    await expect(pending.queryByText("No pudimos cargar todas las tareas pendientes.")).toBeNull();
  },
};

export const EntriesErrorWithData: Story = {
  name: "Inscripciones fallidas conservan otros pendientes",
  args: { scenario: "entriesErrorWithData" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const pending = within(await canvas.findByRole("region", { name: "Pendientes" }));
    await expect(
      pending.findByText("No pudimos cargar todas las tareas pendientes."),
    ).resolves.toBeVisible();
    await expect(pending.findByText("Resolver disputa")).resolves.toBeVisible();
    await expect(
      pending.findByText("1 enfrentamiento sin resultado oficial"),
    ).resolves.toBeVisible();
    await expect(pending.queryByRole("status")).toBeNull();
  },
};
