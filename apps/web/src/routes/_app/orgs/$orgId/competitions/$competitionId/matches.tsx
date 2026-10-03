import { createFileRoute } from "@tanstack/react-router";
import { PageScaffold } from "@/shared/presentation/page-scaffold.tsx";

export const Route = createFileRoute("/_app/orgs/$orgId/competitions/$competitionId/matches")({
  head: () => ({ meta: [{ title: "Partidos | Futrob" }] }),
  component: () => <PageScaffold page="competitionPlayer.matches" />,
});
