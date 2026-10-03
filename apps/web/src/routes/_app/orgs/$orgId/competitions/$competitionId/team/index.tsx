import { createFileRoute } from "@tanstack/react-router";
import { PageScaffold } from "@/shared/presentation/page-scaffold.tsx";

export const Route = createFileRoute("/_app/orgs/$orgId/competitions/$competitionId/team/")({
  head: () => ({ meta: [{ title: "Mi equipo | Futrob" }] }),
  component: () => <PageScaffold page="competitionPlayer.team" />,
});
