"use client";

import * as stylex from "@stylexjs/stylex";
import { applyStyles, Display, Subtitle } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import { ClubSearchPanel } from "@/modules/game-data/presentation/club-search-panel.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";

const styles = stylex.create({
  section: {
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.borderSubtle,
    backgroundColor: "color-mix(in oklab, var(--muted) 50%, transparent)",
  },
  inner: {
    marginInline: "auto",
    display: "grid",
    maxWidth: "80rem",
    scrollMarginTop: "2rem",
    alignItems: "center",
    gap: {
      default: "2.5rem",
      [media.lg]: "4rem",
    },
    paddingInline: {
      default: "1.25rem",
      [media.sm]: "2rem",
    },
    paddingBlock: {
      default: "5rem",
      [media.lg]: "7rem",
    },
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.lg]: "0.8fr 1.2fr",
    },
  },
  copy: {
    display: "flex",
    maxWidth: "28rem",
    flexDirection: "column",
    gap: "1.5rem",
  },
  subtitle: {
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
});

export function DemoSearchSection() {
  const { t } = useI18n();
  return (
    <section id="demo" {...applyStyles(styles.section)}>
      <div {...applyStyles(styles.inner)}>
        <div {...applyStyles(styles.copy)}>
          <Display as="h2">{t("landing.demo.title")}</Display>
          <Subtitle {...applyStyles(styles.subtitle)}>{t("landing.demo.subtitle")}</Subtitle>
        </div>
        <ClubSearchPanel />
      </div>
    </section>
  );
}
