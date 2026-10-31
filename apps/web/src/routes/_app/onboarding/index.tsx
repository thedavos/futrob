import { createFileRoute } from "@tanstack/react-router";
import { PendingScreen } from "@/shared/presentation/status-screen.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";

export const Route = createFileRoute("/_app/onboarding/")({
  component: OnboardingIndex,
});

function OnboardingIndex() {
  const { t } = useI18n();
  return <PendingScreen message={t("onboarding.loading.progress")} />;
}
