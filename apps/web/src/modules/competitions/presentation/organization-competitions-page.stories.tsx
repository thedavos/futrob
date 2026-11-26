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
import type { CompetitionDto } from "@futrob/api-contracts";
import { expect, userEvent, within } from "storybook/test";
import * as stylex from "@stylexjs/stylex";
import { applyProps } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import { COMPETITION_PERMISSION } from "@futrob/competitions";
import { configureCompetitionsStory } from "@/modules/competitions/presentation/competitions-story-client.ts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { OrganizationCompetitionsPage } from "./organization-competitions-page.tsx";
import { ORGANIZATION_COMPETITIONS_SKELETON_ROWS } from "./organization-competitions-skeleton.tsx";

const ORG_ID = "org-story";
const LOADING_LABEL = "Cargando competiciones…";

const styles = stylex.create({
  frame: {
    minHeight: "100svh",
    backgroundColor: colors.background,
    paddingInline: { default: "1rem", [media.lg]: "1.5rem" },
    paddingBlock: "1.5rem",
  },
  narrow: {
    width: 390,
    paddingInline: "1rem",
  },
});

const SCENARIO_IDS = ["ready", "loading", "empty", "error", "forbiddenEmpty"] as const;

type ScenarioId = (typeof SCENARIO_IDS)[number];

type StoryArgs = {
  readonly scenario: ScenarioId;
  readonly narrow?: boolean;
};

function competition(
  overrides: Pick<CompetitionDto, "id" | "name" | "status"> & Partial<CompetitionDto>,
): CompetitionDto {
  return {
    organizationId: ORG_ID,
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
    ...overrides,
  };
}

const published = competition({
  id: "league",
  name: "Liga Metropolitana",
  status: "published",
});

const draft = competition({
  id: "cup",
  name: "Copa de otoño",
  status: "draft",
  format: "knockout",
  cover: { kind: "preset", preset: "cup" },
  updatedAt: "2026-09-20T12:00:00.000Z",
});

const registration = competition({
  id: "open",
  name: "Apertura Nocturna",
  status: "registration",
});

function OrganizationCompetitionsStoryShell({
  narrow = false,
  scenario,
}: {
  readonly narrow?: boolean;
  readonly scenario: ScenarioId;
}) {
  const client = useMemo(() => {
    configureCompetitionsStory({
      organizationCompetitions:
        scenario === "loading"
          ? "pending"
          : scenario === "error"
            ? "error"
            : scenario === "empty" || scenario === "forbiddenEmpty"
              ? { competitions: [] }
              : { competitions: [published, draft, registration] },
    });
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity, gcTime: Infinity },
        mutations: { retry: false },
      },
    });
    const canCreate = scenario !== "forbiddenEmpty";
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
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId/competitions/",
      component: () => <OrganizationCompetitionsPage organizationId={ORG_ID} />,
    });
    const destination = (path: string, label: string) =>
      createRoute({
        getParentRoute: () => rootRoute,
        path,
        component: () => <p>{label}</p>,
      });
    return createRouter({
      routeTree: rootRoute.addChildren([
        indexRoute,
        destination("/orgs/$orgId/competitions/new", "Nueva competición"),
        destination("/orgs/$orgId/competitions/$competitionId", "Detalle de competición"),
        destination("/orgs/$orgId/competitions/$competitionId/setup", "Configuración"),
      ]),
      history: createMemoryHistory({
        initialEntries: [`/orgs/${ORG_ID}/competitions/`],
      }),
    });
  }, []);

  return (
    <QueryClientProvider client={client}>
      <I18nProvider initialLocale="es" persistLocale={async () => undefined}>
        <div {...applyProps(undefined, undefined, styles.frame, narrow && styles.narrow)}>
          <RouterProvider router={router} />
        </div>
      </I18nProvider>
    </QueryClientProvider>
  );
}

