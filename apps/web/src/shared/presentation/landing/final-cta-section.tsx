"use client";

import { Button } from "@futrob/ui";
import { Link } from "@tanstack/react-router";

import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { LandingFooter } from "@/shared/presentation/landing/landing-footer.tsx";
import { LandingActions, LandingSection } from "@/shared/presentation/landing/landing-section.tsx";

export function FinalCtaSection() {
  const { t } = useI18n();
  return (
    <>
      <LandingSection
        copy={
          <LandingActions>
            <Button render={<Link to="/signup" />}>{t("landing.cta.primary")}</Button>
            <Button render={<Link to="/pricing" />} variant="outline">
              {t("landing.cta.secondary")}
            </Button>
          </LandingActions>
        }
        subtitle={t("landing.cta.subtitle")}
        title={t("landing.cta.title")}
      />
      <LandingFooter />
    </>
  );
}
