"use client";

import * as stylex from "@stylexjs/stylex";
import { applyStyles, Body, typography } from "@futrob/ui";
import { colors, space } from "@futrob/ui/styles/tokens.stylex";
import { CaretDownIcon } from "@phosphor-icons/react";

import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { LandingSection } from "@/shared/presentation/landing/landing-section.tsx";

const QUESTIONS = ["ea", "disagree", "install", "reschedule", "downgrade"] as const;

const styles = stylex.create({
  list: {
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.border,
  },
  item: {
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.border,
  },
  // Native `<details>`: keyboard, screen readers and find-in-page work without script.
  summary: {
    display: "flex",
    minHeight: "3.5rem",
    cursor: "pointer",
    listStyle: "none",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.s4,
    paddingBlock: space.s3,
    outlineStyle: "none",
    borderRadius: "var(--corner-md)",
    boxShadow: {
      default: null,
      ":focus-visible": `0 0 0 2px ${colors.ring}`,
    },
    "::-webkit-details-marker": {
      display: "none",
    },
  },
  caret: {
    flexShrink: 0,
    rotate: {
      default: "0deg",
      [stylex.when.ancestor("[open]")]: "180deg",
    },
    color: colors.mutedForeground,
    transitionProperty: "rotate",
    transitionDuration: "var(--duration-normal)",
    transitionTimingFunction: "var(--ease-standard)",
  },
  answer: {
    maxWidth: "64ch",
    paddingBottom: space.s5,
  },
});

export function FaqSection() {
  const { t } = useI18n();
  return (
    <LandingSection
      align="start"
      id="preguntas"
      subtitle={t("landing.faq.subtitle")}
      title={t("landing.faq.title")}
      tone="band"
    >
      <div {...applyStyles(styles.list)}>
        {QUESTIONS.map((key) => (
          <details key={key} {...applyStyles(styles.item, stylex.defaultMarker())}>
            <summary {...applyStyles(styles.summary)}>
              <h3 {...applyStyles(typography.host, typography.title)}>
                {t(`landing.faq.${key}.question`)}
              </h3>
              <CaretDownIcon aria-hidden="true" size={20} {...applyStyles(styles.caret)} />
            </summary>
            <Body tone="muted" {...applyStyles(styles.answer)}>
              {t(`landing.faq.${key}.answer`)}
            </Body>
          </details>
        ))}
      </div>
    </LandingSection>
  );
}
