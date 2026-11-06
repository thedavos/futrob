"use client";

import { useState } from "react";
import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  Button,
  Logo,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  typography,
} from "@futrob/ui";
import { media } from "@futrob/ui/styles/media.stylex";
import { space } from "@futrob/ui/styles/tokens.stylex";
import { ListIcon } from "@phosphor-icons/react";
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
    gap: space.s4,
    paddingInline: {
      default: "1.25rem",
      [media.sm]: "2rem",
    },
  },
  start: {
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    gap: space.s8,
  },
  brand: {
    display: "flex",
    minHeight: "2.75rem",
    alignItems: "center",
    gap: space.s3,
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
  links: {
    display: {
      default: "none",
      [media.lg]: "flex",
    },
    alignItems: "center",
    gap: space.s1,
  },
  access: {
    display: "flex",
    flexShrink: 0,
    alignItems: "center",
    gap: space.s1,
  },
  login: {
    display: {
      default: "none",
      [media.sm]: "inline-flex",
    },
  },
  menu: {
    display: {
      default: "flex",
      [media.lg]: "none",
    },
    marginInlineStart: space.s1,
  },
  sheetNav: {
    marginInline: "-1rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    gap: space.s1,
  },
  sheetLink: {
    justifyContent: "flex-start",
  },
  sheetLogin: {
    display: {
      default: "inline-flex",
      [media.sm]: "none",
    },
  },
});

function NavLinks({ onNavigate }: { readonly onNavigate?: () => void }) {
  const { t } = useI18n();
  const linkStyles = onNavigate ? applyStyles(styles.sheetLink) : undefined;
  return (
    <>
      <Button
        onClick={onNavigate}
        render={<Link hash="mecanismo" to="/" />}
        variant="ghost"
        {...linkStyles}
      >
        {t("landing.nav.howItWorks")}
      </Button>
      <Button
        onClick={onNavigate}
        render={<Link hash="portal" to="/" />}
        variant="ghost"
        {...linkStyles}
      >
        {t("landing.nav.portal")}
      </Button>
      <Button onClick={onNavigate} render={<Link to="/pricing" />} variant="ghost" {...linkStyles}>
        {t("landing.nav.pricing")}
      </Button>
    </>
  );
}

export function LandingHeader() {
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const brand = applyStyles(styles.brand);
  const logo = applyStyles(styles.logo);
  const closeMenu = () => setMenuOpen(false);
  return (
    <header {...applyStyles(styles.header)}>
      <div {...applyStyles(styles.inner)}>
        <div {...applyStyles(styles.start)}>
          <Link aria-label="Futrob" className={brand.className} style={brand.style} to="/">
            <Logo className={logo.className} style={logo.style} />
            <span {...applyStyles(typography.heading, styles.wordmark)}>Futrob</span>
          </Link>
          <nav aria-label={t("landing.nav.sectionsAria")} {...applyStyles(styles.links)}>
            <NavLinks />
          </nav>
        </div>
        <nav aria-label={t("landing.nav.aria")} {...applyStyles(styles.access)}>
          <Button render={<Link to="/login" />} variant="ghost" {...applyStyles(styles.login)}>
            {t("landing.nav.login")}
          </Button>
          <Button render={<Link to="/signup" />}>{t("landing.nav.signup")}</Button>
          <div {...applyStyles(styles.menu)}>
            <Sheet onOpenChange={setMenuOpen} open={menuOpen}>
              <SheetTrigger
                render={<Button aria-label={t("shell.nav.open")} size="icon" variant="ghost" />}
              >
                <ListIcon aria-hidden="true" />
              </SheetTrigger>
              <SheetContent closeLabel={t("common.close")} side="right">
                <SheetHeader>
                  <SheetTitle>{t("shell.nav.title")}</SheetTitle>
                </SheetHeader>
                <SheetBody>
                  <nav aria-label={t("landing.nav.sectionsAria")} {...applyStyles(styles.sheetNav)}>
                    <NavLinks onNavigate={closeMenu} />
                    <Button
                      onClick={closeMenu}
                      render={<Link to="/login" />}
                      variant="ghost"
                      {...applyStyles(styles.sheetLink, styles.sheetLogin)}
                    >
                      {t("landing.nav.login")}
                    </Button>
                  </nav>
                </SheetBody>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </div>
    </header>
  );
}
