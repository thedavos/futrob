import { Link } from "@tanstack/react-router";
import { Alert, AlertDescription, TextLink } from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { planUpsellKey } from "./plan-copy.ts";

/**
 * Upsell for a plan-gated (402) answer: it says what the plan does not include and points
 * to the plan page. Purchase stays out of the product until payments exist (ADR-0025).
 */
export function PlanUpsellAlert({
  code,
  organizationId,
}: {
  readonly code: string;
  readonly organizationId: string;
}) {
  const { t } = useI18n();
  return (
    <Alert variant="warning">
      <AlertDescription>
        {t(planUpsellKey(code))}{" "}
        <TextLink
          render={<Link params={{ orgId: organizationId }} to="/orgs/$orgId/settings/plan" />}
        >
          {t("billing.upsell.action")}
        </TextLink>
      </AlertDescription>
    </Alert>
  );
}
