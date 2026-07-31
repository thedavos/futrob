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
  GameAccountStep,
  GamePreferencesStep,
  IntentChoiceStep,
  InvitationStep,
  OnboardingReview,
} from "./onboarding-steps.tsx";

type OnboardingStoryPath =
  | "/onboarding/intention"
  | "/onboarding/game"
  | "/onboarding/invitation"
  | "/onboarding/game-account"
  | "/onboarding/review";

export interface StoryOnboardingGateway extends OnboardingGateway {
  readonly initialStatus: OnboardingStatusDto;
}

export function createFakeOnboardingGateway(input?: {
  path?: OnboardingPathDto | null;
  currentStep?: OnboardingStepDto;
  failSave?: boolean;
  failComplete?: boolean;
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
    async saveProgress(next) {
      if (input?.failSave) throw new Error("story.save_failed");
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
    async complete(next) {
      if (input?.failComplete) throw new Error("story.complete_failed");
      return {
        completed: true,
        completedAt: "2026-07-30T12:00:00.000Z",
        version: 1,
        path: next.path,
        currentStep: null,
      };
    },
    async resolveDestination() {
      return { kind: "personal" };
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
      path: "/onboarding/game",
      component: GamePreferencesStep,
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
  ];

  return createRouter({
    routeTree: rootRoute.addChildren(routes),
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });
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
