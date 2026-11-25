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
import { z } from "zod";
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
  "emptyFirstUse",
  "teamsError",
  "participationError",
  "pendingLoading",
  "pendingError",
  "forbidden",
  "linksDenied",
  "competitionsError",
] as const;

type ScenarioId = (typeof SCENARIO_IDS)[number];

type StoryArgs = {
  readonly scenario: ScenarioId;
  readonly initialSearch?: string;
};

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
    exploreListing: "listed",
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
  competition("relampago", "Copa Relámpago", "published"),
  competition("verano", "Torneo Verano 25", "finished"),
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

const PARTICIPANTS: Record<
  "liga" | "copa" | "relampago" | "verano",
  ListCompetitionParticipantsResponse
> = {
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
  relampago: {
    participants: [entry("relampago", "cuervos", "approved")],
  },
  verano: {
    participants: [entry("verano", "cuervos", "approved")],
  },
};

type AccessScope = {
  readonly organizationId: string;
  readonly competitionId?: string;
  readonly teamId?: string;
};

function seedAccess(
  queryClient: QueryClient,
  scope: AccessScope,
  permission: string,
  allowed: boolean,
) {
  queryClient.setQueryData(queryKeys.authorization.effectiveAccess(scope, [permission]), {
    actorId: "actor-story",
    scope,
    roles: [],
    permissions: [
      {
        permission,
        allowed,
        decidedAt: scope.teamId ? "team" : scope.competitionId ? "competition" : "organization",
      },
    ],
  });
}

function seedAccessBatch(
  queryClient: QueryClient,
  scope: AccessScope,
  entries: readonly (readonly [string, boolean])[],
) {
  queryClient.setQueryData(
    queryKeys.authorization.effectiveAccess(
      scope,
      entries.map(([permission]) => permission),
    ),
    {
      actorId: "actor-story",
      scope,
      roles: [],
      permissions: entries.map(([permission, allowed]) => ({
        permission,
        allowed,
        decidedAt: scope.teamId ? "team" : scope.competitionId ? "competition" : "organization",
      })),
    },
  );
}

/**
 * Every destination is resolved in its own scope. `linksDenied` keeps the organization-level
 * participant/roster grants allowed (a broad grant must not expose anything) while denying
 * Liga's participants outright and Cuervos' roster in Copa; Lobos in Copa stays allowed.
 */
function seedScenarioAccess(queryClient: QueryClient, scenario: ScenarioId) {
  const readAllowed = scenario !== "forbidden";
  const createAllowed = scenario === "emptyFirstUse";
  seedAccessBatch(queryClient, { organizationId: ORG_ID }, [
    [TEAM_PERMISSION.read, readAllowed],
    [COMPETITION_PERMISSION.update, createAllowed],
  ]);
  seedAccess(
    queryClient,
    { organizationId: ORG_ID },
    COMPETITION_PERMISSION.participantsRead,
    true,
  );
  seedAccess(queryClient, { organizationId: ORG_ID }, TEAM_PERMISSION.rosterRead, true);
  for (const { id: competitionId } of COMPETITIONS) {
    const participantsAllowed = !(scenario === "linksDenied" && competitionId === "liga");
    seedAccess(
      queryClient,
      { organizationId: ORG_ID, competitionId },
      COMPETITION_PERMISSION.participantsRead,
      participantsAllowed,
    );
    for (const { id: teamId } of TEAMS) {
      const rosterAllowed = !(
        scenario === "linksDenied" &&
        competitionId === "copa" &&
        teamId === "cuervos"
      );
      seedAccess(
        queryClient,
        { organizationId: ORG_ID, competitionId, teamId },
        TEAM_PERMISSION.rosterRead,
        rosterAllowed,
      );
    }
  }
}

const teamsSearchSchema = z.object({
  q: z.string().optional(),
  status: z.enum(["pending", "none"]).optional(),
  competition: z.string().optional(),
});

