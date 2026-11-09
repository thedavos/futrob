"use client";

import * as stylex from "@stylexjs/stylex";
import { applyStyles, Caption } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import { ClubCrestAvatar } from "@/shared/presentation/club-crest-avatar.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { LandingSection } from "@/shared/presentation/landing/landing-section.tsx";

interface StandingRow {
  readonly team: string;
  readonly points: number;
}

const STANDINGS = [
  { team: "Real Cuervos", points: 12 },
  { team: "Unión Barrio", points: 7 },
  { team: "FC Titanes", points: 6 },
  { team: "Atlético Norte", points: 4 },
  { team: "Sporting Lomas", points: 3 },
] as const satisfies readonly StandingRow[];

const [LEADER, ...CHASERS] = STANDINGS;
const PODIUM_CHASERS = CHASERS.slice(0, 2);
const REST = CHASERS.slice(2);

const POINT_KEYS = ["teams", "results", "rankings"] as const;

const styles = stylex.create({
  points: {
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.border,
  },
  point: {
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.border,
    paddingBlock: "0.75rem",
    fontWeight: 500,
  },
  podium: {
    minWidth: 0,
    display: "grid",
    gap: "0.75rem",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "minmax(0, 1.3fr) minmax(0, 1fr)",
    },
  },
  leader: {
    display: "flex",
    minHeight: "15rem",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: "1.5rem",
    borderRadius: "var(--corner-xl)",
    backgroundColor: colors.accent,
    padding: "1.5rem",
  },
  leaderRank: {
    color: colors.primary,
    fontSize: "7rem",
    fontWeight: 800,
    lineHeight: 0.85,
    letterSpacing: "-0.05em",
    fontVariantNumeric: "tabular-nums",
  },
  leaderFoot: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: "1rem",
  },
  leaderName: {
    fontSize: "var(--text-xl)",
    lineHeight: "1.75rem",
    fontWeight: 700,
  },
  leaderPoints: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
  },
  leaderPointsValue: {
    fontSize: "var(--text-4xl)",
    fontWeight: 800,
    lineHeight: 1,
    fontVariantNumeric: "tabular-nums",
  },
  chasers: {
    display: "grid",
    gap: "0.75rem",
  },
  chaser: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    borderRadius: "var(--corner-xl)",
    backgroundColor: colors.surface,
    paddingInline: "1.25rem",
    paddingBlock: "1rem",
  },
  chaserRank: {
    width: "2.25rem",
    color: colors.mutedForeground,
    fontSize: "var(--text-4xl)",
    fontWeight: 800,
    lineHeight: 1,
    fontVariantNumeric: "tabular-nums",
  },
  team: {
    display: "flex",
    minWidth: 0,
    flexGrow: 1,
    alignItems: "center",
    gap: "0.625rem",
    overflowWrap: "break-word",
    fontWeight: 600,
  },
  chaserPoints: {
    fontSize: "var(--text-2xl)",
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums",
  },
  rest: {
    gridColumnStart: 1,
    gridColumnEnd: -1,
  },
  restRow: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.border,
    paddingInline: "0.25rem",
    paddingBlock: "0.75rem",
  },
  restRank: {
    width: "2.25rem",
    color: colors.mutedForeground,
    textAlign: "center",
    fontVariantNumeric: "tabular-nums",
  },
  restPoints: {
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums",
  },
  crest: {
    width: "1.5rem",
    height: "1.5rem",
    flexShrink: 0,
  },
  caption: {
    gridColumnStart: 1,
    gridColumnEnd: -1,
  },
});

export function PortalSection() {
  const { t } = useI18n();
  const crest = applyStyles(styles.crest);
  const pointsLabel = t("landing.portal.podium.points");
  return (
    <LandingSection
      copy={
        <ul {...applyStyles(styles.points)}>
          {POINT_KEYS.map((key) => (
            <li key={key} {...applyStyles(styles.point)}>
              {t(`landing.portal.point.${key}`)}
            </li>
          ))}
        </ul>
      }
      id="portal"
      subtitle={t("landing.portal.subtitle")}
      title={t("landing.portal.title")}
      tone="band"
    >
      <figure {...applyStyles(styles.podium)}>
        <div {...applyStyles(styles.leader)}>
          <span aria-hidden="true" {...applyStyles(styles.leaderRank)}>
            1
          </span>
          <div {...applyStyles(styles.leaderFoot)}>
            <span {...applyStyles(styles.team, styles.leaderName)}>
              <ClubCrestAvatar
                className={crest.className}
                imageUrl={null}
                name={LEADER.team}
                style={crest.style}
              />
              {LEADER.team}
            </span>
            <span {...applyStyles(styles.leaderPoints)}>
              <span {...applyStyles(styles.leaderPointsValue)}>{LEADER.points}</span>
              <Caption as="span">{pointsLabel}</Caption>
            </span>
          </div>
        </div>
        <ol start={2} {...applyStyles(styles.chasers)}>
          {PODIUM_CHASERS.map((row, index) => (
            <li key={row.team} {...applyStyles(styles.chaser)}>
              <span aria-hidden="true" {...applyStyles(styles.chaserRank)}>
                {index + 2}
              </span>
              <span {...applyStyles(styles.team)}>
                <ClubCrestAvatar
                  className={crest.className}
                  imageUrl={null}
                  name={row.team}
                  style={crest.style}
                />
                {row.team}
              </span>
              <span {...applyStyles(styles.chaserPoints)}>{row.points}</span>
            </li>
          ))}
        </ol>
        <ol start={PODIUM_CHASERS.length + 2} {...applyStyles(styles.rest)}>
          {REST.map((row, index) => (
            <li key={row.team} {...applyStyles(styles.restRow)}>
              <span aria-hidden="true" {...applyStyles(styles.restRank)}>
                {index + PODIUM_CHASERS.length + 2}
              </span>
              <span {...applyStyles(styles.team)}>
                <ClubCrestAvatar
                  className={crest.className}
                  imageUrl={null}
                  name={row.team}
                  style={crest.style}
                />
                {row.team}
              </span>
              <span {...applyStyles(styles.restPoints)}>{row.points}</span>
            </li>
          ))}
        </ol>
        <figcaption {...applyStyles(styles.caption)}>
          <Caption as="span">{t("landing.portal.podium.caption")}</Caption>
        </figcaption>
      </figure>
    </LandingSection>
  );
}
