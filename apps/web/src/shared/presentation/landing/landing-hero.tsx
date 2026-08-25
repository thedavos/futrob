"use client";

import * as stylex from "@stylexjs/stylex";
import { applyStyles, Button, colors, media, typography } from "@futrob/ui";
import { Link } from "@tanstack/react-router";

import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { HeroBracket } from "@/shared/presentation/landing/hero-bracket.tsx";

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
      default: "2.5rem",
      [media.lg]: "4rem",
    },
    paddingInline: {
      default: "1.25rem",
      [media.sm]: "2rem",
    },
    paddingBlock: "2rem",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.lg]: "0.85fr 1.15fr",
    },
  },
  copy: {
    maxWidth: "36rem",
  },
  eyebrow: {
    fontWeight: 600,
    textTransform: "uppercase",
    color: colors.primary,
    letterSpacing: "0.025em",
  },
  stack: {
    marginTop: "0.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  title: {
    fontSize: {
      default: "var(--text-5xl)",
      [media.sm]: "var(--text-6xl)",
    },
    lineHeight: 1,
    fontWeight: 700,
    letterSpacing: "var(--tracking-tight)",
    textWrap: "balance",
  },
  titleHighlight: {
    color: colors.primary,
  },
  subtitle: {
    maxWidth: "58ch",
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
    marginTop: "2rem",
    display: "flex",
    flexWrap: "wrap",
    gap: "0.75rem",
  },
  figure: {
    minWidth: 0,
  },
});

export function LandingHero() {
  const { t } = useI18n();
  return (
    <section {...applyStyles(styles.section)}>
      <div {...applyStyles(styles.inner)}>
        <div {...applyStyles(styles.copy)}>
          <p {...applyStyles(typography.label, styles.eyebrow)}>{t("landing.hero.eyebrow")}</p>
          <div {...applyStyles(styles.stack)}>
            <h1 {...applyStyles(styles.title)}>
              {t("landing.hero.titleLead")}{" "}
              <span {...applyStyles(styles.titleHighlight)}>{t("landing.hero.titleHighlight")}</span>
              .
            </h1>
            <p {...applyStyles(typography.body, styles.subtitle)}>
              {t("landing.hero.subtitleLead")}
              <br />
              {t("landing.hero.subtitleRest")}
            </p>
          </div>
          <div {...applyStyles(styles.actions)}>
            <Button render={<Link to="/signup" />}>{t("landing.hero.cta.primary")}</Button>
            <Button render={<a href="#mecanismo" />} variant="outline">
              {t("landing.hero.cta.secondary")}
            </Button>
          </div>
        </div>
        <figure {...applyStyles(styles.figure)}>
          <HeroBracket />
        </figure>
      </div>
    </section>
  );
}
