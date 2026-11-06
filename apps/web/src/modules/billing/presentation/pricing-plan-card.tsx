"use client";

import * as stylex from "@stylexjs/stylex";
import { Link } from "@tanstack/react-router";
import { CheckCircleIcon, MinusCircleIcon } from "@phosphor-icons/react";
import type { OrganizationPlan } from "@futrob/api-contracts";
import {
  applyStyles,
  Badge,
  Body,
  Button,
  Caption,
  Card,
  Heading,
  Separator,
  typography,
  vis,
} from "@futrob/ui";
import { media } from "@futrob/ui/styles/media.stylex";
import { colors, space } from "@futrob/ui/styles/tokens.stylex";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { planNameKey } from "./plan-copy.ts";
import { planFeatureRows, planPrice } from "./pricing-model.ts";

const styles = stylex.create({
  // From `lg`, cards share the page grid's tracks through subgrid so blocks and feature rows
  // line up across plans. 18 tracks: summary, price, action, separator and the 14 feature rows
  // of `planFeatureRows`; `pricing-page.tsx` declares the same span on the list item.
  card: {
    display: {
      default: "flex",
      [media.lg]: "grid",
    },
    height: "100%",
    flexDirection: "column",
    gap: space.s6,
    padding: space.s6,
    gridRow: {
      default: null,
      [media.lg]: "span 18",
    },
    gridTemplateRows: {
      default: null,
      [media.lg]: "subgrid",
    },
  },
  featured: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceRaised,
  },
  summary: {
    display: "flex",
    flexDirection: "column",
    gap: space.s2,
  },
  nameRow: {
    display: "flex",
    minHeight: "1.75rem",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.s2,
  },
  price: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "baseline",
    gap: space.s2,
  },
  priceValue: {
    margin: 0,
    fontVariantNumeric: "tabular-nums",
  },
  action: {
    display: "flex",
    flexDirection: "column",
    gap: space.s2,
  },
  cta: {
    width: "100%",
  },
  list: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: {
      default: "flex",
      [media.lg]: "grid",
    },
    flexDirection: "column",
    gap: space.s3,
    gridRow: {
      default: null,
      [media.lg]: "span 14",
    },
    gridTemplateRows: {
      default: null,
      [media.lg]: "subgrid",
    },
  },
  item: {
    display: "flex",
    alignItems: "flex-start",
    gap: space.s2,
  },
  iconIncluded: {
    flexShrink: 0,
    width: "1.25rem",
    height: "1.25rem",
    color: colors.primary,
  },
  iconExcluded: {
    flexShrink: 0,
    width: "1.25rem",
    height: "1.25rem",
    color: colors.textTertiary,
  },
});

export interface PricingPlanCardProps {
  readonly featured?: boolean;
  readonly plan: OrganizationPlan;
}

/** One plan: who it is for, its price, the way in and the shared comparison rows. */
export function PricingPlanCard({ featured = false, plan }: PricingPlanCardProps) {
  const { t } = useI18n();
  const headingId = `plan-${plan.key}`;
  const name = t(planNameKey(plan.key));
  const isFree = plan.key === "free";
  return (
    <Card aria-labelledby={headingId} {...applyStyles(styles.card, featured && styles.featured)}>
      <div {...applyStyles(styles.summary)}>
        <div {...applyStyles(styles.nameRow)}>
          <Heading id={headingId}>{name}</Heading>
          {featured ? <Badge variant="primary">{t("pricing.recommended")}</Badge> : null}
        </div>
        <Body tone="muted">{t(`pricing.tagline.${plan.key}`)}</Body>
      </div>
      <div {...applyStyles(styles.price)}>
        <p {...applyStyles(typography.host, typography.display, styles.priceValue)}>
          {planPrice(plan)}
        </p>
        <Body tone="muted">{t("pricing.perMonthUsd")}</Body>
      </div>
      <div {...applyStyles(styles.action)}>
        <Button
          className={styles.cta}
          render={<Link to="/signup" />}
          variant={featured ? "default" : "outline"}
        >
          {isFree ? t("pricing.cta.free") : t("pricing.cta.paid")}
        </Button>
        <Caption>
          {isFree ? t("pricing.note.free") : t("pricing.note.paid", { plan: name })}
        </Caption>
      </div>
      <Separator />
      <ul {...applyStyles(styles.list)}>
        {planFeatureRows(plan, t).map((row) => (
          <li key={row.label} {...applyStyles(styles.item)}>
            {row.included ? (
              <CheckCircleIcon aria-hidden weight="fill" {...applyStyles(styles.iconIncluded)} />
            ) : (
              <MinusCircleIcon aria-hidden {...applyStyles(styles.iconExcluded)} />
            )}
            <Body as="span" tone={row.included ? undefined : "muted"}>
              {row.label}
              {row.included ? null : (
                <span {...applyStyles(vis.srOnly)}> ({t("billing.features.notIncluded")})</span>
              )}
            </Body>
          </li>
        ))}
      </ul>
    </Card>
  );
}
