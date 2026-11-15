import { createFileRoute } from "@tanstack/react-router";
import { GameAccountStep } from "@/modules/identity/presentation/onboarding/steps/game-account-step.tsx";
import { localizedHead } from "@/shared/presentation/i18n/localized-head.ts";

export const Route = createFileRoute("/_app/onboarding/game-account")({
  head: localizedHead("onboarding.account.title"),
  component: GameAccountStep,
});
