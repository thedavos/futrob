"use client";

import * as stylex from "@stylexjs/stylex";
import { applyStyles, typography, type Icon } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import {
  CalendarCheckIcon,
  ChartLineUpIcon,
  ListChecksIcon,
  MedalIcon,
  RankingIcon,
  TableIcon,
} from "@phosphor-icons/react";

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

const PORTAL_POINTS = [
  { key: "teams", icon: CalendarCheckIcon },
  { key: "results", icon: TableIcon },
  { key: "rankings", icon: RankingIcon },
] as const;

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
    gap: "5rem",
    paddingInline: {
      default: "1.25rem",
      [media.sm]: "2rem",
    },
    paddingBlock: {
      default: "5rem",
      [media.lg]: "7rem",
    },
  },
  players: {
    display: "grid",
    alignItems: "center",
    gap: {
      default: "2.5rem",
      [media.lg]: "4rem",
    },
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.lg]: "repeat(2, minmax(0, 1fr))",
    },
  },
  copy: {
    display: "flex",
    maxWidth: "28rem",
    flexDirection: "column",
    gap: "1.5rem",
  },
  subtitle: {
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
  playerList: {
    display: "grid",
    gap: "1.5rem",
  },
  playerItem: {
    display: "flex",
    gap: "1rem",
  },
  iconWrap: {
    flexShrink: 0,
  },
  icon: {
    width: "2rem",
    height: "2rem",
    color: colors.primary,
  },
  playerTitle: {
    fontWeight: 600,
  },
  playerBody: {
    marginTop: "0.25rem",
    color: colors.mutedForeground,
  },
  portal: {
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.borderSubtle,
    paddingTop: "5rem",
  },
  portalCopy: {
    marginInline: "auto",
    display: "flex",
    maxWidth: "42rem",
    flexDirection: "column",
    gap: "1.5rem",
    textAlign: "center",
  },
  portalList: {
    marginInline: "auto",
    marginTop: "3rem",
    display: "grid",
    maxWidth: "56rem",
    gap: "2rem",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "repeat(3, minmax(0, 1fr))",
    },
  },
  portalItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.75rem",
    textAlign: "center",
  },
  portalLabel: {
    fontWeight: 500,
  },
});

export function AudiencesSection() {
  const { t } = useI18n();
  const icon = applyStyles(styles.icon);
  return (
    <section {...applyStyles(styles.section)}>
      <div {...applyStyles(styles.inner)}>
        <div {...applyStyles(styles.players)}>
          <div {...applyStyles(styles.copy)}>
            <h2 {...applyStyles(typography.display)}>{t("landing.players.title")}</h2>
            <p {...applyStyles(typography.subtitle, styles.subtitle)}>
              {t("landing.players.subtitle")}
            </p>
          </div>
          <ul {...applyStyles(styles.playerList)}>
            {PLAYER_POINTS.map((point) => (
              <li key={point.key} {...applyStyles(styles.playerItem)}>
                <span aria-hidden="true" {...applyStyles(styles.iconWrap)}>
                  <point.icon className={icon.className} style={icon.style} />
                </span>
                <div>
                  <h3 {...applyStyles(styles.playerTitle)}>
                    {t(`landing.players.${point.key}.title`)}
                  </h3>
                  <p {...applyStyles(typography.body, styles.playerBody)}>
                    {t(`landing.players.${point.key}.description`)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div {...applyStyles(styles.portal)}>
          <div {...applyStyles(styles.portalCopy)}>
            <h2 {...applyStyles(typography.display)}>{t("landing.portal.title")}</h2>
            <p {...applyStyles(typography.subtitle, styles.subtitle)}>
              {t("landing.portal.subtitle")}
            </p>
          </div>
          <ul {...applyStyles(styles.portalList)}>
            {PORTAL_POINTS.map((point) => (
              <li key={point.key} {...applyStyles(styles.portalItem)}>
                <span aria-hidden="true">
                  <point.icon className={icon.className} style={icon.style} />
                </span>
                <span {...applyStyles(typography.body, styles.portalLabel)}>
                  {t(`landing.portal.point.${point.key}`)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
