export type ExploreViewerRelation = "manager" | "participant" | "visitor";

export const EXPLORE_ACTIONS = {
  manager: { view: true, share: true, manage: true, participating: false },
  participant: { view: true, share: true, manage: false, participating: true },
  visitor: { view: true, share: true, manage: false, participating: false },
} as const;

export function exploreViewerRelation(input: {
  readonly organizationId: string;
  readonly competitionId: string;
  readonly memberships: readonly {
    readonly organizationId: string;
    readonly role: "organizer" | "staff" | "member";
  }[];
  readonly accessibleCompetitionIds: readonly string[];
}): ExploreViewerRelation {
  const membership = input.memberships.find((item) => item.organizationId === input.organizationId);
  if (membership?.role === "organizer" || membership?.role === "staff") return "manager";
  if (input.accessibleCompetitionIds.includes(input.competitionId)) return "participant";
  return "visitor";
}
