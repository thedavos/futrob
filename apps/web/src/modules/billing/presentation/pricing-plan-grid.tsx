"use client";

import * as stylex from "@stylexjs/stylex";
import type { OrganizationPlan } from "@futrob/api-contracts";
import { Alert, AlertDescription, applyStyles } from "@futrob/ui";
import { space } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { PricingPlanCard } from "./pricing-plan-card.tsx";

/** Product's suggested plan. A merchandising choice, not catalog data. */
const RECOMMENDED_PLAN: OrganizationPlan["key"] = "pro";

const styles = stylex.create({
  grid: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "grid",
    columnGap: space.s4,
    rowGap: {
      default: space.s4,
      [media.lg]: 0,
    },
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.lg]: "repeat(3, minmax(0, 1fr))",
    },
  },
  // Passes the grid's tracks down to the card; see `pricing-plan-card.tsx`.
  gridItem: {
    display: {
      default: "block",
      [media.lg]: "grid",
    },
    gridRow: {
      default: null,
      [media.lg]: "span 18",
    },
    gridTemplateRows: {
      default: null,
      [media.lg]: "subgrid",
    },
  },
});

/** Plan cards from the public catalog, shared by `/pricing` and the landing. */
export function PricingPlanGrid({
  label,
  plans,
}: {
  readonly label: string;
  readonly plans: readonly OrganizationPlan[] | null;
}) {
  const { t } = useI18n();
  if (plans === null) {
    return (
      <Alert variant="warning">
        <AlertDescription>{t("pricing.unavailable")}</AlertDescription>
      </Alert>
    );
  }
  return (
    <ul aria-label={label} {...applyStyles(styles.grid)}>
      {plans.map((plan) => (
        <li key={plan.key} {...applyStyles(styles.gridItem)}>
          <PricingPlanCard featured={plan.key === RECOMMENDED_PLAN} plan={plan} />
        </li>
      ))}
    </ul>
  );
}
