import type {
  MembershipSummary,
  PostAuthDestination,
} from "../../domain/value-objects/post-auth-destination.ts";

export function resolvePostAuthDestination(
  memberships: readonly MembershipSummary[],
): PostAuthDestination {
  if (memberships.length === 0) {
    return { kind: "onboarding" };
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
