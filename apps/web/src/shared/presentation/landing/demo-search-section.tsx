"use client";

import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { LandingSearch } from "@/shared/presentation/landing/landing-search.tsx";
import { LandingSection } from "@/shared/presentation/landing/landing-section.tsx";

/**
 * Landing search of an EA club or a competition with open registration, in one column; each
 * result signs up with what it names already chosen.
 */
export function DemoSearchSection() {
  const { t } = useI18n();
  return (
    <LandingSection
      copy={<LandingSearch />}
      id="demo"
      layout="centered"
      subtitle={t("landing.demo.subtitle")}
      title={t("landing.demo.title")}
      tone="band"
    />
  );
}
