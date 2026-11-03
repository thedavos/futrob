"use client";

import * as stylex from "@stylexjs/stylex";
import { applyStyles, Body, Button, Display } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import { Link } from "@tanstack/react-router";

import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { EncounterBoard } from "@/shared/presentation/landing/encounter-board.tsx";

const styles = stylex.create({
  section: {
    display: "flex",
    minHeight: 0,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "0%",
    flexDirection: "column",
    justifyContent: "center",
  },
  inner: {
    marginInline: "auto",
    display: "grid",
    width: "100%",
    maxWidth: "80rem",
    alignItems: "center",
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
      default: "2rem",
      [media.lg]: "3rem",
    },
  },
  copy: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
    gap: "1.5rem",
  },
  title: {
    minWidth: 0,
    overflowWrap: "break-word",
  },
  subtitle: {
    maxWidth: "36ch",
    color: colors.mutedForeground,
    fontSize: {
      default: null,
      [media.sm]: "var(--text-lg)",
    },
    lineHeight: {
      default: null,
      [media.sm]: "1.75rem",
    },
  },
  actions: {
    marginTop: "0.5rem",
    display: "flex",
    flexWrap: "wrap",
    gap: "0.75rem",
  },
});

export function LandingHero() {
  const { t } = useI18n();
  return (
    <section {...applyStyles(styles.section)}>
      <div {...applyStyles(styles.inner)}>
        <div {...applyStyles(styles.copy)}>
          <Display {...applyStyles(styles.title)}>{t("landing.hero.title")}</Display>
          <Body tone="muted" {...applyStyles(styles.subtitle)}>
            {t("landing.hero.subtitle")}
          </Body>
          <div {...applyStyles(styles.actions)}>
            <Button render={<Link to="/signup" />}>{t("landing.hero.cta.primary")}</Button>
            <Button render={<a href="#mecanismo" />} variant="outline">
              {t("landing.hero.cta.secondary")}
            </Button>
          </div>
        </div>
        <EncounterBoard />
      </div>
    </section>
  );
}
