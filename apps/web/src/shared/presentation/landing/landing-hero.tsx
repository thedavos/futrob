"use client";

import * as stylex from "@stylexjs/stylex";
import { applyStyles, Body, Button, Caption, Text, typography } from "@futrob/ui";
import { colors, space } from "@futrob/ui/styles/tokens.stylex";
import { ArrowRightIcon, CheckIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";

import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { CupBracket } from "@/shared/presentation/landing/cup-bracket.tsx";
import { LandingActions, LandingSection } from "@/shared/presentation/landing/landing-section.tsx";

const riseIn = stylex.keyframes({
  from: { opacity: 0, translate: "0 0.75rem" },
  to: { opacity: 1, translate: "0 0" },
});

const turnOfficial = stylex.keyframes({
  from: { color: colors.textDisabled },
  to: { color: colors.primary },
});

const styles = stylex.create({
  // `typography.headline` sizes itself against this box, so the lines always fit the copy column.
  headlineBox: {
    containerType: "inline-size",
  },
  line: {
    display: "block",
    whiteSpace: "nowrap",
  },
  reveal: {
    animationName: riseIn,
    animationDuration: "var(--duration-slow)",
    animationTimingFunction: "var(--ease-emphasized)",
    animationFillMode: "both",
  },
  official: {
    color: colors.primary,
    animationName: turnOfficial,
    animationDuration: "var(--duration-slow)",
    animationTimingFunction: "var(--ease-standard)",
    animationFillMode: "both",
  },
  subtitle: {
    maxWidth: "44ch",
  },
  // Kicker and headline read as one heading: tighter than the copy column's rhythm.
  heading: {
    display: "flex",
    flexDirection: "column",
    gap: space.s3,
  },
  kicker: {
    textTransform: "uppercase",
  },
  facts: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexWrap: "wrap",
    columnGap: space.s5,
    rowGap: space.s2,
  },
  fact: {
    display: "flex",
    alignItems: "center",
    gap: space.s1,
  },
  factIcon: {
    flexShrink: 0,
    color: colors.success,
  },
});

const FACT_KEYS = ["landing.hero.facts.free", "landing.hero.facts.noCard"] as const;

/** Position on the hero timeline, in `--duration-fast` steps. See `cup-bracket.tsx`. */
const delay = stylex.create({
  line2: { animationDelay: "calc(var(--duration-fast) * 1)" },
  line3: { animationDelay: "calc(var(--duration-fast) * 2)" },
  subtitle: { animationDelay: "calc(var(--duration-fast) * 3)" },
  actions: { animationDelay: "calc(var(--duration-fast) * 4)" },
  facts: { animationDelay: "calc(var(--duration-fast) * 5)" },
  official: { animationDelay: "calc(var(--duration-fast) * 9)" },
});

export function LandingHero() {
  const { t } = useI18n();
  return (
    <LandingSection
      as="h1"
      header={
        <>
          <hgroup {...applyStyles(styles.heading)}>
            <Text as="p" look="label" {...applyStyles(styles.kicker, styles.reveal)}>
              {t("landing.hero.kicker")}
            </Text>
            <div {...applyStyles(styles.headlineBox)}>
              <h1 {...applyStyles(typography.host, typography.headline)}>
                <span {...applyStyles(styles.line, styles.reveal)}>
                  {t("landing.hero.title.line1")}
                </span>{" "}
                <span {...applyStyles(styles.line, styles.reveal, delay.line2)}>
                  {t("landing.hero.title.line2")}
                </span>{" "}
                <span {...applyStyles(styles.line, styles.reveal, delay.line3)}>
                  <span {...applyStyles(styles.official, delay.official)}>
                    {t("landing.hero.title.official")}
                  </span>
                </span>
              </h1>
            </div>
          </hgroup>
          <Body
            size="lg"
            tone="muted"
            {...applyStyles(styles.subtitle, styles.reveal, delay.subtitle)}
          >
            {t("landing.hero.subtitle")}
          </Body>
          <div {...applyStyles(styles.reveal, delay.actions)}>
            <LandingActions>
              <Button render={<Link to="/signup" />}>
                {t("landing.hero.cta.primary")}
                <ArrowRightIcon aria-hidden="true" />
              </Button>
              <Button render={<a href="#portal" />} variant="outline">
                {t("landing.hero.cta.secondary")}
              </Button>
            </LandingActions>
          </div>
          <ul
            aria-label={t("landing.hero.facts.label")}
            {...applyStyles(styles.facts, styles.reveal, delay.facts)}
          >
            {FACT_KEYS.map((key) => (
              <li key={key} {...applyStyles(styles.fact)}>
                <CheckIcon aria-hidden="true" weight="bold" {...applyStyles(styles.factIcon)} />
                <Caption as="span">{t(key)}</Caption>
              </li>
            ))}
          </ul>
        </>
      }
    >
      <CupBracket />
    </LandingSection>
  );
}
