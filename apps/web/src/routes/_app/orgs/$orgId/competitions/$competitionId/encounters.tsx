import { createFileRoute } from "@tanstack/react-router";
import { PageScaffold } from "@/shared/presentation/page-scaffold.tsx";

export const Route = createFileRoute("/_app/orgs/$orgId/competitions/$competitionId/encounters")({
  head: () => ({ meta: [{ title: "Enfrentamientos | Futrob" }] }),
  component: () => <PageScaffold page="competition.encounters" />,
});
