"use client";

import * as stylex from "@stylexjs/stylex";
import { applyStyles, Badge, Body, Display, Subtitle } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";

import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";

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
  section: {
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.borderSubtle,
  },
  inner: {
    marginInline: "auto",
    display: "grid",
    maxWidth: "80rem",
    scrollMarginTop: "2rem",
    alignItems: "start",
    gap: {
      default: "3rem",
      [media.lg]: "4rem",
    },
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.lg]: "minmax(0, 5fr) minmax(0, 6fr)",
    },
    paddingInline: {
      default: "1.25rem",
      [media.sm]: "2rem",
    },
    paddingBlock: {
      default: "5rem",
      [media.lg]: "8rem",
    },
  },
  copy: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    position: {
      default: "static",
      [media.lg]: "sticky",
    },
    top: "2rem",
  },
  subtitle: {
    maxWidth: "36ch",
    color: colors.mutedForeground,
    fontSize: {
      default: null,
      [media.sm]: "var(--text-base)",
    },
    lineHeight: {
      default: null,
      [media.sm]: "1.5rem",
    },
  },
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
    <section id="mecanismo" {...applyStyles(styles.section)}>
      <div {...applyStyles(styles.inner)}>
        <div {...applyStyles(styles.copy)}>
          <Display as="h2">{t("landing.mechanism.title")}</Display>
          <Subtitle {...applyStyles(styles.subtitle)}>{t("landing.mechanism.subtitle")}</Subtitle>
        </div>
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
      </div>
    </section>
  );
}