const meta = {
  title: "Product/Organizer/Competitions",
  parameters: { layout: "fullscreen" },
  args: { scenario: "ready", narrow: false },
  argTypes: {
    scenario: { control: "select", options: [...SCENARIO_IDS] },
    narrow: { control: "boolean" },
  },
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

function story(name: string, args: StoryArgs, play?: Story["play"]): Story {
  return {
    name,
    args,
    render: (storyArgs) => (
      <OrganizationCompetitionsStoryShell
        key={`${storyArgs.scenario}-${storyArgs.narrow ? "narrow" : "wide"}`}
        narrow={storyArgs.narrow}
        scenario={storyArgs.scenario}
      />
    ),
    play,
  };
}

export const Playground = story("Playground", { scenario: "ready" });

export const Ready = story("Con datos", { scenario: "ready" }, async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.findByRole("heading", { name: "Competiciones" })).resolves.toBeVisible();
  await expect(canvas.getByText("Competiciones que administra esta organización.")).toBeVisible();
  const league = canvas.getByRole("link", { name: /Liga Metropolitana/ });
  await expect(league).toHaveAttribute("href", "/orgs/org-story/competitions/league");
  await expect(canvas.getByText("Publicada")).toBeVisible();
  await expect(canvas.getByRole("link", { name: /Copa de otoño/ })).toHaveAttribute(
    "href",
    "/orgs/org-story/competitions/cup/setup",
  );
  await expect(canvas.getByText("Borrador")).toBeVisible();
  await expect(canvas.getByRole("link", { name: /Apertura Nocturna/ })).toBeVisible();
  await expect(canvas.getByText("Inscripciones abiertas")).toBeVisible();
  await expect(canvas.queryByRole("status", { name: LOADING_LABEL })).toBeNull();
  await userEvent.click(league);
  await expect(await canvas.findByText("Detalle de competición")).toBeVisible();
});

export const Loading = story("Cargando", { scenario: "loading" }, async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.findByRole("heading", { name: "Competiciones" })).resolves.toBeVisible();
  await expect(canvas.getByText("Competiciones que administra esta organización.")).toBeVisible();
  const status = await canvas.findByRole("status", { name: LOADING_LABEL });
  await expect(status.parentElement).toHaveAttribute("aria-busy", "true");
  await expect(canvasElement.querySelectorAll("[data-slot='skeleton']")).toHaveLength(
    ORGANIZATION_COMPETITIONS_SKELETON_ROWS * 3,
  );
  await expect(canvas.queryByRole("link", { name: /Liga Metropolitana/ })).toBeNull();
  await expect(canvas.queryByText("Publicada")).toBeNull();
  await expect(canvas.queryByRole("heading", { name: "Sin competiciones todavía" })).toBeNull();
  await userEvent.tab();
  await expect(canvasElement.ownerDocument.activeElement).not.toHaveAttribute(
    "data-slot",
    "skeleton",
  );
});

export const LoadingNarrow = story(
  "Cargando · 390",
  { scenario: "loading", narrow: true },
  async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.findByRole("heading", { name: "Competiciones" })).resolves.toBeVisible();
    const status = await canvas.findByRole("status", { name: LOADING_LABEL });
    await expect(status.parentElement).toHaveAttribute("aria-busy", "true");
    await expect(canvasElement.querySelectorAll("[data-slot='skeleton']").length).toBeGreaterThan(
      0,
    );
  },
);

export const ReadyNarrow = story("Con datos · 390", { scenario: "ready", narrow: true });

export const Empty = story(
  "Sin competiciones",
  { scenario: "empty" },
  async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.findByRole("heading", { name: "Sin competiciones todavía" }),
    ).resolves.toBeVisible();
    const create = canvas.getByRole("button", { name: "Nueva competición" });
    await expect(create).toHaveAttribute("href", "/orgs/org-story/competitions/new");
    await expect(canvas.queryByRole("status", { name: LOADING_LABEL })).toBeNull();
    await userEvent.click(create);
    await expect(await canvas.findByText("Nueva competición")).toBeVisible();
  },
);

export const ErrorState = story("Error", { scenario: "error" }, async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(
    canvas.findByText(
      "No se pudieron cargar las competiciones. Comprueba la conexión e inténtalo de nuevo.",
    ),
  ).resolves.toBeVisible();
  await expect(canvas.queryByRole("status", { name: LOADING_LABEL })).toBeNull();
});

export const ForbiddenEmpty = story(
  "Vacío sin permiso",
  { scenario: "forbiddenEmpty" },
  async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.findByRole("heading", { name: "Sin competiciones todavía" }),
    ).resolves.toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Nueva competición" })).toBeNull();
  },
);
