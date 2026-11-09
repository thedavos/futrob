import { useState } from "react";
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
import * as stylex from "@stylexjs/stylex";
import { applyStyles, Button, TooltipProvider } from "@futrob/ui";
import type { EffectiveAccessDto } from "@futrob/api-contracts";
import { expect, spyOn, userEvent, within } from "storybook/test";
import { SHELL_PERMISSIONS } from "@/context/permissions.ts";
import { configureCompetitionsStory } from "@/modules/competitions/presentation/competitions-story-client.ts";
import { OrganizationHomePage } from "@/modules/organizations/presentation/organization-home-page.tsx";
import {
  configureOrganizationsStory,
  STORY_ORGANIZATION_PROFILE,
} from "@/modules/organizations/presentation/organizations-story-client.ts";
import { configurePlayerStory } from "@/modules/teams/presentation/player-story-client.ts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { AuthenticatedContent } from "@/shared/presentation/shell/authenticated-content.tsx";
import { OnboardingFlowProvider } from "../../onboarding-flow.tsx";
import { createFakeOnboardingGateway } from "../../onboarding-story-router.tsx";
import { storyResumeDraftStore } from "../../onboarding-story-draft.ts";
import { OrganizationStep } from "../../steps/organization-step.tsx";
import { GameAccountStep } from "../../steps/game-account-step.tsx";
import { OnboardingReview } from "../../steps/review-step.tsx";
import "@/styles.css";

const ORG_ID = "org-story";
const ORG_NAME = "Liga Norte";

const styles = stylex.create({
  replay: {
    display: "flex",
    justifyContent: "flex-end",
    paddingTop: "1rem",
  },
});

