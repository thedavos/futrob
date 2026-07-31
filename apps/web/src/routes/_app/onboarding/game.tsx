import { createFileRoute } from "@tanstack/react-router";
import { RoutePendingState } from "@/shared/presentation/route-load-state.tsx";

export const Route = createFileRoute("/_app/onboarding/game")({
  head: () => ({ meta: [{ title: "Preparando tu configuración | Futrob" }] }),
  component: () => <RoutePendingState message="Recuperando tu progreso…" />,
});
