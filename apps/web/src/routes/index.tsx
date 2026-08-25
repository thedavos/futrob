import { createFileRoute } from "@tanstack/react-router";
import { DEFAULT_LOCALE } from "@/shared/presentation/i18n/locale.ts";
import { getUiLocale } from "@/shared/presentation/i18n/locale.functions.ts";
import { createTranslator } from "@/shared/presentation/i18n/translate.ts";
import { AudiencesSection } from "@/shared/presentation/landing/audiences-section.tsx";
import { DemoSearchSection } from "@/shared/presentation/landing/demo-search-section.tsx";
import { EncounterRowsSection } from "@/shared/presentation/landing/encounter-rows-section.tsx";
import { FinalCtaSection } from "@/shared/presentation/landing/final-cta-section.tsx";
import { LandingHeader } from "@/shared/presentation/landing/landing-header.tsx";
import { LandingHero } from "@/shared/presentation/landing/landing-hero.tsx";
import { MechanismSection } from "@/shared/presentation/landing/mechanism-section.tsx";

export const Route = createFileRoute("/")({
  loader: () => getUiLocale(),
  head: ({ loaderData }) => {
    const t = createTranslator(loaderData ?? DEFAULT_LOCALE);
    return {
      meta: [
        { title: t("landing.meta.title") },
        { name: "description", content: t("landing.meta.description") },
      ],
    };
  },
  component: HomePage,
});

function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-dvh flex-col">
        <LandingHeader />
        <LandingHero />
      </div>
      <EncounterRowsSection />
      <MechanismSection />
      <DemoSearchSection />
      <AudiencesSection />
      <FinalCtaSection />
    </main>
  );
}
