"use client";

import * as stylex from "@stylexjs/stylex";
import { Link } from "@tanstack/react-router";
import { CheckCircleIcon } from "@phosphor-icons/react";
import type { OrganizationPlan } from "@futrob/api-contracts";
import { applyStyles, Body, Button, Caption, Card, Separator } from "@futrob/ui";
import { colors, space } from "@futrob/ui/styles/tokens.stylex";
import type { ParameterlessMessageKey as MessageKey } from "@/shared/presentation/i18n/catalogs.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { LandingActions, LandingSection } from "@/shared/presentation/landing/landing-section.tsx";
import { PricingPlanGrid } from "./pricing-plan-grid.tsx";

const INTEGRITY_ITEMS = [
  "pricing.integrity.selection",
  "pricing.integrity.confirmation",
  "pricing.integrity.disputes",
  "pricing.integrity.reschedule",
  "pricing.integrity.officialization",
] as const satisfies readonly MessageKey[];

const styles = stylex.create({
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
        <PricingPlanGrid label={t("pricing.title")} plans={plans} />
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
