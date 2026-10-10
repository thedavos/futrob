import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import type { CompetitionDto, TeamDto } from "@futrob/api-contracts";
import { expect, userEvent, waitFor, within } from "storybook/test";
import * as stylex from "@stylexjs/stylex";
import { applyProps } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { COMPETITION_PERMISSION } from "@futrob/competitions";
import { configureCompetitionsStory } from "@/modules/competitions/presentation/competitions-story-client.ts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { OrganizationHomePage } from "./organization-home-page.tsx";
import {
  configureOrganizationsStory,
  STORY_ORGANIZATION_PROFILE,
} from "./organizations-story-client.ts";

const ORG_ID = "org-story";

const styles = stylex.create({
  frame: {
    minHeight: "100svh",
    backgroundColor: colors.background,
    paddingInline: "1.5rem",
    paddingBlock: "1.5rem",
  },
});

const SCENARIO_IDS = [
  "ready",
  "empty",
  "zeroTeams",
  "loading",
  "competitionsError",
  "teamsError",
  "forbidden",
  "forbiddenEmpty",
] as const;

type ScenarioId = (typeof SCENARIO_IDS)[number];

type StoryArgs = {
  readonly scenario: ScenarioId;
};

function competition(
  overrides: Pick<CompetitionDto, "id" | "name" | "status" | "updatedAt"> & Partial<CompetitionDto>,
): CompetitionDto {
  return {
    organizationId: ORG_ID,
    modality: "fc-clubs",
    gameEdition: "FC 26",
    platform: "playstation",
    region: "south-america",
    timeZone: "America/Lima",
    format: "league",
    teams: { min: 2, max: null },
    schedule: { startsOn: null, endsOn: null },
    cover: { kind: "preset", preset: "league" },
    createdAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

const published = competition({
  id: "league",
  name: "Liga Metropolitana",
  status: "published",
  updatedAt: "2026-10-05T12:00:00.000Z",
  schedule: { startsOn: "2026-10-12", endsOn: null },
});

const draft = competition({
  id: "cup",
  name: "Copa de otoño",
  status: "draft",
  updatedAt: "2026-09-20T12:00:00.000Z",
});

const cuervos: TeamDto = {
  id: "cuervos",
  organizationId: ORG_ID,
  name: "Cuervos FC",
  createdAt: "2026-10-03T12:00:00.000Z",
};

function OrganizationHomeStoryShell({ scenario }: { readonly scenario: ScenarioId }) {
  const client = useMemo(() => {
    const readyCompetitions = scenario === "zeroTeams" ? [published] : [published, draft];
    const readyTeams = scenario === "zeroTeams" ? [] : [cuervos];
    configureOrganizationsStory({
      profile: { ...STORY_ORGANIZATION_PROFILE, organizationId: ORG_ID, name: "Liga Nocturna" },
      profileLoad: scenario === "loading" ? "pending" : "success",
    });
    configureCompetitionsStory({
      organizationCompetitions:
        scenario === "loading"
          ? "pending"
          : scenario === "competitionsError"
            ? "error"
            : scenario === "empty" || scenario === "forbiddenEmpty"
              ? { competitions: [] }
              : { competitions: readyCompetitions },
      organizationTeams:
        scenario === "loading"
          ? "pending"
          : scenario === "teamsError"
            ? "error"
            : scenario === "empty" || scenario === "forbiddenEmpty"
              ? { teams: [] }
              : { teams: readyTeams },
      organizationParticipants:
        scenario === "ready" || scenario === "forbidden" || scenario === "teamsError"
          ? {
              league: {
                participants: [
                  {
                    id: "entry-league",
                    organizationId: ORG_ID,
                    competitionId: "league",
                    teamId: "cuervos",
                    status: "approved",
                    createdAt: "2026-10-02T12:00:00.000Z",
                  },
                ],
              },
            }
          : {},
    });
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity, gcTime: Infinity },
        mutations: { retry: false },
      },
    });
    const canCreate = scenario !== "forbidden" && scenario !== "forbiddenEmpty";
    queryClient.setQueryData(
      queryKeys.authorization.effectiveAccess({ organizationId: ORG_ID }, [
        COMPETITION_PERMISSION.update,
      ]),
      {
        actorId: "actor-story",
        scope: { organizationId: ORG_ID },
        roles: [],
        permissions: [
          {
            permission: COMPETITION_PERMISSION.update,
            allowed: canCreate,
            decidedAt: "organization",
          },
        ],
      },
    );
    return queryClient;
  }, [scenario]);

  const router = useMemo(() => {
    const rootRoute = createRootRoute({ component: Outlet });
    const homeRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId",
      component: () => <OrganizationHomePage organizationId={ORG_ID} />,
    });
    const destination = (path: string, label: string) =>
      createRoute({
        getParentRoute: () => rootRoute,
        path,
        component: () => <p>{label}</p>,
      });
    return createRouter({
      routeTree: rootRoute.addChildren([
        homeRoute,
        destination("/orgs/$orgId/competitions/new", "Nueva competición"),
        destination("/orgs/$orgId/competitions", "Listado de competiciones"),
        destination("/orgs/$orgId/competitions/$competitionId", "Detalle de competición"),
        destination("/orgs/$orgId/competitions/$competitionId/setup", "Configuración"),
        destination("/orgs/$orgId/competitions/$competitionId/teams", "Equipos de la competición"),
        destination("/orgs/$orgId/teams", "Equipos de la organización"),
      ]),
      history: createMemoryHistory({ initialEntries: [`/orgs/${ORG_ID}`] }),
    });
  }, []);

  return (
    <QueryClientProvider client={client}>
      <I18nProvider initialLocale="es" persistLocale={async () => undefined}>
        <div {...applyProps(undefined, undefined, styles.frame)}>
          <RouterProvider router={router} />
        </div>
      </I18nProvider>
    </QueryClientProvider>
  );
}

