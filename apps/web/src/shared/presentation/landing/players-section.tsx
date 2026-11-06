"use client";

import * as stylex from "@stylexjs/stylex";
import { applyStyles, Body, type Icon } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { ChartLineUpIcon, ListChecksIcon, MedalIcon } from "@phosphor-icons/react";

import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { LandingSection } from "@/shared/presentation/landing/landing-section.tsx";

interface PlayerPoint {
  readonly key: "matches" | "stats" | "feats";
  readonly icon: Icon;
}

const PLAYER_POINTS: readonly PlayerPoint[] = [
  { key: "matches", icon: ListChecksIcon },
  { key: "stats", icon: ChartLineUpIcon },
  { key: "feats", icon: MedalIcon },
];

const styles = stylex.create({
  list: {
    display: "grid",
    gap: "1.75rem",
  },
  item: {
    display: "flex",
    gap: "1rem",
  },
  icon: {
    width: "1.75rem",
    height: "1.75rem",
    flexShrink: 0,
    color: colors.primary,
  },
  title: {
    fontSize: "var(--text-lg)",
    lineHeight: "1.75rem",
    fontWeight: 600,
  },
  body: {
    marginTop: "0.25rem",
    maxWidth: "52ch",
    color: colors.mutedForeground,
  },
});

export function PlayersSection() {
  const { t } = useI18n();
  const icon = applyStyles(styles.icon);
  return (
    <LandingSection subtitle={t("landing.players.subtitle")} title={t("landing.players.title")}>
      <ul {...applyStyles(styles.list)}>
        {PLAYER_POINTS.map((point) => (
          <li key={point.key} {...applyStyles(styles.item)}>
            <point.icon aria-hidden="true" className={icon.className} style={icon.style} />
            <div>
              <h3 {...applyStyles(styles.title)}>{t(`landing.players.${point.key}.title`)}</h3>
              <Body tone="muted" {...applyStyles(styles.body)}>
                {t(`landing.players.${point.key}.description`)}
              </Body>
            </div>
          </li>
        ))}
      </ul>
    </LandingSection>
  );
}
