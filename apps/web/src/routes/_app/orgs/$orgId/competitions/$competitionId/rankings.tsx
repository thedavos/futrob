import { createFileRoute } from "@tanstack/react-router";
import { PageScaffold } from "@/shared/presentation/page-scaffold.tsx";

export const Route = createFileRoute("/_app/orgs/$orgId/competitions/$competitionId/rankings")({
  head: () => ({ meta: [{ title: "Rankings | Futrob" }] }),
  component: () => <PageScaffold page="competition.rankings" />,
});
