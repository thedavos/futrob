import { createFileRoute } from "@tanstack/react-router";
import { PageScaffold } from "@/shared/presentation/page-scaffold.tsx";

export const Route = createFileRoute("/_app/orgs/$orgId/players")({
  head: () => ({ meta: [{ title: "Jugadores | Futrob" }] }),
  component: () => <PageScaffold page="organization.players" />,
});
