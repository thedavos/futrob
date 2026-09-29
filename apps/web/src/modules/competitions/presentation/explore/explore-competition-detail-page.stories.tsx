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
import { expect, userEvent, within } from "storybook/test";
import * as stylex from "@stylexjs/stylex";
import { applyProps } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { configureCompetitionsStory } from "@/modules/competitions/presentation/competitions-story-client.ts";
import { configureOrganizationsStory } from "@/modules/organizations/presentation/organizations-story-client.ts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { ExploreCompetitionDetailPage } from "./explore-competition-detail-page.tsx";
import {
  exploreCompetitionFixture,
  exploreMembershipsFixture,
} from "./explore-competitions.fixtures.ts";

const styles = stylex.create({
  frame: {
    display: "flex",
    minHeight: "100svh",
    flexDirection: "column",
    backgroundColor: colors.background,
    paddingInline: "1.5rem",
    paddingBlock: "1.5rem",
  },
});

const SCENARIO_IDS = [
  "ready",
  "loading",
  "notFound",
  "error",
  "manager",
  "registrationOpen",
  "applicationPending",
  "applicationApproved",
  "applicationRejected",
] as const;
type ScenarioId = (typeof SCENARIO_IDS)[number];

type StoryArgs = {
  readonly scenario: ScenarioId;
};

const registrationFixture = exploreCompetitionFixture({
  competition: { status: "registration" },
  approvedTeamCount: 3,
});

const APPLICATION_STATUS = {
  applicationPending: "pending",
  applicationApproved: "approved",
  applicationRejected: "rejected",
} as const;

function configureScenario(id: ScenarioId): void {
  configureOrganizationsStory({ memberships: { memberships: [] } });
  configureCompetitionsStory({
    exploreDetail: exploreCompetitionFixture(),
    application: { application: null },
  });
  switch (id) {
    case "ready":
      return;
    case "loading":
      configureCompetitionsStory({ exploreDetail: "pending" });
      return;
    case "notFound":
      configureCompetitionsStory({ exploreDetail: "not-found" });
      return;
    case "error":
      configureCompetitionsStory({ exploreDetail: "error" });
      return;
    case "manager":
      configureOrganizationsStory({ memberships: exploreMembershipsFixture("organizer") });
      return;
    case "registrationOpen":
      configureCompetitionsStory({ exploreDetail: registrationFixture });
      return;
    case "applicationPending":
    case "applicationApproved":
    case "applicationRejected":
      configureCompetitionsStory({
        exploreDetail: registrationFixture,
        application: {
          application: {
            entryId: "entry-story",
            status: APPLICATION_STATUS[id],
            teamId: "team-story",
            teamName: "Los Postulantes",
            createdAt: "2026-09-27T12:00:00.000Z",
          },
        },
      });
      return;
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

function DetailStoryShell({ scenario }: { readonly scenario: ScenarioId }) {
  const client = useMemo(() => {
    configureScenario(scenario);
    return new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity, gcTime: Infinity },
        mutations: { retry: false },
      },
    });
  }, [scenario]);

  const router = useMemo(() => {
    const rootRoute = createRootRoute({ component: Outlet });
    const detailRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/player/competitions/$competitionId",
      component: function DetailRoutePage() {
        const { competitionId } = detailRoute.useParams();
        return <ExploreCompetitionDetailPage competitionId={competitionId} />;
      },
    });
    const exploreRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/player/competitions/explore",
      component: () => <p>Explorar</p>,
    });
    const competitionsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/player/competitions",
      component: () => <p>Mis competiciones</p>,
    });
    const manageRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId/competitions/$competitionId",
      component: () => <p>Gestionar competición</p>,
    });
    return createRouter({
      routeTree: rootRoute.addChildren([detailRoute, exploreRoute, competitionsRoute, manageRoute]),
      history: createMemoryHistory({
        initialEntries: ["/player/competitions/competition-liga-nocturna"],
      }),
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
  title: "Product/Player/Competitions/Detail",
  parameters: { layout: "fullscreen" },
  args: { scenario: "ready" },
  argTypes: {
    scenario: { control: "select", options: [...SCENARIO_IDS] },
  },
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

export const Ready: Story = {
  render: (args) => <DetailStoryShell key={args.scenario} scenario={args.scenario} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("heading", { name: "Liga Nocturna" })).toBeVisible();
    await expect(canvas.getByText("Liga Cuervos")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Compartir" })).toBeVisible();
  },
};

export const Loading: Story = {
  args: { scenario: "loading" },
  render: Ready.render,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("status", { name: "Cargando competición…" })).toBeVisible();
  },
};

export const NotFound: Story = {
  args: { scenario: "notFound" },
  render: Ready.render,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("heading", { name: "Competición no disponible" }),
    ).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Volver a explorar" })).toHaveAttribute(
      "href",
      "/player/competitions/explore",
    );
  },
};

export const Manager: Story = {
  args: { scenario: "manager" },
  render: Ready.render,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const manage = await canvas.findByRole("link", { name: "Gestionar" });
    await expect(manage).toHaveAttribute(
      "href",
      "/orgs/org-cuervos/competitions/competition-liga-nocturna",
    );
  },
};

export const Mobile: Story = {
  args: { scenario: "ready" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: Ready.render,
};

export const RegistrationOpen: Story = {
  args: { scenario: "registrationOpen" },
  render: Ready.render,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Inscripciones abiertas")).toBeVisible();
    const submit = await canvas.findByRole("button", { name: "Enviar solicitud" });
    await expect(submit).toBeDisabled();
    await userEvent.type(canvas.getByLabelText("Nombre del equipo"), "Los Postulantes");
    await userEvent.click(submit);
    await expect(await canvas.findByText("Solicitud enviada")).toBeVisible();
    await expect(
      canvas.getByText("Los Postulantes espera la revisión del organizador."),
    ).toBeVisible();
  },
};

export const ApplicationPending: Story = {
  args: { scenario: "applicationPending" },
  render: Ready.render,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Solicitud enviada")).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Enviar solicitud" })).toBeNull();
  },
};

export const ApplicationApproved: Story = {
  args: { scenario: "applicationApproved" },
  render: Ready.render,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Equipo inscrito")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Ir a la competición" })).toHaveAttribute(
      "href",
      "/player/competitions/competition-liga-nocturna",
    );
  },
};

export const ApplicationRejected: Story = {
  args: { scenario: "applicationRejected" },
  render: Ready.render,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Solicitud rechazada")).toBeVisible();
  },
};
