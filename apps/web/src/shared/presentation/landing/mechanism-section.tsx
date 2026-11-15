"use client";

import * as stylex from "@stylexjs/stylex";
import { applyStyles, Badge, Body } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";

import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { LandingSection } from "@/shared/presentation/landing/landing-section.tsx";

interface MechanismStep {
  readonly key: "sync" | "selection" | "approval" | "publication";
  readonly status: "candidate" | "selecting" | "approved" | "published";
  readonly badge: "info" | "warning" | "approved" | "outline";
}

const STEPS: readonly MechanismStep[] = [
  { key: "sync", status: "candidate", badge: "info" },
  { key: "selection", status: "selecting", badge: "warning" },
  { key: "approval", status: "approved", badge: "approved" },
  { key: "publication", status: "published", badge: "outline" },
];

const styles = stylex.create({
  list: {
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.border,
  },
  step: {
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "8.5rem minmax(0, 1fr)",
    },
    columnGap: "1.5rem",
    rowGap: "0.75rem",
    alignItems: "baseline",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.border,
    paddingBlock: "2rem",
  },
  badge: {
    justifySelf: "start",
  },
  title: {
    fontSize: "var(--text-xl)",
    lineHeight: "1.75rem",
    fontWeight: 600,
  },
  body: {
    marginTop: "0.5rem",
    maxWidth: "52ch",
    color: colors.mutedForeground,
  },
});

export function MechanismSection() {
  const { t } = useI18n();
  const badge = applyStyles(styles.badge);
  return (
    <LandingSection
      align="start"
      id="mecanismo"
      subtitle={t("landing.mechanism.subtitle")}
      title={t("landing.mechanism.title")}
      tone="band"
    >
      <ol {...applyStyles(styles.list)}>
        {STEPS.map((step) => (
          <li key={step.key} {...applyStyles(styles.step)}>
            <Badge className={badge.className} style={badge.style} variant={step.badge}>
              {t(`landing.status.${step.status}`)}
            </Badge>
            <div>
              <h3 {...applyStyles(styles.title)}>{t(`landing.mechanism.${step.key}.title`)}</h3>
              <Body tone="muted" {...applyStyles(styles.body)}>
                {t(`landing.mechanism.${step.key}.description`)}
              </Body>
            </div>
          </li>
        ))}
      </ol>
    </LandingSection>
  );
}
