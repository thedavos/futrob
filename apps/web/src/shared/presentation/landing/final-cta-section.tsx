"use client";

import * as stylex from "@stylexjs/stylex";
import { applyStyles, Button, Caption, Display, Logo, Subtitle } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import { Link } from "@tanstack/react-router";

import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";

const styles = stylex.create({
  section: {
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.borderSubtle,
  },
  inner: {
    marginInline: "auto",
    maxWidth: "80rem",
    paddingInline: {
      default: "1.25rem",
      [media.sm]: "2rem",
    },
    paddingBlock: {
      default: "6rem",
      [media.lg]: "8rem",
    },
    textAlign: "center",
  },
  copy: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  title: {
    marginInline: "auto",
    maxWidth: "48rem",
  },
  subtitle: {
    marginInline: "auto",
    maxWidth: "36rem",
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
  actions: {
    marginTop: "3rem",
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: "0.75rem",
  },
  footer: {
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.borderSubtle,
  },
  footerInner: {
    marginInline: "auto",
    display: "flex",
    width: "100%",
    maxWidth: "80rem",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "space-between",
    columnGap: "2rem",
    rowGap: "1rem",
    paddingInline: {
      default: "1.25rem",
      [media.sm]: "2rem",
    },
    paddingBlock: "2rem",
  },
  brand: {
    display: "flex",
    minWidth: 0,
    flexGrow: {
      default: 1,
      [media.sm]: 0,
    },
    flexShrink: 1,
    flexBasis: {
      default: "100%",
      [media.sm]: "auto",
    },
    alignItems: "flex-start",
    columnGap: "0.5rem",
  },
  logo: {
    marginTop: 1,
    height: "1.25rem",
    width: "auto",
    flexShrink: 0,
    color: colors.mutedForeground,
  },
  taglines: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
    rowGap: "0.25rem",
  },
  legal: {
    flexShrink: 0,
  },
});

export function FinalCtaSection() {
  const { t } = useI18n();
  const logo = applyStyles(styles.logo);
  return (
    <>
      <section {...applyStyles(styles.section)}>
        <div {...applyStyles(styles.inner)}>
          <div {...applyStyles(styles.copy)}>
            <Display as="h2" {...applyStyles(styles.title)}>
              {t("landing.cta.title")}
            </Display>
            <Subtitle {...applyStyles(styles.subtitle)}>{t("landing.cta.subtitle")}</Subtitle>
          </div>
          <div {...applyStyles(styles.actions)}>
            <Button render={<Link to="/signup" />}>{t("landing.cta.primary")}</Button>
            <Button render={<Link to="/login" />} variant="ghost">
              {t("landing.cta.secondary")}
            </Button>
          </div>
        </div>
      </section>
      <footer {...applyStyles(styles.footer)}>
        <div {...applyStyles(styles.footerInner)}>
          <div {...applyStyles(styles.brand)}>
            <Logo className={logo.className} monochrome style={logo.style} />
            <div {...applyStyles(styles.taglines)}>
              <Caption as="span">{t("landing.footer.tagline")}</Caption>
              <Caption as="span">{t("landing.footer.madeBy")}</Caption>
            </div>
          </div>
          <div {...applyStyles(styles.legal)}>
            <Caption as="span">{t("landing.footer.legal")}</Caption>
          </div>
        </div>
      </footer>
    </>
  );
}
