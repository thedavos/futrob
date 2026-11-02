"use client";

import * as stylex from "@stylexjs/stylex";
import { applyStyles, Badge, Body, Caption, Display, Subtitle } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";

const styles = stylex.create({
  section: {
    backgroundColor: colors.sidebar,
  },
  inner: {
    marginInline: "auto",
    display: "grid",
    maxWidth: "80rem",
    scrollMarginTop: "2rem",
    alignItems: "center",
    gap: {
      default: "3rem",
      [media.lg]: "4rem",
    },
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.lg]: "minmax(0, 6fr) minmax(0, 5fr)",
    },
    paddingInline: {
      default: "1.25rem",
      [media.sm]: "2rem",
    },
    paddingBlock: {
      default: "5rem",
      [media.lg]: "6rem",
    },
  },
  copy: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    order: {
      default: 0,
      [media.lg]: 1,
    },
  },
  subtitle: {
    maxWidth: "44ch",
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
    <section id="reprogramacion" {...applyStyles(styles.section)}>
      <div {...applyStyles(styles.inner)}>
        <div {...applyStyles(styles.copy)}>
          <Display as="h2">{t("landing.reschedule.title")}</Display>
          <Subtitle {...applyStyles(styles.subtitle)}>{t("landing.reschedule.subtitle")}</Subtitle>
          <Body {...applyStyles(styles.guarantee)}>{t("landing.reschedule.guarantee")}</Body>
        </div>
        <figure aria-label={t("landing.reschedule.panel.label")} {...applyStyles(styles.panel)}>
          <Badge {...applyStyles(styles.status)} variant="warning">
            {t("landing.reschedule.panel.status")}
          </Badge>
          <p {...applyStyles(styles.sentence)}>{t("landing.reschedule.panel.sentence")}</p>
          <Body>{t("landing.reschedule.panel.respondBy")}</Body>
          <Caption as="p">{t("landing.reschedule.panel.options")}</Caption>
        </figure>
      </div>
    </section>
  );
}
