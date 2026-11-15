import type { OrganizationId } from "@futrob/shared-kernel";

export type OrganizerAnalyticsTier = "none" | "basic" | "full";

export type PremiumAnalyticsArea = "team_and_player" | "organizer_basic" | "organizer_full";

/** What the organization's plan includes (ADR-0025, DEC-044); implemented by the deployable. */
export interface PremiumAnalyticsAccessPort {
  analyticsAccess(organizationId: OrganizationId): Promise<{
    readonly teamAndPlayer: boolean;
    readonly organizer: OrganizerAnalyticsTier;
  }>;
}
