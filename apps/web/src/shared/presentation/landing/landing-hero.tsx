"use client";

import { Button } from "@futrob/ui";
import { Link } from "@tanstack/react-router";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { HeroBracket } from "@/shared/presentation/landing/hero-bracket.tsx";

export function LandingHero() {
  const { t } = useI18n();
  return (
    <section className="flex min-h-0 flex-1 flex-col justify-center">
      <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-5 py-8 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <div className="max-w-xl">
          <p className="typo-label font-semibold uppercase text-primary tracking-wide">
            {t("landing.hero.eyebrow")}
          </p>
          <div className="mt-2 flex flex-col gap-6">
            <h1 className="text-5xl leading-none font-bold tracking-tight text-balance sm:text-6xl">
              {t("landing.hero.titleLead")}{" "}
              <span className="text-primary">{t("landing.hero.titleHighlight")}</span>.
            </h1>
            <p className="typo-body max-w-[58ch] text-muted-foreground sm:text-lg">
              {t("landing.hero.subtitleLead")}
              <br />
              {t("landing.hero.subtitleRest")}
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button render={<Link to="/signup" />}>{t("landing.hero.cta.primary")}</Button>
            <Button render={<a href="#mecanismo" />} variant="outline">
              {t("landing.hero.cta.secondary")}
            </Button>
          </div>
        </div>
        <figure className="min-w-0">
          <HeroBracket />
        </figure>
      </div>
    </section>
  );
}
