"use client";

import * as stylex from "@stylexjs/stylex";
import { applyStyles, Badge, Body, Caption } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { LandingSection } from "@/shared/presentation/landing/landing-section.tsx";

const styles = stylex.create({
  guarantee: {
    maxWidth: "44ch",
  },
  panel: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
    gap: "1rem",
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: {
      default: "1.25rem",
      [media.sm]: "1.75rem",
    },
  },
  status: {
    alignSelf: "flex-start",
  },
  sentence: {
    overflowWrap: "break-word",
    fontSize: {
      default: "var(--text-lg)",
      [media.sm]: "var(--text-xl)",
    },
    lineHeight: 1.45,
    fontWeight: 500,
  },
});

export function RescheduleSection() {
  const { t } = useI18n();
  return (
    <LandingSection
      copy={<Body {...applyStyles(styles.guarantee)}>{t("landing.reschedule.guarantee")}</Body>}
      id="reprogramacion"
      subtitle={t("landing.reschedule.subtitle")}
      title={t("landing.reschedule.title")}
    >
      <figure aria-label={t("landing.reschedule.panel.label")} {...applyStyles(styles.panel)}>
        <Badge {...applyStyles(styles.status)} variant="warning">
          {t("landing.reschedule.panel.status")}
        </Badge>
        <p {...applyStyles(styles.sentence)}>{t("landing.reschedule.panel.sentence")}</p>
        <Body>{t("landing.reschedule.panel.respondBy")}</Body>
        <Caption as="p">{t("landing.reschedule.panel.options")}</Caption>
      </figure>
    </LandingSection>
  );
}
