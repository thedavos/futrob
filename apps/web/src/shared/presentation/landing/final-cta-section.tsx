"use client";

import { Button, Logo } from "@futrob/ui";
import { Link } from "@tanstack/react-router";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";

export function FinalCtaSection() {
  const { t } = useI18n();
  return (
    <>
      <section className="border-t border-border-subtle">
        <div className="mx-auto max-w-7xl px-5 py-24 text-center sm:px-8 lg:py-32">
          <div className="flex flex-col gap-6">
            <h2 className="typo-display mx-auto max-w-3xl text-balance">
              {t("landing.cta.title")}
            </h2>
            <p className="typo-subtitle mx-auto max-w-xl text-muted-foreground sm:text-base">
              {t("landing.cta.subtitle")}
            </p>
          </div>
          <div className="mt-12 flex flex-wrap justify-center gap-3">
            <Button render={<Link to="/signup" />}>{t("landing.cta.primary")}</Button>
            <Button render={<Link to="/login" />} variant="ghost">
              {t("landing.cta.secondary")}
            </Button>
          </div>
        </div>
      </section>
      <footer className="border-t border-border-subtle">
        <div className="mx-auto flex max-w-7xl flex-wrap items-start gap-x-8 gap-y-4 px-5 py-8 sm:px-8">
          <div className="flex min-w-0 items-start gap-2">
            <Logo className="mt-px h-5 w-auto shrink-0 text-muted-foreground" monochrome />
            <div className="flex min-w-0 flex-col gap-1">
              <span className="typo-caption text-muted-foreground">
                {t("landing.footer.tagline")}
              </span>
              <span className="typo-caption text-muted-foreground">
                {t("landing.footer.madeBy")}
              </span>
            </div>
          </div>
          <span className="typo-caption text-muted-foreground">{t("landing.footer.legal")}</span>
        </div>
      </footer>
    </>
  );
}
