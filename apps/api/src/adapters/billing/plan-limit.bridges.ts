import type { PremiumAnalyticsAccessPort } from "@futrob/analytics";
import type {
  CheckOrganizationFeatureUseCase,
  ConsumeOrganizationQuotaUseCase,
  ReleaseOrganizationQuotaUseCase,
  ResolveOrganizationEntitlementsUseCase,
} from "@futrob/billing";
import type { CompetitionFormat, CompetitionPlanLimitsPort } from "@futrob/competitions";
import { ProviderSyncQuotaExhausted, type ProviderSyncQuotaPort } from "@futrob/game-data";
import type { StaffSeatLimitPort } from "@futrob/organizations";
import { asOrganizationId, err, ok } from "@futrob/shared-kernel";
import type { PerformanceRankingAccessPort } from "@futrob/statistics";

const COMPETITION_FORMATS: readonly CompetitionFormat[] = [
  "league",
  "knockout",
  "groups-knockout",
  "league-playoffs",
];

/** Catalog formats are data; only those competitions knows become allowed formats. */
function competitionFormats(catalog: readonly string[]): readonly CompetitionFormat[] {
  return COMPETITION_FORMATS.filter((format) => catalog.includes(format));
}

export class BillingCompetitionPlanLimits implements CompetitionPlanLimitsPort {
  constructor(private readonly resolve: ResolveOrganizationEntitlementsUseCase) {}

  async limitsFor(organizationId: Parameters<CompetitionPlanLimitsPort["limitsFor"]>[0]) {
    const { entitlements } = (await this.resolve.execute(organizationId)).plan;
    return {
      maxActiveCompetitions: entitlements.limits.activeCompetitions,
      maxTeamsPerCompetition: entitlements.limits.teamsPerCompetition,
      allowedFormats: competitionFormats(entitlements.features.competitionFormats),
    };
  }
}

export class BillingStaffSeatLimit implements StaffSeatLimitPort {
  constructor(private readonly resolve: ResolveOrganizationEntitlementsUseCase) {}

  async staffSeatLimit(organizationId: Parameters<StaffSeatLimitPort["staffSeatLimit"]>[0]) {
    return (await this.resolve.execute(organizationId)).plan.entitlements.limits.staffMembers;
  }
}

/** One ledger row per job id: a retried reservation of the same job is a replay. */
export class BillingProviderSyncQuota implements ProviderSyncQuotaPort {
  constructor(
    private readonly deps: {
      readonly consume: ConsumeOrganizationQuotaUseCase;
      readonly release: ReleaseOrganizationQuotaUseCase;
    },
  ) {}

  async reserve(input: { readonly organizationId: string; readonly jobId: string }) {
    const consumed = await this.deps.consume.execute({
      organizationId: asOrganizationId(input.organizationId),
      quota: "provider_sync_jobs",
      usageKey: input.jobId,
    });
    if (consumed.isOk()) return ok(undefined);
    return err(
      new ProviderSyncQuotaExhausted({
        code: "game_data.sync_quota_exhausted",
        message: "The organization has used this month's provider sync quota",
        max: consumed.error.limit,
        used: consumed.error.used,
        resetsAt: consumed.error.resetsAt,
      }),
    );
  }

  release(input: { readonly organizationId: string; readonly jobId: string }) {
    return this.deps.release.execute({
      organizationId: asOrganizationId(input.organizationId),
      quota: "provider_sync_jobs",
      usageKey: input.jobId,
    });
  }
}

export class BillingPerformanceRankingAccess implements PerformanceRankingAccessPort {
  constructor(private readonly checkFeature: CheckOrganizationFeatureUseCase) {}

  async includesPerformanceRanking(
    organizationId: Parameters<PerformanceRankingAccessPort["includesPerformanceRanking"]>[0],
  ) {
    const checked = await this.checkFeature.execute({
      organizationId,
      feature: "performanceRanking",
    });
    return checked.isOk();
  }
}

export class BillingPremiumAnalyticsAccess implements PremiumAnalyticsAccessPort {
  constructor(private readonly resolve: ResolveOrganizationEntitlementsUseCase) {}

  async analyticsAccess(
    organizationId: Parameters<PremiumAnalyticsAccessPort["analyticsAccess"]>[0],
  ) {
    const { features } = (await this.resolve.execute(organizationId)).plan.entitlements;
    return { teamAndPlayer: features.premiumAnalytics, organizer: features.organizerAnalytics };
  }
}
