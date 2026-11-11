import {
  isOnboardingStepAllowed,
  type OnboardingStatusDto,
  type PostAuthDestinationDto,
} from "@futrob/api-contracts";
import { accountDeletionGate, FutrobApiError, type FutrobClient } from "@futrob/sdk";
import { getFutrobClient } from "@/modules/api/futrob-client";
import { getSession } from "./session-store.ts";

export const LOGIN_ROUTE = "/(auth)/login" as const;
export const HOME_ROUTE = "/(home)" as const;
export const ONBOARDING_ROUTE = "/(onboarding)/welcome" as const;
export const ACCOUNT_DELETION_SCHEDULED_ROUTE = "/account/deletion-scheduled" as const;

export type GateResult =
  | { readonly kind: "login"; readonly route: typeof LOGIN_ROUTE }
  | { readonly kind: "onboarding"; readonly route: string; readonly status: OnboardingStatusDto }
  | { readonly kind: "ready"; readonly route: string; readonly destination: PostAuthDestinationDto }
  | {
      /** Grace period (ADR-0028): the account only sees its deletion date and how to cancel. */
      readonly kind: "deletion-scheduled";
      readonly route: typeof ACCOUNT_DELETION_SCHEDULED_ROUTE;
      readonly scheduledFor: Date;
    }
  | { readonly kind: "error"; readonly retryAfterSeconds?: number };

export function routeForOnboardingStatus(status: OnboardingStatusDto): string {
  const step = status.currentStep;
  if (!step || step === "intention" || !isOnboardingStepAllowed(status.path, step)) {
    return ONBOARDING_ROUTE;
  }
  return `/(onboarding)/${step}`;
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
    // Only finished accounts reach the account screens, so only they can be scheduled.
    const deletion = accountDeletionGate(await client.identity.getAccountDeletion());
    if (deletion.kind === "scheduled") {
      return {
        kind: "deletion-scheduled",
        route: ACCOUNT_DELETION_SCHEDULED_ROUTE,
        scheduledFor: deletion.scheduledFor,
      };
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
