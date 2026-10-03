import { createFileRoute } from "@tanstack/react-router";
import { PageScaffold } from "@/shared/presentation/page-scaffold.tsx";

export const Route = createFileRoute("/_app/orgs/$orgId/competitions/$competitionId/analytics")({
  head: () => ({ meta: [{ title: "Analíticas | Futrob" }] }),
  component: () => <PageScaffold page="competition.analytics" />,
});