const meta = {
  title: "Product/Organizer/Home",
  parameters: { layout: "fullscreen" },
  args: { scenario: "ready" },
  argTypes: {
    scenario: { control: "select", options: [...SCENARIO_IDS] },
  },
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

function story(name: string, scenario: ScenarioId, play?: Story["play"]): Story {
  return {
    name,
    args: { scenario },
    render: (args) => <OrganizationHomeStoryShell key={args.scenario} scenario={args.scenario} />,
    play,
  };
}

export const Playground = story("Playground", "ready");

async function pageHeader(canvas: ReturnType<typeof within>) {
  const title = await canvas.findByRole("heading", { name: "Liga Nocturna" });
  const header = title.closest("header");
  if (!(header instanceof HTMLElement)) throw new Error("Falta el encabezado de la página");
  return header;
}

export const Ready = story("Con datos", "ready", async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const header = await pageHeader(canvas);
  await expect(within(header).getByRole("heading", { name: "Liga Nocturna" })).toBeVisible();
  await expect(within(header).getByText("Vista general de tu organización")).toBeVisible();
  const create = within(header).getByRole("button", { name: "Crear competición" });
  await expect(create).toHaveAttribute("href", "/orgs/org-story/competitions/new");
  await expect(canvas.queryByRole("heading", { name: "Tu organización empieza aquí" })).toBeNull();
  await expect(canvas.getByRole("heading", { name: "Competiciones" })).toBeVisible();
  await expect(canvas.getByRole("heading", { name: "Actividad reciente" })).toBeVisible();
  await expect(canvas.getByRole("columnheader", { name: "Nombre" })).toBeVisible();
  await expect(canvas.getByRole("columnheader", { name: "Estado" })).toBeVisible();
  await expect(canvas.getByRole("columnheader", { name: "Equipos" })).toBeVisible();
  await expect(canvas.getByRole("columnheader", { name: "Inicio" })).toBeVisible();
  await expect(canvas.getByRole("columnheader", { name: "Acciones" })).toBeVisible();
  const league = canvas.getByRole("row", { name: /Liga Metropolitana/ });
  await expect(within(league).getByText("Competición oficial · FC 26")).toBeVisible();
  await expect(within(league).getByText("1")).toBeVisible();
  await expect(canvas.getByRole("row", { name: /Copa de otoño/ })).toHaveTextContent("—");
  await expect(canvas.getByText("Cuervos FC")).toBeVisible();
  await userEvent.click(canvas.getByRole("button", { name: "Acciones de Liga Metropolitana" }));
  const body = within(canvasElement.ownerDocument.body);
  await waitFor(() => {
    expect(body.getByRole("menuitem", { name: "Abrir" })).toBeVisible();
  });
  await expect(body.getByRole("menuitem", { name: "Ver equipos" })).toBeVisible();
  await userEvent.keyboard("{Escape}");
  await userEvent.click(create);
  await expect(await canvas.findByText("Nueva competición")).toBeVisible();
});

