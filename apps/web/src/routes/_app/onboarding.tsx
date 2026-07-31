import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import type { PostAuthDestinationDto } from "@futrob/api-contracts";
import { OnboardingFlowProvider } from "@/modules/identity/presentation/onboarding/onboarding-flow.tsx";
import { getOnboardingBootstrap } from "@/modules/identity/server/get-onboarding-bootstrap.functions.ts";
import { RouteLoadError, RoutePendingState } from "@/shared/presentation/route-load-state.tsx";

export const Route = createFileRoute("/_app/onboarding")({
  loader: async () => {
    const bootstrap = await getOnboardingBootstrap();

    if (bootstrap.destination) {
      redirectToPostAuthDestination(bootstrap.destination);
    }

    return { initialStatus: bootstrap.status };
  },
  shouldReload: ({ cause }) => cause === "enter",
  pendingComponent: () => <RoutePendingState message="Recuperando tu progreso…" />,
  errorComponent: (props) => (
    <RouteLoadError {...props} message="No pudimos recuperar tu progreso. Inténtalo nuevamente." />
  ),
  component: OnboardingLayout,
});

function OnboardingLayout() {
  const { initialStatus } = Route.useLoaderData();

  return (
    <OnboardingFlowProvider initialStatus={initialStatus}>
      <Outlet />
    </OnboardingFlowProvider>
  );
}

function redirectToPostAuthDestination(destination: PostAuthDestinationDto): never {
  switch (destination.kind) {
    case "organization":
      throw redirect({
        to: "/orgs/$orgId",
        params: { orgId: destination.organizationId },
        replace: true,
      });
    case "organizationPicker":
      throw redirect({ to: "/orgs", replace: true });
    case "personal":
      throw redirect({ to: "/player", replace: true });
    case "onboarding":
      throw redirect({ to: "/onboarding/intention", replace: true });
  }
}
