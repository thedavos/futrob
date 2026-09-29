import { createFileRoute } from "@tanstack/react-router";
import { PageScaffold } from "@/shared/presentation/page-scaffold.tsx";

export const Route = createFileRoute("/_app/orgs/$orgId/teams")({
  head: () => ({ meta: [{ title: "Equipos | Futrob" }] }),
  component: () => <PageScaffold page="organization.teams" />,
});