function CompletionRun({
  onReplay,
  slowDestination,
  stalledData,
}: {
  readonly onReplay: () => void;
  readonly slowDestination: boolean;
  readonly stalledData: boolean;
}) {
  const [environment] = useState(() => {
    configureOrganizationsStory({
      profile: { ...STORY_ORGANIZATION_PROFILE, name: ORG_NAME },
      // The destination must show the identity returned by creation even if its
      // separate profile endpoint has not answered yet.
      profileLoad: "pending",
      memberships: {
        memberships: [
          {
            organizationId: ORG_ID,
            organizationName: ORG_NAME,
            organizationSlug: "liga-norte",
            organizationLogo: { kind: "monogram" },
            role: "organizer",
          },
        ],
      },
    });
    configureCompetitionsStory({
      competitions: { competitions: [] },
      organizationCompetitions: stalledData ? "pending" : { competitions: [] },
      organizationTeams: stalledData ? "pending" : { teams: [] },
    });
    configurePlayerStory({});
    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity, refetchOnWindowFocus: false },
        mutations: { retry: false },
      },
    });
    client.setQueryData(queryKeys.organizations.mine(), { memberships: [] });
    const gateway = createFakeOnboardingGateway({ path: "organization", currentStep: "review" });
    const draftStore = storyResumeDraftStore(gateway.initialStatus);

    const root = createRootRoute({
      component: () => (
        <AuthenticatedContent>
          <Outlet />
        </AuthenticatedContent>
      ),
    });
    const onboarding = createRoute({
      getParentRoute: () => root,
      path: "/onboarding",
      component: () => (
        <OnboardingFlowProvider
          gateway={gateway}
          initialStatus={gateway.initialStatus}
          draftStore={draftStore}
        >
          <Outlet />
        </OnboardingFlowProvider>
      ),
    });
    const review = createRoute({
      getParentRoute: () => onboarding,
      path: "/review",
      component: OnboardingReview,
    });
    const organization = createRoute({
      getParentRoute: () => onboarding,
      path: "/organization",
      component: OrganizationStep,
    });
    const account = createRoute({
      getParentRoute: () => onboarding,
      path: "/game-account",
      component: GameAccountStep,
    });
    const dashboard = createRoute({
      getParentRoute: () => root,
      path: "/orgs/$orgId",
      loader: () =>
        slowDestination ? new Promise<void>((resolve) => setTimeout(resolve, 1200)) : undefined,
      pendingMs: Infinity,
      component: () => (
        <>
          <OrganizationHomePage organizationId={ORG_ID} />
          <div {...applyStyles(styles.replay)}>
            <Button onClick={onReplay} variant="outline">
              Repetir transición
            </Button>
          </div>
        </>
      ),
    });
    const createCompetition = createRoute({
      getParentRoute: () => root,
      path: "/orgs/$orgId/competitions/new",
      component: () => <h1>Crear competición</h1>,
    });
    const router = createRouter({
      routeTree: root.addChildren([
        onboarding.addChildren([review, organization, account]),
        dashboard,
        createCompetition,
      ]),
      history: createMemoryHistory({ initialEntries: ["/onboarding/review"] }),
    });
    return { client, router };
  });

  return (
    <QueryClientProvider client={environment.client}>
      <I18nProvider initialLocale="es" persistLocale={async () => undefined}>
        <TooltipProvider>
          <RouterProvider router={environment.router} />
        </TooltipProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

function CompletionStory({
  slowDestination = false,
  stalledData = false,
}: {
  readonly slowDestination?: boolean;
  readonly stalledData?: boolean;
}) {
  const [attempt, setAttempt] = useState(0);
  return (
    <CompletionRun
      key={attempt}
      slowDestination={slowDestination}
      stalledData={stalledData}
      onReplay={() => setAttempt((current) => current + 1)}
    />
  );
}

const meta = {
  title: "Product/Onboarding/Completion",
  component: CompletionStory,
  parameters: { layout: "fullscreen" },
  beforeEach: () => {
    const originalFetch = globalThis.fetch;
    const mock = spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = new URL(
        typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
        location.origin,
      );
      if (url.pathname === "/api/v1/authorization/effective-access") {
        const organizationId = url.searchParams.get("organizationId");
        const permissions = url.searchParams.get("permissions")?.split(",") ?? SHELL_PERMISSIONS;
        return Response.json({
          actorId: "actor-story",
          scope: organizationId ? { organizationId } : {},
          roles: [],
          permissions: permissions.map((permission) => ({
            permission,
            allowed: organizationId !== null,
            decidedAt: organizationId ? "organization" : "platform",
          })),
        } satisfies EffectiveAccessDto);
      }
      if (url.pathname.endsWith("/activities"))
        return Response.json({ activities: [], nextCursor: null });
      if (url.pathname.startsWith("/api/"))
        throw new Error(`Unmocked completion story request: ${url.pathname}`);
      return originalFetch(input, init);
    });
    return () => mock.mockRestore();
  },
} satisfies Meta<typeof CompletionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const OrganizationToDashboard: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("heading", { name: "Confirma tu configuración" }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Crear organización" }));
    await expect(
      await canvas.findByRole("heading", { name: ORG_NAME }, { timeout: 5000 }),
    ).toBeVisible();
    await expect(
      await canvas.findByRole("heading", { name: "Tu organización empieza aquí" }),
    ).toBeVisible();
    await expect(canvas.getByRole("complementary", { name: "Navegación principal" })).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Repetir transición" }));
    await expect(
      await canvas.findByRole("heading", { name: "Confirma tu configuración" }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Crear organización" }));
    await expect(await canvas.findByRole("heading", { name: ORG_NAME })).toBeVisible();
    await expect(canvas.queryByRole("alert")).toBeNull();
  },
};

export const SlowDestination: Story = {
  args: { slowDestination: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const mixedFrames: string[] = [];
    const observer = new MutationObserver(() => {
      if (
        canvas.queryByRole("complementary", { name: "Navegación principal" }) &&
        canvas.queryByRole("heading", { name: "Confirma tu configuración" })
      )
        mixedFrames.push("onboarding inside dashboard");
    });
    observer.observe(canvasElement, { childList: true, subtree: true });
    try {
      await userEvent.click(await canvas.findByRole("button", { name: "Crear organización" }));
      await expect(
        canvas.getByRole("heading", { name: "Confirma tu configuración" }),
      ).toBeVisible();
      await expect(canvas.getByRole("button", { name: "Crear organización" })).toBeDisabled();
      await expect(canvas.queryByRole("button", { name: "Entrar a mi espacio" })).toBeNull();
      await expect(
        canvas.queryByRole("complementary", { name: "Navegación principal" }),
      ).toBeNull();
      await expect(
        await canvas.findByRole("heading", { name: ORG_NAME }, { timeout: 5000 }),
      ).toBeVisible();
      await expect(canvas.queryByRole("heading", { name: "Confirma tu configuración" })).toBeNull();
      await expect(
        canvas.getByRole("complementary", { name: "Navegación principal" }),
      ).toBeVisible();
      await expect(mixedFrames).toEqual([]);
    } finally {
      observer.disconnect();
    }
  },
};

export const StalledDashboard: Story = {
  args: { stalledData: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Crear organización" }));
    await expect(canvas.getByRole("button", { name: "Crear organización" })).toBeDisabled();
    await expect(
      await canvas.findByRole("heading", { name: ORG_NAME }, { timeout: 6000 }),
    ).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Repetir transición" })).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Crear organización" })).toBeNull();
    await expect(canvas.queryByRole("alert")).toBeNull();
  },
};
