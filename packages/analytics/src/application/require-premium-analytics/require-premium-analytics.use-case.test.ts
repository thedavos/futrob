import { asOrganizationId } from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import type {
  OrganizerAnalyticsTier,
  PremiumAnalyticsArea,
} from "../../domain/ports/premium-analytics-access.port.ts";
import { RequirePremiumAnalyticsUseCase } from "./require-premium-analytics.use-case.ts";

const organizationId = asOrganizationId("org-1");

function gate(teamAndPlayer: boolean, organizer: OrganizerAnalyticsTier) {
  return new RequirePremiumAnalyticsUseCase({
    analyticsAccess: async () => ({ teamAndPlayer, organizer }),
  });
}

describe("RequirePremiumAnalyticsUseCase", () => {
  it.each<[string, boolean, OrganizerAnalyticsTier, PremiumAnalyticsArea, boolean]>([
    ["free", false, "none", "team_and_player", false],
    ["free", false, "none", "organizer_basic", false],
    ["pro", true, "basic", "team_and_player", true],
    ["pro", true, "basic", "organizer_basic", true],
    ["pro", true, "basic", "organizer_full", false],
    ["league", true, "full", "organizer_full", true],
  ])("%s plan grants %s/%s for %s: %s", async (_plan, team, organizer, area, allowed) => {
    const result = await gate(team, organizer).execute({ organizationId, area });

    expect(result.isOk()).toBe(allowed);
    if (!result.isOk()) {
      expect(result.error).toMatchObject({ code: "analytics.premium_not_in_plan", area });
    }
  });
});