function createStoryRouter(initialSearch = "") {
  const rootRoute = createRootRoute({ component: Outlet });
  const teamsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/orgs/$orgId/teams",
    validateSearch: teamsSearchSchema,
    component: function OrganizationTeamsRoute() {
      const { q, status, competition: competitionParam } = teamsRoute.useSearch();
      const navigate = teamsRoute.useNavigate();
      return (
        <OrganizationTeamsPage
          competitionId={competitionParam ?? "all"}
          onFiltersChange={(next) =>
            void navigate({
              replace: true,
              search: {
                q: next.query.length > 0 ? next.query : undefined,
                status: next.status === "all" ? undefined : next.status,
                competition:
                  next.competitionId.length > 0 && next.competitionId !== "all"
                    ? next.competitionId
                    : undefined,
              },
            })
          }
          organizationId={ORG_ID}
          query={q ?? ""}
          status={status ?? "all"}
        />
      );
    },
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
      destination("/orgs/$orgId/competitions/new", "Crear competición"),
      destination("/orgs/$orgId/competitions/$competitionId/teams", "Equipos de la competición"),
    ]),
    history: createMemoryHistory({
      initialEntries: [`/orgs/${ORG_ID}/teams${initialSearch}`],
    }),
  });
}

function OrganizationTeamsStoryShell({
  scenario,
  initialSearch = "",
}: {
  readonly scenario: ScenarioId;
  readonly initialSearch?: string;
}) {
  const client = useMemo(() => {
    configureCompetitionsStory({
      organizationTeams:
        scenario === "loading"
          ? "pending"
          : scenario === "teamsError"
            ? "error"
            : scenario === "empty" || scenario === "emptyFirstUse"
              ? { teams: [] }
              : { teams: TEAMS },
      organizationCompetitions:
        scenario === "competitionsError"
          ? "error"
          : scenario === "emptyFirstUse"
            ? { competitions: [] }
            : { competitions: COMPETITIONS },
      organizationParticipants:
        scenario === "pendingLoading"
          ? {
              liga: "pending",
              copa: "pending",
              relampago: { participants: [] },
              verano: { participants: [] },
            }
          : scenario === "pendingError"
            ? {
                liga: "error",
                copa: { participants: [entry("copa", "lobos", "approved")] },
                relampago: PARTICIPANTS.relampago,
                verano: PARTICIPANTS.verano,
              }
            : {
                liga: scenario === "participationError" ? "error" : PARTICIPANTS.liga,
                copa: PARTICIPANTS.copa,
                relampago: PARTICIPANTS.relampago,
                verano: PARTICIPANTS.verano,
              },
    });
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity, gcTime: Infinity },
        mutations: { retry: false },
      },
    });
    seedScenarioAccess(queryClient, scenario);
    return queryClient;
  }, [scenario]);

  // Built once per scenario/initialSearch so typing or filtering updates the router's search state.
  const router = useMemo(() => createStoryRouter(initialSearch), [initialSearch, scenario]);

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

function story(
  name: string,
  scenario: ScenarioId,
  play?: Story["play"],
  initialSearch = "",
): Story {
  return {
    name,
    args: { scenario, initialSearch },
    render: (args) => (
      <OrganizationTeamsStoryShell
        initialSearch={args.initialSearch}
        key={`${args.scenario}:${args.initialSearch ?? ""}`}
        scenario={args.scenario}
      />
    ),
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
  await expect(canvas.getByRole("columnheader", { name: "Estado" })).toBeVisible();
  await expect(canvas.getByRole("columnheader", { name: "Creado" })).toBeVisible();

  const cuervos = canvas.getByRole("row", { name: /Cuervos FC/ });
  // Pending entries come first; each chip surfaces its own status text without relying on color or hover.
  await expect(within(cuervos).getByText("1 pendiente")).toBeVisible();
  const copaChip = await within(cuervos).findByRole("link", {
    name: "Copa de otoño (Pendiente): ver Cuervos FC",
  });
  await expect(copaChip).toBeVisible();
  await expect(within(copaChip).getByText("Pendiente")).toBeVisible();
  const relampagoChip = within(cuervos).getByRole("link", {
    name: "Copa Relámpago (Aprobado): ver Cuervos FC",
  });
  await expect(within(relampagoChip).getByText("Aprobado")).toBeVisible();

  const more = within(cuervos).getByRole("button", { name: "+2 más" });
  await userEvent.click(more);
  const ligaLink = await within(cuervos).findByRole("link", {
    name: "Liga Metropolitana (Aprobado): ver Cuervos FC",
  });
  await expect(ligaLink).toHaveAttribute(
    "href",
    "/orgs/org-story/competitions/liga/teams?teamId=cuervos",
  );
  await expect(
    within(canvas.getByRole("row", { name: /Sin Liga CF/ })).getByText("Sin competiciones"),
  ).toBeVisible();

  await userEvent.click(ligaLink);
  await expect(await canvas.findByText("Equipos de la competición")).toBeVisible();
});

