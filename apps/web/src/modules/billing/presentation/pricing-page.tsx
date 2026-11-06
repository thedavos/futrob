"use client";

import * as stylex from "@stylexjs/stylex";
import { Link } from "@tanstack/react-router";
import { CheckCircleIcon } from "@phosphor-icons/react";
import type { OrganizationPlan } from "@futrob/api-contracts";
import {
  Alert,
  AlertDescription,
  applyStyles,
  Body,
  Button,
  Caption,
  Card,
  Separator,
} from "@futrob/ui";
import { colors, space } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import type { ParameterlessMessageKey as MessageKey } from "@/shared/presentation/i18n/catalogs.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { LandingActions, LandingSection } from "@/shared/presentation/landing/landing-section.tsx";
import { PricingPlanCard } from "./pricing-plan-card.tsx";

/** Product's suggested plan. A merchandising choice, not catalog data. */
const RECOMMENDED_PLAN: OrganizationPlan["key"] = "pro";

const INTEGRITY_ITEMS = [
  "pricing.integrity.selection",
  "pricing.integrity.confirmation",
  "pricing.integrity.disputes",
  "pricing.integrity.reschedule",
  "pricing.integrity.officialization",
] as const satisfies readonly MessageKey[];

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
  integrity: {
    display: "flex",
    flexDirection: "column",
    gap: space.s4,
    padding: space.s6,
  },
  integrityList: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: space.s3,
  },
  integrityItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: space.s2,
  },
  icon: {
    flexShrink: 0,
    width: "1.25rem",
    height: "1.25rem",
    color: colors.primary,
  },
});

/** Public pricing from the catalog data; no purchase until payments exist (ADR-0025). */
export function PricingPage({ plans }: { readonly plans: readonly OrganizationPlan[] | null }) {
  const { t } = useI18n();
  return (
    <>
      <LandingSection
        as="h1"
        layout="stacked"
        subtitle={t("pricing.subtitle")}
        title={t("pricing.title")}
      >
        {plans === null ? (
          <Alert variant="warning">
            <AlertDescription>{t("pricing.unavailable")}</AlertDescription>
          </Alert>
        ) : (
          <ul aria-label={t("pricing.title")} {...applyStyles(styles.grid)}>
            {plans.map((plan) => (
              <li key={plan.key} {...applyStyles(styles.gridItem)}>
                <PricingPlanCard featured={plan.key === RECOMMENDED_PLAN} plan={plan} />
              </li>
            ))}
          </ul>
        )}
      </LandingSection>
      <LandingSection
        copy={
          <LandingActions>
            <Button render={<Link to="/signup" />}>{t("landing.cta.primary")}</Button>
          </LandingActions>
        }
        subtitle={t("pricing.integrity.subtitle")}
        title={t("pricing.integrity.title")}
        tone="band"
      >
        <Card {...applyStyles(styles.integrity)}>
          <ul aria-label={t("pricing.integrity.listLabel")} {...applyStyles(styles.integrityList)}>
            {INTEGRITY_ITEMS.map((key) => (
              <li key={key} {...applyStyles(styles.integrityItem)}>
                <CheckCircleIcon aria-hidden weight="fill" {...applyStyles(styles.icon)} />
                <Body as="span">{t(key)}</Body>
              </li>
            ))}
          </ul>
          <Separator />
          <Caption>{t("pricing.integrity.note")}</Caption>
        </Card>
      </LandingSection>
    </>
  );
}
