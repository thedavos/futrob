import type { MembershipSummaryDto } from "@futrob/api-contracts";

/**
 * How the viewer relates to an explored competition, as on web: organizers and staff of its
 * organization manage it, members of one of its teams participate, everyone else visits.
 */
export type ExploreViewerRelation = "manager" | "participant" | "visitor";

export function exploreViewerRelation(input: {
  readonly organizationId: string;
  readonly competitionId: string;
  readonly memberships: readonly Pick<MembershipSummaryDto, "organizationId" | "role">[];
  /** `/competitions/mine` entries (or anything carrying the competition id). */
  readonly accessibleCompetitions: readonly { readonly competition: { readonly id: string } }[];
}): ExploreViewerRelation {
  const membership = input.memberships.find((item) => item.organizationId === input.organizationId);
  if (membership?.role === "organizer" || membership?.role === "staff") return "manager";
  if (input.accessibleCompetitions.some((item) => item.competition.id === input.competitionId)) {
    return "participant";
  }
  return "visitor";
}