export const Search = story("Búsqueda y filtros", "ready", async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const search = await canvas.findByRole("searchbox", { name: "Buscar equipo por nombre" });
  await userEvent.type(search, "aguilas");
  await expect(await canvas.findByText("1 de 4 equipos")).toBeVisible();
  await expect(canvas.queryByRole("row", { name: /Cuervos FC/ })).toBeNull();
  await userEvent.clear(search);

  await userEvent.click(canvas.getByRole("radio", { name: "Pendientes" }));
  await expect(await canvas.findByText("2 de 4 equipos")).toBeVisible();
  await expect(canvas.getByRole("row", { name: /Cuervos FC/ })).toBeVisible();
  await expect(canvas.queryByRole("row", { name: /Sin Liga CF/ })).toBeNull();

  await userEvent.type(search, "zzz");
  await expect(
    await canvas.findByRole("heading", { name: "Ningún equipo coincide" }),
  ).toBeVisible();
  await userEvent.click(canvas.getByRole("button", { name: "Limpiar filtros" }));
  await expect(await canvas.findByText("4 equipos")).toBeVisible();
});

export const ClearFiltersFromUrl = story(
  "Limpiar filtros desde URL",
  "ready",
  async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("heading", { name: "Ningún equipo coincide" }),
    ).toBeVisible();
    const search = canvas.getByRole("searchbox", { name: "Buscar equipo por nombre" });
    await expect(search).toHaveValue("zzz");

    await userEvent.click(canvas.getByRole("button", { name: "Limpiar filtros" }));
    await expect(await canvas.findByText("4 equipos")).toBeVisible();
    await expect(search).toHaveValue("");
    await expect(canvas.getByRole("radio", { name: "Todos" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(canvas.getByRole("row", { name: /Cuervos FC/ })).toBeVisible();
    await expect(canvas.getByRole("row", { name: /Sin Liga CF/ })).toBeVisible();
  },
  "?q=zzz&status=pending&competition=liga",
);

export const PendingDeepLinkLoading = story(
  "Pendientes cargando (URL)",
  "pendingLoading",
  async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Comprobando inscripciones…")).toBeVisible();
    await expect(canvas.getByText("Cargando inscripciones…")).toBeVisible();
    await expect(canvas.queryByText("0 de 4 equipos")).toBeNull();
    await expect(canvas.queryByRole("heading", { name: "Ningún equipo coincide" })).toBeNull();
  },
  "?status=pending",
);

