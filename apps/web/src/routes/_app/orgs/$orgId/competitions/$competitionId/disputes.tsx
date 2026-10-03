import { createFileRoute } from "@tanstack/react-router";
import { PageScaffold } from "@/shared/presentation/page-scaffold.tsx";

export const Route = createFileRoute("/_app/orgs/$orgId/competitions/$competitionId/disputes")({
  head: () => ({ meta: [{ title: "Disputas | Futrob" }] }),
  component: () => <PageScaffold page="competition.disputes" />,
});
