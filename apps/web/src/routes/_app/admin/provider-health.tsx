import { createFileRoute } from "@tanstack/react-router";
import { ProviderHealthPage } from "@/modules/game-data/presentation/provider-health-page.tsx";

export const Route = createFileRoute("/_app/admin/provider-health")({
  component: ProviderHealthPage,
});
