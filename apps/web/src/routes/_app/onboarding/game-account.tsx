import { createFileRoute } from "@tanstack/react-router";
import { GameAccountStep } from "@/modules/identity/presentation/onboarding/onboarding-steps.tsx";

export const Route = createFileRoute("/_app/onboarding/game-account")({
  head: () => ({ meta: [{ title: "Configura tus datos de juego | Futrob" }] }),
  component: GameAccountStep,
});
