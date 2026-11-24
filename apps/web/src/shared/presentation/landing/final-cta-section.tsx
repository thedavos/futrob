"use client";

import * as stylex from "@stylexjs/stylex";
import { applyStyles, Body, Button, typography } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";

import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { LandingActions, LandingSection } from "@/shared/presentation/landing/landing-section.tsx";
import { ORGANIZER_SIGNUP_SEARCH } from "@/shared/presentation/landing/organizer-signup.ts";

const styles = stylex.create({
  // `typography.headline` sizes itself against this box, as in the hero.
  headlineBox: {
    containerType: "inline-size",
  },
  // Its first line is longer than any hero line, so it scales down to stay on one line.
  headline: {
    fontSize: "clamp(2.5rem, 12cqi, 6rem)",
  },
  line: {
    display: "block",
    whiteSpace: "nowrap",
  },
  official: {
    color: colors.primary,
  },
  subtitle: {
    maxWidth: "44ch",
  },
});

/** Closing call to action: echoes the hero promise in its headline face. */
export function FinalCtaSection() {
  const { t } = useI18n();
  return (
    <LandingSection
      header={
        <>
          <div {...applyStyles(styles.headlineBox)}>
            <h2 {...applyStyles(typography.host, typography.headline, styles.headline)}>
              <span {...applyStyles(styles.line)}>{t("landing.cta.title.line1")}</span>{" "}
              <span {...applyStyles(styles.line, styles.official)}>
                {t("landing.cta.title.official")}
              </span>
            </h2>
          </div>
          <Body size="lg" tone="muted" {...applyStyles(styles.subtitle)}>
            {t("landing.cta.subtitle")}
          </Body>
          <LandingActions>
            <Button render={<Link search={ORGANIZER_SIGNUP_SEARCH} to="/signup" />}>
              {t("landing.cta.primary")}
              <ArrowRightIcon aria-hidden="true" />
            </Button>
            <Button render={<Link to="/pricing" />} variant="outline">
              {t("landing.cta.secondary")}
            </Button>
          </LandingActions>
        </>
      }
    />
  );
}
