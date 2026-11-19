"use client";

import type { OrganizationPlan } from "@futrob/api-contracts";

import { PricingPlanGrid } from "@/modules/billing/presentation/pricing-plan-grid.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { LandingSection } from "@/shared/presentation/landing/landing-section.tsx";

export function PricingSection({ plans }: { readonly plans: readonly OrganizationPlan[] | null }) {
  const { t } = useI18n();
  return (
    <LandingSection
      id="precios"
      layout="stacked"
      subtitle={t("landing.pricing.subtitle")}
      title={t("landing.pricing.title")}
    >
      <PricingPlanGrid label={t("landing.pricing.title")} plans={plans} />
    </LandingSection>
  );
}
