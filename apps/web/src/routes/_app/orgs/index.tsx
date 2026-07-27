import { createFileRoute } from "@tanstack/react-router";
import { OrgsIndexPage } from "@/modules/organizations/presentation/orgs-index-page.tsx";

export const Route = createFileRoute("/_app/orgs/")({
  component: OrgsIndexPage,
});
