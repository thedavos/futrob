import { createFileRoute } from "@tanstack/react-router";
import { RoutePendingState } from "@/shared/presentation/route-load-state.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";

export const Route = createFileRoute("/_app/onboarding/game")({
  component: LegacyGameStep,
});

function LegacyGameStep() {
  const { t } = useI18n();
  return <RoutePendingState message={t("onboarding.loading.progress")} />;
}
