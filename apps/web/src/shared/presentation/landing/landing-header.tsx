"use client";

import { Button, Logo } from "@futrob/ui";
import { Link } from "@tanstack/react-router";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";

export function LandingHeader() {
  const { t } = useI18n();
  return (
    <header className="shrink-0">
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link aria-label="Futrob" className="flex items-center gap-3" to="/">
          <Logo className="h-9 w-auto" />
          <span className="typo-heading tracking-wide max-sm:hidden">Futrob</span>
        </Link>
        <nav aria-label={t("landing.nav.aria")} className="flex items-center gap-1">
          <Button render={<Link to="/login" />} variant="ghost">
            {t("landing.nav.login")}
          </Button>
          <Button render={<Link to="/signup" />}>{t("landing.nav.signup")}</Button>
        </nav>
      </div>
    </header>
  );
}
