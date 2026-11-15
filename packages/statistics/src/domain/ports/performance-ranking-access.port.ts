import type { OrganizationId } from "@futrob/shared-kernel";

/**
 * Whether the organization's plan includes the 0–100 performance ranking (ADR-0025).
 * Rankings keep rebuilding on every plan; only the read is gated.
 */
export interface PerformanceRankingAccessPort {
  includesPerformanceRanking(organizationId: OrganizationId): Promise<boolean>;
}
