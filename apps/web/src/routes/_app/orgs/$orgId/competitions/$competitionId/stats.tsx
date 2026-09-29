import { createFileRoute } from "@tanstack/react-router";
import { PageScaffold } from "@/shared/presentation/page-scaffold.tsx";

export const Route = createFileRoute("/_app/orgs/$orgId/competitions/$competitionId/stats")({
  head: () => ({ meta: [{ title: "Estadísticas | Futrob" }] }),
  component: () => <PageScaffold page="competitionPlayer.stats" />,
});
