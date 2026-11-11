import { createFileRoute } from "@tanstack/react-router";
import { PlanAdminRoute } from "@/modules/billing/presentation/plan-admin-page.tsx";

export const Route = createFileRoute("/_app/admin/billing")({
  component: PlanAdminRoute,
});
