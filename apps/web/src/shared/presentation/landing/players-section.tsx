"use client";

import * as stylex from "@stylexjs/stylex";
import { applyStyles, Body, Display, Subtitle, type Icon } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import { ChartLineUpIcon, ListChecksIcon, MedalIcon } from "@phosphor-icons/react";

import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";

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
  section: {
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.borderSubtle,
  },
  inner: {
    marginInline: "auto",
    display: "grid",
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
      default: "5rem",
      [media.lg]: "6rem",
    },
  },
  copy: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  subtitle: {
    maxWidth: "40ch",
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
    <section {...applyStyles(styles.section)}>
      <div {...applyStyles(styles.inner)}>
        <div {...applyStyles(styles.copy)}>
          <Display as="h2">{t("landing.players.title")}</Display>
          <Subtitle {...applyStyles(styles.subtitle)}>{t("landing.players.subtitle")}</Subtitle>
        </div>
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
      </div>
    </section>
  );
}
