"use client";

import * as stylex from "@stylexjs/stylex";
import { applyStyles, Caption, Logo, TextLink } from "@futrob/ui";
import { media } from "@futrob/ui/styles/media.stylex";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { Link } from "@tanstack/react-router";

import type { ParameterlessMessageKey as MessageKey } from "@/shared/presentation/i18n/catalogs.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { legalNavItems } from "@/shared/presentation/legal/legal-hrefs.ts";

const styles = stylex.create({
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
  navColumn: {
    display: "flex",
    flexDirection: "column",
    rowGap: "0.75rem",
  },
  navList: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    rowGap: "0.5rem",
  },
  legal: {
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: {
      default: "flex-start",
      [media.sm]: "flex-end",
    },
    rowGap: "0.75rem",
  },
  disclaimer: {
    maxWidth: "44ch",
    textAlign: {
      default: "start",
      [media.sm]: "end",
    },
  },
  legalNav: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: {
      default: "flex-start",
      [media.sm]: "flex-end",
    },
    columnGap: "1rem",
    rowGap: "0.5rem",
  },
});

/** Landing anchors plus the full pricing page; the footer also renders outside the landing. */
const PRODUCT_LINKS = [
  { id: "features", label: "landing.nav.features", hash: "funciones" },
  { id: "howItWorks", label: "landing.nav.howItWorks", hash: "mecanismo" },
  { id: "faq", label: "landing.footer.faq", hash: "preguntas" },
] as const satisfies readonly {
  readonly id: string;
  readonly label: MessageKey;
  readonly hash: string;
}[];

export function LandingFooter() {
  const { t } = useI18n();
  const logo = applyStyles(styles.logo);
  return (
    <footer {...applyStyles(styles.footer)}>
      <div {...applyStyles(styles.footerInner)}>
        <div {...applyStyles(styles.brand)}>
          <Logo className={logo.className} monochrome style={logo.style} />
          <div {...applyStyles(styles.taglines)}>
            <Caption as="span">{t("landing.footer.tagline")}</Caption>
            <Caption as="span">{t("landing.footer.madeBy")}</Caption>
          </div>
        </div>
        <nav aria-label={t("landing.footer.productNav")} {...applyStyles(styles.navColumn)}>
          <Caption as="span">{t("landing.footer.productNav")}</Caption>
          <ul {...applyStyles(styles.navList)}>
            {PRODUCT_LINKS.map((item) => (
              <li key={item.id}>
                <TextLink render={<Link hash={item.hash} to="/" />} text="caption">
                  {t(item.label)}
                </TextLink>
              </li>
            ))}
            <li>
              <TextLink render={<Link to="/pricing" />} text="caption">
                {t("landing.nav.pricing")}
              </TextLink>
            </li>
          </ul>
        </nav>
        <div {...applyStyles(styles.legal)}>
          <nav aria-label={t("legal.nav.aria")} {...applyStyles(styles.legalNav)}>
            {legalNavItems(t).map((item) => (
              <TextLink key={item.id} render={<Link to={item.href} />} text="caption">
                {item.label}
              </TextLink>
            ))}
          </nav>
          <Caption as="span">{t("landing.footer.legal")}</Caption>
          <Caption as="p" {...applyStyles(styles.disclaimer)}>
            {t("landing.footer.disclaimer")}
          </Caption>
        </div>
      </div>
    </footer>
  );
}