export const PendingDeepLinkErrorRetry = story(
  "Pendientes con error y reintento",
  "pendingError",
  async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("heading", { name: "No pudimos aplicar los filtros" }),
    ).toBeVisible();
    await expect(canvas.getByText("Resultados incompletos")).toBeVisible();
    await expect(canvas.queryByText("0 de 4 equipos")).toBeNull();
    await expect(canvas.queryByRole("heading", { name: "Ningún equipo coincide" })).toBeNull();

    configureCompetitionsStory({
      organizationParticipants: {
        liga: PARTICIPANTS.liga,
        copa: { participants: [entry("copa", "lobos", "approved")] },
        relampago: PARTICIPANTS.relampago,
        verano: PARTICIPANTS.verano,
      },
    });
    await userEvent.click(canvas.getByRole("button", { name: "Reintentar" }));
    await expect(await canvas.findByText("1 de 4 equipos")).toBeVisible();
    await expect(canvas.getByRole("row", { name: /Águilas del Sur/ })).toBeVisible();
  },
  "?status=pending",
);

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
  // Button rendered as a router link keeps the button role; the href proves the destination.
  await expect(canvas.getByRole("button", { name: "Ver competiciones" })).toHaveAttribute(
    "href",
    "/orgs/org-story/competitions",
  );
  await expect(canvas.queryByRole("textbox")).toBeNull();
});

export const EmptyFirstUse = story(
  "Sin equipos ni competiciones",
  "emptyFirstUse",
  async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("heading", { name: "Todavía no hay equipos" }),
    ).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Crear competición" })).toHaveAttribute(
      "href",
      "/orgs/org-story/competitions/new",
    );
    await expect(canvas.getByRole("button", { name: "Ver competiciones" })).toHaveAttribute(
      "href",
      "/orgs/org-story/competitions",
    );
  },
);

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
        name: "Copa de otoño (Pendiente): ver Cuervos FC",
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
  const back = canvas.getByRole("button", { name: "Volver al inicio de la organización" });
  await expect(back).toHaveAttribute("href", "/orgs/org-story");
  await userEvent.click(back);
  await expect(await canvas.findByText("Inicio de la organización")).toBeVisible();
});

export const LinksDenied = story("Sin enlaces", "linksDenied", async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const cuervos = await canvas.findByRole("row", { name: /Cuervos FC/ });
  // Copa: roster denied in the team scope. Unlinked chip still exposes its status text visibly.
  await expect(within(cuervos).getByText("Copa de otoño")).toBeVisible();
  await expect(within(cuervos).getByText("Pendiente")).toBeVisible();
  await expect(within(cuervos).queryByRole("link", { name: /Copa de otoño/ })).toBeNull();

  const lobos = canvas.getByRole("row", { name: /Lobos de la Costa/ });
  await expect(within(lobos).queryByRole("link", { name: /Liga Metropolitana/ })).toBeNull();
  await expect(
    within(lobos).getByRole("link", {
      name: "Copa de otoño (Rechazado): ver Lobos de la Costa Atlántica Unidos",
    }),
  ).toHaveAttribute("href", "/orgs/org-story/competitions/copa/teams?teamId=lobos");
});

export const CompetitionsError = story(
  "Error de competiciones",
  "competitionsError",
  async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText(
        "No pudimos cargar las competiciones de todos los equipos. Algunas filas pueden estar incompletas.",
      ),
    ).toBeVisible();
    // An unknown competition list is never reported as "no competitions".
    const table = canvas.getByRole("table");
    await expect(within(table).queryByText("Sin competiciones")).toBeNull();
    await expect(within(table).getAllByText("No disponible")).toHaveLength(TEAMS.length);
    configureCompetitionsStory({ organizationCompetitions: { competitions: COMPETITIONS } });
    await userEvent.click(canvas.getByRole("button", { name: "Reintentar" }));
    const cuervos = await canvas.findByRole("row", { name: /Cuervos FC/ });
    await expect(
      await within(cuervos).findByRole("link", {
        name: "Copa de otoño (Pendiente): ver Cuervos FC",
      }),
    ).toBeVisible();
    await expect(
      within(canvas.getByRole("row", { name: /Sin Liga CF/ })).getByText("Sin competiciones"),
    ).toBeVisible();
  },
);

export const Mobile: Story = {
  name: "Mobile",
  args: { scenario: "ready" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: (args) => <OrganizationTeamsStoryShell key={args.scenario} scenario={args.scenario} />,
};
