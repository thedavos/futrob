"use client";

import { ClubSearchPanel } from "@/modules/game-data/presentation/club-search-panel.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";

export function DemoSearchSection() {
  const { t } = useI18n();
  return (
    <section className="border-t border-border-subtle bg-muted/50" id="demo">
      <div className="mx-auto grid max-w-7xl scroll-mt-8 items-center gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:py-28">
        <div className="flex max-w-md flex-col gap-6">
          <h2 className="typo-display text-balance">{t("landing.demo.title")}</h2>
          <p className="typo-subtitle text-muted-foreground sm:text-base">
            {t("landing.demo.subtitle")}
          </p>
        </div>
        <ClubSearchPanel />
      </div>
    </section>
  );
}
