import { createFileRoute } from "@tanstack/react-router";
import { AuditPageRoute } from "@/modules/organizations/presentation/audit/audit-page.tsx";
import { localizedHead } from "@/shared/presentation/i18n/localized-head.ts";

export const Route = createFileRoute("/_app/orgs/$orgId/settings/audit")({
  head: localizedHead("pages.organization.audit.title"),
  component: OrganizationAuditRoute,
});
function OrganizationAuditRoute() {
  const { orgId } = Route.useParams();
  return <AuditPageRoute key={orgId} organizationId={orgId} />;
}