export const Empty = story("Sin competiciones", "empty", async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const header = await pageHeader(canvas);
  await expect(within(header).queryByRole("button", { name: "Crear competición" })).toBeNull();
  await expect(
    await canvas.findByRole("heading", { name: "Tu organización empieza aquí" }),
  ).toBeVisible();
  await expect(
    canvas.getByText("Crea tu primera competición para organizar equipos y encuentros."),
  ).toBeVisible();
  const create = canvas.getByRole("button", { name: "Crear competición" });
  await expect(create).toHaveAttribute("href", "/orgs/org-story/competitions/new");
  await userEvent.click(create);
  await expect(await canvas.findByText("Nueva competición")).toBeVisible();
});

export const ZeroTeams = story("Ceros reales", "zeroTeams", async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const summary = await canvas.findByRole("region", { name: "Resumen" });
  await expect(within(summary).getAllByText("0")).toHaveLength(2);
  await expect(within(summary).getByText("1")).toBeVisible();
  await expect(canvas.getByRole("heading", { name: "Competiciones" })).toBeVisible();
  await expect(canvas.queryByText("Cuervos FC")).toBeNull();
});

export const Loading = story("Cargando", "loading", async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(await canvas.findByText("Vista general de tu organización")).toBeVisible();
  await expect(canvas.queryByRole("heading", { name: "Tu organización empieza aquí" })).toBeNull();
  await expect(canvas.queryByRole("button", { name: "Crear competición" })).toBeNull();
  await expect(canvas.getByLabelText("Resumen")).toHaveAttribute("aria-busy", "true");
});

export const CompetitionsError = story(
  "Error de competiciones",
  "competitionsError",
  async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText(
        "No se pudieron cargar las competiciones. Comprueba la conexión e inténtalo de nuevo.",
      ),
    ).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Reintentar" })).toBeVisible();
    await expect(
      canvas.queryByRole("heading", { name: "Tu organización empieza aquí" }),
    ).toBeNull();
  },
);

export const TeamsError = story("Equipos sin datos", "teamsError", async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const summary = await canvas.findByRole("region", { name: "Resumen" });
  await expect(within(summary).getByText("Sin datos")).toBeVisible();
  await expect(canvas.getByRole("heading", { name: "Competiciones" })).toBeVisible();
});

export const Forbidden = story("Sin permiso para crear", "forbidden", async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(await canvas.findByRole("heading", { name: "Competiciones" })).toBeVisible();
  await expect(canvas.queryByRole("button", { name: "Crear competición" })).toBeNull();
});

export const ForbiddenEmpty = story(
  "Vacío sin permiso",
  "forbiddenEmpty",
  async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("heading", { name: "Tu organización empieza aquí" }),
    ).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Crear competición" })).toBeNull();
  },
);

export const Mobile: Story = {
  name: "Mobile",
  args: { scenario: "ready" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: (args) => <OrganizationHomeStoryShell key={args.scenario} scenario={args.scenario} />,
};
