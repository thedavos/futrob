import * as stylex from "@stylexjs/stylex";
import { applyStyles } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { createFileRoute } from "@tanstack/react-router";
import headlineFontUrl from "@fontsource/barlow-condensed/files/barlow-condensed-latin-700-normal.woff2?url";

import { DEFAULT_LOCALE } from "@/shared/presentation/i18n/locale.ts";
import { getUiLocale } from "@/shared/presentation/i18n/locale.functions.ts";
import { createTranslator } from "@/shared/presentation/i18n/translate.ts";
import { getPublicPlans } from "@/modules/billing/server/get-public-plans.functions.ts";
import { DemoSearchSection } from "@/shared/presentation/landing/demo-search-section.tsx";
import { FaqSection } from "@/shared/presentation/landing/faq-section.tsx";
import { FeaturesSection } from "@/shared/presentation/landing/features-section.tsx";
import { FinalCtaSection } from "@/shared/presentation/landing/final-cta-section.tsx";
import { LandingFooter } from "@/shared/presentation/landing/landing-footer.tsx";
import { LandingHeader } from "@/shared/presentation/landing/landing-header.tsx";
import { LandingHero } from "@/shared/presentation/landing/landing-hero.tsx";
import { MechanismSection } from "@/shared/presentation/landing/mechanism-section.tsx";
import { PortalSection } from "@/shared/presentation/landing/portal-section.tsx";
import { PricingSection } from "@/shared/presentation/landing/pricing-section.tsx";
import { RolesSection } from "@/shared/presentation/landing/roles-section.tsx";

const styles = stylex.create({
  main: {
    minHeight: "100dvh",
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
  loader: async () => {
    const [locale, plans] = await Promise.all([getUiLocale(), getPublicPlans()]);
    return { locale, plans };
  },
  head: ({ loaderData }) => {
    const t = createTranslator(loaderData?.locale ?? DEFAULT_LOCALE);
    return {
      meta: [
        { title: t("landing.meta.title") },
        { name: "description", content: t("landing.meta.description") },
      ],
      // The hero headline is the first thing painted; without the preload it swaps faces mid-reveal.
      links: [
        {
          rel: "preload",
          as: "font",
          type: "font/woff2",
          href: headlineFontUrl,
          crossOrigin: "anonymous",
        },
      ],
    };
  },
  component: HomePage,
});

function HomePage() {
  const { plans } = Route.useLoaderData();
  return (
    <main {...applyStyles(styles.main)}>
      <div {...applyStyles(styles.heroShell)}>
        <LandingHeader />
        <LandingHero />
      </div>
      <FeaturesSection />
      <MechanismSection />
      <RolesSection />
      <PortalSection />
      <DemoSearchSection />
      <PricingSection plans={plans} />
      <FaqSection />
      <FinalCtaSection />
      <LandingFooter />
    </main>
  );
}
