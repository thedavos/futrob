import { err, ok, type OrganizationId, type Result } from "@futrob/shared-kernel";
import { PremiumAnalyticsNotInPlan } from "../../domain/errors/premium-analytics.errors.ts";
import type {
  PremiumAnalyticsAccessPort,
  PremiumAnalyticsArea,
} from "../../domain/ports/premium-analytics-access.port.ts";

/**
 * Gate for premium analytics reads. No analytics feature exists yet; future use cases call
 * this after their capability check (ADR-0017) and before reading any snapshot.
 */
export class RequirePremiumAnalyticsUseCase {
  constructor(private readonly access: PremiumAnalyticsAccessPort) {}

  async execute(input: {
    readonly organizationId: OrganizationId;
    readonly area: PremiumAnalyticsArea;
  }): Promise<Result<void, PremiumAnalyticsNotInPlan>> {
    const access = await this.access.analyticsAccess(input.organizationId);
    const included =
      input.area === "team_and_player"
        ? access.teamAndPlayer
        : input.area === "organizer_basic"
          ? access.organizer !== "none"
          : access.organizer === "full";
    if (included) return ok(undefined);
    return err(
      new PremiumAnalyticsNotInPlan({
        code: "analytics.premium_not_in_plan",
        message: "The organization's plan does not include these analytics",
        area: input.area,
      }),
    );
  }
}
