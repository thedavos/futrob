import * as stylex from "@stylexjs/stylex";
import { applyStyles } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { createFileRoute } from "@tanstack/react-router";
import { PricingPage } from "@/modules/billing/presentation/pricing-page.tsx";
import { getPublicPlans } from "@/modules/billing/server/get-public-plans.functions.ts";
import { DEFAULT_LOCALE } from "@/shared/presentation/i18n/locale.ts";
import { getUiLocale } from "@/shared/presentation/i18n/locale.functions.ts";
import { createTranslator } from "@/shared/presentation/i18n/translate.ts";
import { LandingHeader } from "@/shared/presentation/landing/landing-header.tsx";

const styles = stylex.create({
  main: { minHeight: "100vh", backgroundColor: colors.background, color: colors.foreground },
});

export const Route = createFileRoute("/pricing")({
  loader: async () => {
    const [locale, plans] = await Promise.all([getUiLocale(), getPublicPlans()]);
    return { locale, plans };
  },
  head: ({ loaderData }) => {
    const t = createTranslator(loaderData?.locale ?? DEFAULT_LOCALE);
    return {
      meta: [
        { title: t("pricing.meta.title") },
        { name: "description", content: t("pricing.meta.description") },
      ],
    };
  },
  component: PricingRoute,
});

function PricingRoute() {
  const { plans } = Route.useLoaderData();
  return (
    <main {...applyStyles(styles.main)}>
      <LandingHeader />
      <PricingPage plans={plans} />
    </main>
  );
}
