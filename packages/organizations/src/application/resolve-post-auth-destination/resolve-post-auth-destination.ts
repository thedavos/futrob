import type {
  MembershipSummary,
  PostAuthDestination,
} from "../../domain/value-objects/post-auth-destination.ts";

export function resolvePostAuthDestination(
  memberships: readonly MembershipSummary[],
  onboardingCompleted: boolean,
): PostAuthDestination {
  if (!onboardingCompleted) {
    return { kind: "onboarding" };
  }

  if (memberships.length === 0) {
    return { kind: "personal" };
  }

  if (memberships.length === 1) {
    return {
      kind: "organization",
      organizationId: memberships[0]!.organizationId,
    };
  }

  return {
    kind: "organizationPicker",
    memberships: [...memberships],
  };
}
