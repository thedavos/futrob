import { createFileRoute } from "@tanstack/react-router";
import { PageScaffold } from "@/shared/presentation/page-scaffold.tsx";

export const Route = createFileRoute("/_app/orgs/$orgId/settings/members")({
  head: () => ({ meta: [{ title: "Miembros y roles | Futrob" }] }),
  component: () => <PageScaffold page="organization.members" />,
});
