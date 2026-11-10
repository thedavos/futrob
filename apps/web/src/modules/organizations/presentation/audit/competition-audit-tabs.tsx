import { applyStyles, typography } from "@futrob/ui";
import { ORGANIZATION_PERMISSION } from "@futrob/organizations";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { useCan } from "@/shared/presentation/permissions/use-can.ts";
import { styles } from "./audit.styles.ts";

export function CompetitionAuditTabs({
  organizationId,
  competitionId,
  active,
}: {
  readonly organizationId: string;
  readonly competitionId: string;
  readonly active: "overview" | "audit";
}) {
  const { t } = useI18n();
  const access = useCan({ organizationId, competitionId }, ORGANIZATION_PERMISSION.auditTrailRead);
  if (!access.allowed) return null;
  const base = `/orgs/${encodeURIComponent(organizationId)}/competitions/${encodeURIComponent(competitionId)}`;
  return (
    <nav aria-label={t("audit.competitionNavigation")} {...applyStyles(styles.tabs)}>
      <a
        href={base}
        aria-current={active === "overview" ? "page" : undefined}
        {...applyStyles(typography.label, styles.tab, active === "overview" && styles.activeTab)}
      >
        {t("shell.nav.competition.overview")}
      </a>
      <a
        href={`${base}/audit`}
        aria-current={active === "audit" ? "page" : undefined}
        {...applyStyles(typography.label, styles.tab, active === "audit" && styles.activeTab)}
      >
        {t("audit.title")}
      </a>
    </nav>
  );
}
