import { createFileRoute } from "@tanstack/react-router";
import { PageScaffold } from "@/shared/presentation/page-scaffold.tsx";

export const Route = createFileRoute("/_app/orgs/$orgId/settings/")({
  head: () => ({ meta: [{ title: "Ajustes | Futrob" }] }),
  component: () => <PageScaffold page="organization.settings" />,
});
