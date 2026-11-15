import type { OrganizationAuditEntry } from "@futrob/organizations";

export function auditObjectHref(
  entry: Pick<OrganizationAuditEntry, "organizationId" | "competitionId" | "object">,
): string | null {
  const org = `/orgs/${encodeURIComponent(entry.organizationId)}`;
  const competition = entry.competitionId
    ? `${org}/competitions/${encodeURIComponent(entry.competitionId)}`
    : null;
  switch (entry.object.type) {
    case "organization":
      return org;
    case "actor":
      return `${org}/settings/members`;
    case "billing":
      return `${org}/settings/plan`;
    case "competition":
      return competition;
    case "team":
      return competition ? `${competition}/teams` : `${org}/teams`;
    case "encounter":
      return competition
        ? `${competition}/encounters/${encodeURIComponent(entry.object.id)}`
        : null;
    case "fixture":
      return competition ? `${competition}/fixture` : null;
    case "sanction":
      return competition ? `${competition}/sanctions` : null;
    default:
      return null;
  }
}
