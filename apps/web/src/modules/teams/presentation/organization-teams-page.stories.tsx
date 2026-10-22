import { useMemo, useState } from "react";
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
import type {
  CompetitionDto,
  CompetitionEntryDto,
  ListCompetitionParticipantsResponse,
  TeamDto,
} from "@futrob/api-contracts";
import { expect, userEvent, within } from "storybook/test";
import * as stylex from "@stylexjs/stylex";
import { applyProps } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { COMPETITION_PERMISSION } from "@futrob/competitions";
import { TEAM_PERMISSION } from "@futrob/teams";
import { configureCompetitionsStory } from "@/modules/competitions/presentation/competitions-story-client.ts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { OrganizationTeamsPage } from "./organization-teams-page.tsx";

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
  "loading",
  "empty",
  "teamsError",
  "participationError",
  "forbidden",
  "linksDenied",
] as const;

type ScenarioId = (typeof SCENARIO_IDS)[number];

type StoryArgs = { readonly scenario: ScenarioId };

function team(id: string, name: string, createdAt: string): TeamDto {
  return { id, organizationId: ORG_ID, name, createdAt };
}

const TEAMS: TeamDto[] = [
  team("aguilas", "Águilas del Sur", "2026-09-12T12:00:00.000Z"),
  team("cuervos", "Cuervos FC", "2026-10-03T12:00:00.000Z"),
  team("lobos", "Lobos de la Costa Atlántica Unidos", "2026-10-05T12:00:00.000Z"),
  team("sin-liga", "Sin Liga CF", "2026-10-09T12:00:00.000Z"),
];

function competition(id: string, name: string, status: CompetitionDto["status"]): CompetitionDto {
  return {
    id,
    organizationId: ORG_ID,
    name,
    status,
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
    updatedAt: "2026-10-05T12:00:00.000Z",
  };
}

const COMPETITIONS: CompetitionDto[] = [
  competition("liga", "Liga Metropolitana", "published"),
  competition("copa", "Copa de otoño", "registration"),
];

function entry(
  competitionId: string,
  teamId: string,
  status: CompetitionEntryDto["status"],
): CompetitionEntryDto {
  return {
    id: `${competitionId}-${teamId}`,
    organizationId: ORG_ID,
    competitionId,
    teamId,
    status,
    createdAt: "2026-10-04T12:00:00.000Z",
  };
}

const PARTICIPANTS: Record<"liga" | "copa", ListCompetitionParticipantsResponse> = {
  liga: {
    participants: [
      entry("liga", "cuervos", "approved"),
      entry("liga", "lobos", "approved"),
      entry("liga", "aguilas", "pending"),
    ],
  },
  copa: {
    participants: [entry("copa", "cuervos", "pending"), entry("copa", "lobos", "rejected")],
  },
};

const PERMISSIONS = [
  TEAM_PERMISSION.read,
  TEAM_PERMISSION.rosterRead,
  COMPETITION_PERMISSION.participantsRead,
] as const;

function OrganizationTeamsStoryShell({
  scenario,
  initialQuery = "",
}: {
  readonly scenario: ScenarioId;
  readonly initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const client = useMemo(() => {
    configureCompetitionsStory({
      organizationTeams:
        scenario === "loading"
          ? "pending"
          : scenario === "teamsError"
            ? "error"
            : scenario === "empty"
              ? { teams: [] }
              : { teams: TEAMS },
      organizationCompetitions: { competitions: COMPETITIONS },
      organizationParticipants: {
        liga: scenario === "participationError" ? "error" : PARTICIPANTS.liga,
        copa: PARTICIPANTS.copa,
      },
    });
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity, gcTime: Infinity },
        mutations: { retry: false },
      },
    });
    queryClient.setQueryData(
      queryKeys.authorization.effectiveAccess({ organizationId: ORG_ID }, PERMISSIONS),
      {
        actorId: "actor-story",
        scope: { organizationId: ORG_ID },
        roles: [],
        permissions: PERMISSIONS.map((permission) => ({
          permission,
          allowed:
            scenario === "forbidden"
              ? false
              : scenario === "linksDenied"
                ? permission === TEAM_PERMISSION.read
                : true,
          decidedAt: "organization" as const,
        })),
      },
    );
    return queryClient;
  }, [scenario]);

  const router = useMemo(() => {
    const rootRoute = createRootRoute({ component: Outlet });
    const teamsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId/teams",
      component: () => (
        <OrganizationTeamsPage onQueryChange={setQuery} organizationId={ORG_ID} query={query} />
      ),
    });
    const destination = (path: string, label: string) =>
      createRoute({
        getParentRoute: () => rootRoute,
        path,
        component: () => <p>{label}</p>,
      });
    return createRouter({
      routeTree: rootRoute.addChildren([
        teamsRoute,
        destination("/orgs/$orgId", "Inicio de la organización"),
        destination("/orgs/$orgId/competitions", "Listado de competiciones"),
        destination("/orgs/$orgId/competitions/$competitionId/teams", "Equipos de la competición"),
      ]),
      history: createMemoryHistory({ initialEntries: [`/orgs/${ORG_ID}/teams`] }),
    });
    // The query is controlled from the page; the router only hosts the route.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

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
  title: "Product/Organizer/Teams",
  parameters: { layout: "fullscreen" },
  args: { scenario: "ready" },
  argTypes: { scenario: { control: "select", options: [...SCENARIO_IDS] } },
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

