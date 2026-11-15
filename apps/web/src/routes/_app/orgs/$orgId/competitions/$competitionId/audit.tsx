import { createFileRoute } from "@tanstack/react-router";
import { AuditPageRoute } from "@/modules/organizations/presentation/audit/audit-page.tsx";
import { localizedHead } from "@/shared/presentation/i18n/localized-head.ts";

export const Route = createFileRoute("/_app/orgs/$orgId/competitions/$competitionId/audit")({
  head: localizedHead("pages.organization.audit.title"),
  component: CompetitionAuditRoute,
});
function CompetitionAuditRoute() {
  const { orgId, competitionId } = Route.useParams();
  return (
    <AuditPageRoute
      key={`${orgId}:${competitionId}`}
      organizationId={orgId}
      competitionId={competitionId}
    />
  );
}
