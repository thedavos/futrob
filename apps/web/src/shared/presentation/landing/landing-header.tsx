"use client";

import * as stylex from "@stylexjs/stylex";
import { applyStyles, Button, Logo, media, typography } from "@futrob/ui";
import { Link } from "@tanstack/react-router";

import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";

const styles = stylex.create({
  header: {
    flexShrink: 0,
  },
  inner: {
    marginInline: "auto",
    display: "flex",
    height: "5rem",
    width: "100%",
    maxWidth: "80rem",
    alignItems: "center",
    justifyContent: "space-between",
    paddingInline: {
      default: "1.25rem",
      [media.sm]: "2rem",
    },
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  logo: {
    height: "2.25rem",
    width: "auto",
  },
  wordmark: {
    letterSpacing: "0.025em",
    display: {
      default: "inline",
      [media.maxSm]: "none",
    },
  },
  nav: {
    display: "flex",
    alignItems: "center",
    gap: "0.25rem",
  },
});

export function LandingHeader() {
  const { t } = useI18n();
  const brand = applyStyles(styles.brand);
  const logo = applyStyles(styles.logo);
  return (
    <header {...applyStyles(styles.header)}>
      <div {...applyStyles(styles.inner)}>
        <Link aria-label="Futrob" className={brand.className} style={brand.style} to="/">
          <Logo className={logo.className} style={logo.style} />
          <span {...applyStyles(typography.heading, styles.wordmark)}>Futrob</span>
        </Link>
        <nav aria-label={t("landing.nav.aria")} {...applyStyles(styles.nav)}>
          <Button render={<Link to="/login" />} variant="ghost">
            {t("landing.nav.login")}
          </Button>
          <Button render={<Link to="/signup" />}>{t("landing.nav.signup")}</Button>
        </nav>
      </div>
    </header>
  );
}
