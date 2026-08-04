import { useMemo } from "react";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import type {
  OnboardingPathDto,
  OnboardingStatusDto,
  OnboardingStepDto,
} from "@futrob/api-contracts";
import type { OnboardingGateway } from "./onboarding-flow.tsx";
import { OnboardingFlowProvider } from "./onboarding-flow.tsx";
import {
  CompetitionStep,
  GameAccountStep,
  IntentChoiceStep,
  InvitationStep,
  OnboardingReview,
  OrganizationStep,
  TeamStep,
} from "./onboarding-steps.tsx";

type OnboardingStoryPath =
  | "/onboarding/intention"
  | "/onboarding/organization"
  | "/onboarding/competition"
  | "/onboarding/invitation"
  | "/onboarding/game-account"
  | "/onboarding/team"
  | "/onboarding/review";

export interface StoryOnboardingGateway extends OnboardingGateway {
  readonly initialStatus: OnboardingStatusDto;
}

export function createFakeOnboardingGateway(input?: {
  path?: OnboardingPathDto | null;
  currentStep?: OnboardingStepDto;
  failSave?: boolean;
  pendingSave?: boolean;
  failComplete?: boolean;
  organizationNameAvailable?: boolean;
  clubs?: readonly {
    readonly providerKey: "ea-clubs" | "manual" | "screenshot-ocr";
    readonly externalClubId: string;
    readonly name: string;
    readonly platform: string;
    readonly gameEdition: string;
  }[];
  searchError?: boolean;
}): StoryOnboardingGateway {
  let path = input?.path ?? null;
  let currentStep = input?.currentStep ?? "intention";
  return {
    get initialStatus() {
      return {
        completed: false,
        completedAt: null,
        version: null,
        path,
        currentStep,
      };
    },
    async checkOrganizationName() {
      return { available: input?.organizationNameAvailable ?? true };
    },
    async saveProgress(next) {
      if (input?.failSave) throw new Error("story.save_failed");
      if (input?.pendingSave) return await new Promise<OnboardingStatusDto>(() => undefined);
      path = next.path;
      currentStep = next.currentStep;
      return {
        completed: false,
        completedAt: null,
        version: null,
        path,
        currentStep,
      };
    },
    async createOrganization(request) {
      if (input?.failComplete) throw new Error("story.complete_failed");
      return {
        organizationId: "org-story",
        name: request.name,
        role: "organizer",
        competition: competitionDraftResponse(request.competition),
        profile: storyProfile,
        gameAccount: null,
        destination: {
          kind: "competition-setup",
          organizationId: "org-story",
          competitionId: "competition-story",
        },
      };
    },
    async acceptInvitation() {
      if (input?.failComplete) throw new Error("story.complete_failed");
      return {
        organizationId: "org-invited",
        organizationName: "Liga invitante",
        role: "player",
        competitionId: "competition-invited",
        competitionName: "Copa Invitación",
        profile: storyProfile,
        gameAccount: null,
        destination: {
          kind: "competition",
          organizationId: "org-invited",
          competitionId: "competition-invited",
        },
      };
    },
    async completePlayer() {
      if (input?.failComplete) throw new Error("story.complete_failed");
    },
    async searchExternalClubs(request) {
      if (input?.searchError) throw new Error("story.search_failed");
      const clubs = input?.clubs ?? [
        {
          providerKey: "ea-clubs" as const,
          externalClubId: "10754",
          name: "Fera Enjaulada",
          platform: request.platform ?? "common-gen5",
          gameEdition: request.gameEdition ?? "fc26",
        },
        {
          providerKey: "ea-clubs" as const,
          externalClubId: "22110",
          name: "Night Owls",
          platform: request.platform ?? "common-gen5",
          gameEdition: request.gameEdition ?? "fc26",
        },
      ];
      const query = request.query.trim().toLowerCase();
      return clubs.filter((club) => club.name.toLowerCase().includes(query));
    },
  };
}

function createOnboardingStoryRouter(
  initialPath: OnboardingStoryPath,
  gateway: StoryOnboardingGateway,
) {
  const rootRoute = createRootRoute({
    component: () => (
      <OnboardingFlowProvider gateway={gateway} initialStatus={gateway.initialStatus}>
        <Outlet />
      </OnboardingFlowProvider>
    ),
  });

  const routes = [
    createRoute({
      getParentRoute: () => rootRoute,
      path: "/onboarding/intention",
      component: IntentChoiceStep,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: "/onboarding/organization",
      component: OrganizationStep,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: "/onboarding/competition",
      component: CompetitionStep,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: "/onboarding/invitation",
      component: InvitationStep,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: "/onboarding/game-account",
      component: GameAccountStep,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: "/onboarding/team",
      component: TeamStep,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: "/onboarding/review",
      component: OnboardingReview,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: "/player",
      component: () => (
        <main className="p-8">
          <h1 className="typo-heading">Espacio personal</h1>
        </main>
      ),
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs",
      component: () => <main className="p-8">Organizaciones</main>,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId",
      component: () => <main className="p-8">Organización</main>,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId/competitions/$competitionId/setup",
      component: () => <main className="p-8">Configurar competición</main>,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId/competitions/$competitionId",
      component: () => <main className="p-8">Competición</main>,
    }),
  ];

  return createRouter({
    routeTree: rootRoute.addChildren(routes),
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });
}

const storyProfile = { id: "profile-story", createdAt: "2026-07-31T12:00:00.000Z" };

function competitionDraftResponse(input: {
  readonly name: string;
  readonly gameEdition: string;
  readonly platform: "playstation" | "xbox" | "pc" | "nintendo-switch-1" | "nintendo-switch-2";
  readonly region:
    | "america"
    | "south-america"
    | "north-central-america"
    | "europe"
    | "africa"
    | "asia"
    | "middle-east"
    | "oceania";
  readonly timeZone: string;
  readonly format: "league" | "knockout" | "groups-knockout" | "league-playoffs";
}) {
  return {
    competition: {
      id: "competition-story",
      organizationId: "org-story",
      ...input,
      status: "draft" as const,
      modality: "fc-clubs" as const,
      createdAt: "2026-07-31T12:00:00.000Z",
      updatedAt: "2026-07-31T12:00:00.000Z",
    },
    rules: {
      version: 1,
      regularStage: null,
      knockoutStage: null,
      awayGoalsEnabled: false as const,
      createdAt: "2026-07-31T12:00:00.000Z",
    },
  };
}

export function OnboardingStoryRouter({
  gateway,
  initialPath,
}: {
  gateway: StoryOnboardingGateway;
  initialPath: OnboardingStoryPath;
}) {
  const router = useMemo(
    () => createOnboardingStoryRouter(initialPath, gateway),
    [gateway, initialPath],
  );
  return <RouterProvider router={router} />;
}