function story(name: string, scenario: ScenarioId, play?: Story["play"]): Story {
  return {
    name,
    args: { scenario },
    render: (args) => <OrganizationTeamsStoryShell key={args.scenario} scenario={args.scenario} />,
    play,
  };
}

export const Playground = story("Playground", "ready");

export const Ready = story("Con datos", "ready", async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(await canvas.findByRole("heading", { level: 1, name: "Equipos" })).toBeVisible();
  await expect(await canvas.findByText("4 equipos")).toBeVisible();
  await expect(canvas.getByRole("columnheader", { name: "Equipo" })).toBeVisible();
  await expect(canvas.getByRole("columnheader", { name: "Competiciones" })).toBeVisible();
  const cuervos = canvas.getByRole("row", { name: /Cuervos FC/ });
  const link = await within(cuervos).findByRole("link", {
    name: "Liga Metropolitana: ver Cuervos FC",
  });
  await expect(link).toHaveAttribute(
    "href",
    "/orgs/org-story/competitions/liga/teams?teamId=cuervos",
  );
  await expect(within(cuervos).getByText("Aprobado")).toBeVisible();
  await expect(within(cuervos).getByText("Pendiente")).toBeVisible();
  await expect(
    within(canvas.getByRole("row", { name: /Sin Liga CF/ })).getByText("Sin competiciones"),
  ).toBeVisible();
  await userEvent.click(link);
  await expect(await canvas.findByText("Equipos de la competición")).toBeVisible();
});

export const Search = story("Búsqueda local", "ready", async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const search = await canvas.findByRole("searchbox", { name: "Buscar equipo por nombre" });
  await userEvent.type(search, "aguilas");
  await expect(await canvas.findByText("1 de 4 equipos")).toBeVisible();
  await expect(canvas.queryByRole("row", { name: /Cuervos FC/ })).toBeNull();
  await userEvent.clear(search);
  await userEvent.type(search, "zzz");
  await expect(
    await canvas.findByRole("heading", { name: "Ningún equipo coincide" }),
  ).toBeVisible();
  await userEvent.click(canvas.getByRole("button", { name: "Limpiar búsqueda" }));
  await expect(await canvas.findByText("4 equipos")).toBeVisible();
});

export const Loading = story("Cargando", "loading", async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(await canvas.findByText("Cargando equipos…")).toBeVisible();
  await expect(canvas.queryByRole("table")).toBeNull();
});

export const Empty = story("Sin equipos", "empty", async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(
    await canvas.findByRole("heading", { name: "Todavía no hay equipos" }),
  ).toBeVisible();
  await expect(canvas.getByRole("link", { name: "Ver competiciones" })).toHaveAttribute(
    "href",
    "/orgs/org-story/competitions",
  );
  await expect(canvas.queryByRole("textbox")).toBeNull();
});

export const TeamsError = story("Error de equipos", "teamsError", async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(
    await canvas.findByText("No pudimos cargar los equipos de la organización."),
  ).toBeVisible();
  await expect(canvas.getByRole("button", { name: "Reintentar" })).toBeVisible();
  await expect(canvas.queryByRole("table")).toBeNull();
});

export const ParticipationError = story(
  "Competiciones parciales",
  "participationError",
  async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText(
        "No pudimos cargar las competiciones de todos los equipos. Algunas filas pueden estar incompletas.",
      ),
    ).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Reintentar" })).toBeVisible();
    // Teams stay listed; a team without a known entry is "unavailable", never "no competitions".
    await expect(
      within(await canvas.findByRole("row", { name: /Sin Liga CF/ })).getByText("No disponible"),
    ).toBeVisible();
    await expect(
      within(canvas.getByRole("row", { name: /Cuervos FC/ })).getByRole("link", {
        name: "Copa de otoño: ver Cuervos FC",
      }),
    ).toBeVisible();
  },
);

export const Forbidden = story("Sin permiso", "forbidden", async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(
    await canvas.findByRole("heading", { name: "No tienes acceso a los equipos" }),
  ).toBeVisible();
  await expect(canvas.queryByRole("table")).toBeNull();
  await userEvent.click(canvas.getByRole("link", { name: "Volver al inicio de la organización" }));
  await expect(await canvas.findByText("Inicio de la organización")).toBeVisible();
});

export const LinksDenied = story("Sin enlaces", "linksDenied", async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const cuervos = await canvas.findByRole("row", { name: /Cuervos FC/ });
  await expect(within(cuervos).getByText("Liga Metropolitana")).toBeVisible();
  await expect(within(cuervos).queryByRole("link")).toBeNull();
});

export const Mobile: Story = {
  name: "Mobile",
  args: { scenario: "ready" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: (args) => <OrganizationTeamsStoryShell key={args.scenario} scenario={args.scenario} />,
};
