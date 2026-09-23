import type { OnboardingStatusDto, PostAuthDestinationDto } from "@futrob/api-contracts";
import { FutrobApiError, type FutrobClient } from "@futrob/sdk";
import { getFutrobClient } from "@/modules/api/futrob-client";
import { getSession } from "./session-store.ts";

export const LOGIN_ROUTE = "/(auth)/login" as const;
export const HOME_ROUTE = "/(home)" as const;
export const ONBOARDING_ROUTE = "/(onboarding)/welcome" as const;

export type GateResult =
  | { readonly kind: "login"; readonly route: typeof LOGIN_ROUTE }
  | { readonly kind: "onboarding"; readonly route: string; readonly status: OnboardingStatusDto }
  | { readonly kind: "ready"; readonly route: string; readonly destination: PostAuthDestinationDto }
  | { readonly kind: "error"; readonly retryAfterSeconds?: number };

export function routeForOnboardingStatus(status: OnboardingStatusDto): string {
  const step = status.currentStep;
  if (!status.path || !step || step === "intention") return ONBOARDING_ROUTE;
  if (step === "game")
    return status.path === "player"
      ? "/(onboarding)/game-account"
      : status.path === "organization"
        ? "/(onboarding)/organization"
        : ONBOARDING_ROUTE;
  const steps = {
    player: ["game-account", "club", "review"],
    organization: ["organization", "competition", "game-account", "review"],
    invitation: ["invitation", "game-account", "review"],
  } as const;
  return steps[status.path].some((allowed) => allowed === step)
    ? `/(onboarding)/${step}`
    : ONBOARDING_ROUTE;
}

export function routeForPostAuthDestination(destination: PostAuthDestinationDto): string {
  switch (destination.kind) {
    case "personal":
      return "/player";
    case "organization":
      return `/orgs/${encodeURIComponent(destination.organizationId)}`;
    case "organizationPicker":
      return "/orgs";
    case "onboarding":
      return ONBOARDING_ROUTE;
  }
}

/** Server onboarding state is consulted before membership-derived destination. */
export async function resolveSessionGate(
  client: FutrobClient = getFutrobClient(),
): Promise<GateResult> {
  try {
    const session = await getSession();
    if (!session) return { kind: "login", route: LOGIN_ROUTE };
    const status = await client.identity.getOnboardingStatus();
    if (!status.completed) {
      return { kind: "onboarding", route: routeForOnboardingStatus(status), status };
    }
    const { destination } = await client.organizations.resolvePostAuthDestination();
    if (destination.kind === "onboarding") {
      return { kind: "onboarding", route: ONBOARDING_ROUTE, status };
    }
    return { kind: "ready", route: routeForPostAuthDestination(destination), destination };
  } catch (error) {
    if (error instanceof FutrobApiError && error.status === 401) {
      return { kind: "login", route: LOGIN_ROUTE };
    }
    return {
      kind: "error",
      retryAfterSeconds: error instanceof FutrobApiError ? error.retryAfterSeconds : undefined,
    };
  }
}
