import { createFileRoute } from "@tanstack/react-router";
import { PageScaffold } from "@/shared/presentation/page-scaffold.tsx";

export const Route = createFileRoute("/_app/orgs/$orgId/competitions/$competitionId/bracket")({
  head: () => ({ meta: [{ title: "Bracket | Futrob" }] }),
  component: () => <PageScaffold page="competition.bracket" />,
});
