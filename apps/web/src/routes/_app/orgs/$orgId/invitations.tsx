import { createFileRoute } from "@tanstack/react-router";
import { PageScaffold } from "@/shared/presentation/page-scaffold.tsx";

export const Route = createFileRoute("/_app/orgs/$orgId/invitations")({
  head: () => ({ meta: [{ title: "Invitaciones | Futrob" }] }),
  component: () => <PageScaffold page="organization.invitations" />,
});
