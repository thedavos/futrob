"use client";

import { Button } from "@futrob/ui";
import { Link } from "@tanstack/react-router";

import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { EncounterBoard } from "@/shared/presentation/landing/encounter-board.tsx";
import { LandingActions, LandingSection } from "@/shared/presentation/landing/landing-section.tsx";

export function LandingHero() {
  const { t } = useI18n();
  return (
    <LandingSection
      as="h1"
      copy={
        <LandingActions>
          <Button render={<Link to="/signup" />}>{t("landing.hero.cta.primary")}</Button>
          <Button render={<a href="#mecanismo" />} variant="outline">
            {t("landing.hero.cta.secondary")}
          </Button>
        </LandingActions>
      }
      subtitle={t("landing.hero.subtitle")}
      title={t("landing.hero.title")}
    >
      <EncounterBoard />
    </LandingSection>
  );
}
