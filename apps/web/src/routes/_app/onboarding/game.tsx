import { createFileRoute } from "@tanstack/react-router";
import { RoutePendingState } from "@/shared/presentation/route-load-state.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { getUiLocale } from "@/shared/presentation/i18n/locale.functions.ts";
import { onboardingHead } from "@/shared/presentation/i18n/onboarding-head.ts";

export const Route = createFileRoute("/_app/onboarding/game")({
  loader: () => getUiLocale(),
  head: ({ loaderData }) => onboardingHead(loaderData, "onboarding.account.title"),
  component: LegacyGameStep,
});

function LegacyGameStep() {
  const { t } = useI18n();
  return <RoutePendingState message={t("onboarding.loading.progress")} />;
}
