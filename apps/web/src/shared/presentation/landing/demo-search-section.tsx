"use client";

import { ClubSearchPanel } from "@/modules/game-data/presentation/club-search-panel.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { LandingSection } from "@/shared/presentation/landing/landing-section.tsx";

export function DemoSearchSection() {
  const { t } = useI18n();
  return (
    <LandingSection
      id="demo"
      subtitle={t("landing.demo.subtitle")}
      title={t("landing.demo.title")}
      tone="band"
    >
      <ClubSearchPanel />
    </LandingSection>
  );
}
