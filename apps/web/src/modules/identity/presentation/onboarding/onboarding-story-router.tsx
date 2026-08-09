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
import { EA_SEARCH_PLATFORM } from "@futrob/api-contracts";
import { IdentityOnboardingClientError } from "@/modules/identity/presentation/identity-browser-client.ts";
import { QueryTestProvider } from "@/shared/presentation/query/query-test-utils.tsx";
import type { OnboardingGateway } from "./onboarding-flow.tsx";
import { OnboardingFlowProvider } from "./onboarding-flow.tsx";
import { CompetitionStep } from "./steps/competition-step.tsx";
import { GameAccountStep } from "./steps/game-account-step.tsx";
import { IntentChoiceStep } from "./steps/intention-step.tsx";
import { InvitationStep } from "./steps/invitation-step.tsx";
import { OrganizationStep } from "./steps/organization-step.tsx";
import { OnboardingReview } from "./steps/review-step.tsx";
import { TeamStep } from "./steps/team-step.tsx";

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

export type StoryExternalClub = {
  readonly providerKey: "ea-clubs" | "manual" | "screenshot-ocr";
  readonly externalClubId: string;
  readonly name: string;
  readonly platform: string;
  readonly gameEdition: string;
  readonly imageUrl: string | null;
};

const FC26_CREST_FERA =
  "https://eafc26.content.easports.com/fc/fltOnlineAssets/26E4D4D6-8DBB-4A9A-BD99-9C47D3AA341D/2026/fcweb/crests/256x256/l99160122.png";

/** Sample EA clubs for Storybook and tests. Names share "Fera" so one query matches all. */
export const STORY_EXTERNAL_CLUBS = [
  {
    providerKey: "ea-clubs",
    externalClubId: "10754",
    name: "Fera Enjaulada",
    platform: EA_SEARCH_PLATFORM.CROSS_GEN,
    gameEdition: "fc26",
    imageUrl: FC26_CREST_FERA,
  },
  {
    providerKey: "ea-clubs",
    externalClubId: "22110",
    name: "Fera Night Owls",
    platform: EA_SEARCH_PLATFORM.CROSS_GEN,
    gameEdition: "fc26",
    imageUrl: null,
  },
  {
    providerKey: "ea-clubs",
    externalClubId: "33021",
    name: "Fera Barranco",
    platform: EA_SEARCH_PLATFORM.CROSS_GEN,
    gameEdition: "fc26",
    imageUrl: null,
  },
] as const satisfies readonly StoryExternalClub[];

export function storyExternalClubs(count: 1 | 2 | 3): readonly StoryExternalClub[] {
  return STORY_EXTERNAL_CLUBS.slice(0, count);
}

export function createFakeOnboardingGateway(input?: {
  path?: OnboardingPathDto | null;
  currentStep?: OnboardingStepDto;
  failSave?: boolean;
  pendingSave?: boolean;
  failComplete?: boolean;
  /** Typed finish failure for invitation/org/player complete calls. */
  completeError?: IdentityOnboardingClientError;
  organizationNameAvailable?: boolean;
  clubs?: readonly StoryExternalClub[];
  searchError?: boolean;
  onSearchExternalClubs?: (
    request: Parameters<OnboardingGateway["searchExternalClubs"]>[0],
  ) => void;
}): StoryOnboardingGateway {
  let path = input?.path ?? null;
  let currentStep = input?.currentStep ?? "intention";
  const throwCompleteFailure = () => {
    if (input?.completeError) throw input.completeError;
    if (input?.failComplete) throw new Error("story.complete_failed");
  };
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
      throwCompleteFailure();
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
      throwCompleteFailure();
      return {
        organizationId: "org-invited",
        organizationName: "Liga invitante",
        role: "member",
        competitionRole: "player",
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
      throwCompleteFailure();
    },
    async searchExternalClubs(request) {
      input?.onSearchExternalClubs?.(request);
      if (input?.searchError) throw new Error("story.search_failed");
      const clubs = input?.clubs ?? [...STORY_EXTERNAL_CLUBS];
      const query = request.query.trim().toLowerCase();
      return clubs
        .map((club) => ({
          ...club,
          platform: request.platform ?? club.platform,
          gameEdition: request.gameEdition ?? club.gameEdition,
        }))
        .filter((club) => club.name.toLowerCase().includes(query));
    },
  };
}

function createOnboardingStoryRouter(
  initialPath: OnboardingStoryPath,
  gateway: StoryOnboardingGateway,
  bootstrap: "cold" | "persisted" = "persisted",
) {
  const rootRoute = createRootRoute({
    component: () => (
      <QueryTestProvider>
        <OnboardingFlowProvider
          bootstrap={bootstrap}
          gateway={gateway}
          initialStatus={gateway.initialStatus}
        >
          <Outlet />
        </OnboardingFlowProvider>
      </QueryTestProvider>
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
      maxRosterSize: null,
      createdAt: "2026-07-31T12:00:00.000Z",
    },
  };
}

export function OnboardingStoryRouter({
  gateway,
  initialPath,
  bootstrap = "persisted",
}: {
  gateway: StoryOnboardingGateway;
  initialPath: OnboardingStoryPath;
  bootstrap?: "cold" | "persisted";
}) {
  const router = useMemo(
    () => createOnboardingStoryRouter(initialPath, gateway, bootstrap),
    [bootstrap, gateway, initialPath],
  );
  return <RouterProvider router={router} />;
}
