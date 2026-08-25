import * as stylex from "@stylexjs/stylex";
import { applyStyles } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
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

const styles = stylex.create({
  main: {
    minHeight: "100vh",
    backgroundColor: colors.background,
    color: colors.foreground,
  },
  heroShell: {
    display: "flex",
    minHeight: "100dvh",
    flexDirection: "column",
  },
});

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
    <main {...applyStyles(styles.main)}>
      <div {...applyStyles(styles.heroShell)}>
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
