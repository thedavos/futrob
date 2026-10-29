import { TaggedError } from "@futrob/shared-kernel";
import type { PremiumAnalyticsArea } from "../ports/premium-analytics-access.port.ts";

/** Safe denial for AC-ANA-001: it names the missing area, never the data behind it. */
export class PremiumAnalyticsNotInPlan extends TaggedError("PremiumAnalyticsNotInPlan")<{
  code: "analytics.premium_not_in_plan";
  message: string;
  area: PremiumAnalyticsArea;
}> {}
