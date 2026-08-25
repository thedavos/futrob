"use client";

import * as stylex from "@stylexjs/stylex";
import { applyStyles, Badge, typography } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import { ClubCrestAvatar } from "@/shared/presentation/club-crest-avatar.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";

type RowStatus = "approved" | "selecting" | "synced" | "scheduled";

interface DemoRow {
  readonly home: string;
  readonly away: string;
  readonly homeGoals: number | null;
  readonly awayGoals: number | null;
  readonly status: RowStatus;
}

const ROWS: readonly DemoRow[] = [
  { home: "Real Cuervos", away: "Atlético Norte", homeGoals: 2, awayGoals: 1, status: "approved" },
  { home: "Deportivo Sur", away: "FC Titanes", homeGoals: 0, awayGoals: 0, status: "selecting" },
  { home: "Unión Barrio", away: "Rayo Capital", homeGoals: 3, awayGoals: 2, status: "synced" },
  {
    home: "Sporting Lomas",
    away: "CD Estrella",
    homeGoals: null,
    awayGoals: null,
    status: "scheduled",
  },
];

const STATUS_BADGE_VARIANT = {
  approved: "approved",
  selecting: "warning",
  synced: "info",
  scheduled: "neutral",
} as const;

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
    gap: {
      default: "2.5rem",
      [media.lg]: "4rem",
    },
    paddingInline: {
      default: "1.25rem",
      [media.sm]: "2rem",
    },
    paddingBlock: {
      default: "5rem",
      [media.lg]: "7rem",
    },
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.lg]: "0.8fr 1.2fr",
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
  table: {
    overflow: "hidden",
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tableHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
    paddingInline: "1.25rem",
    paddingBlock: "0.875rem",
  },
  matchday: {
    color: colors.mutedForeground,
  },
  rows: {
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.borderSubtle,
  },
  row: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
    alignItems: "center",
    columnGap: "0.75rem",
    rowGap: "0.375rem",
    borderBottomWidth: {
      default: 1,
      ":last-child": 0,
    },
    borderBottomStyle: "solid",
    borderBottomColor: colors.borderSubtle,
    paddingInline: "1.25rem",
    paddingBlock: "0.875rem",
  },
  team: {
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    gap: "0.625rem",
  },
  teamAway: {
    justifyContent: "flex-end",
  },
  crest: {
    width: "1.5rem",
    height: "1.5rem",
  },
  teamName: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    fontWeight: 500,
  },
  score: {
    paddingInline: "0.5rem",
    textAlign: "center",
  },
  status: {
    gridColumnStart: 2,
    gridRowStart: 2,
    justifySelf: "center",
  },
});

export function EncounterRowsSection() {
  const { t } = useI18n();
  const crest = applyStyles(styles.crest);
  const status = applyStyles(styles.status);
  return (
    <section {...applyStyles(styles.section)}>
      <div {...applyStyles(styles.inner)}>
        <div {...applyStyles(styles.copy)}>
          <h2 {...applyStyles(typography.display)}>{t("landing.matches.title")}</h2>
          <p {...applyStyles(typography.subtitle, styles.subtitle)}>
            {t("landing.matches.subtitle")}
          </p>
        </div>
        <div {...applyStyles(styles.table)}>
          <div {...applyStyles(styles.tableHeader)}>
            <span {...applyStyles(typography.label, styles.matchday)}>
              {t("landing.matches.matchday")}
            </span>
          </div>
          <ul {...applyStyles(styles.rows)}>
            {ROWS.map((row) => (
              <li key={`${row.home}-${row.away}`} {...applyStyles(styles.row)}>
                <span {...applyStyles(styles.team)}>
                  <ClubCrestAvatar
                    className={crest.className}
                    imageUrl={null}
                    name={row.home}
                    style={crest.style}
                  />
                  <span {...applyStyles(styles.teamName)}>{row.home}</span>
                </span>
                <span {...applyStyles(typography.score, styles.score)}>
                  {row.homeGoals === null || row.awayGoals === null
                    ? "—"
                    : `${row.homeGoals} – ${row.awayGoals}`}
                </span>
                <span {...applyStyles(styles.team, styles.teamAway)}>
                  <span {...applyStyles(styles.teamName)}>{row.away}</span>
                  <ClubCrestAvatar
                    className={crest.className}
                    imageUrl={null}
                    name={row.away}
                    style={crest.style}
                  />
                </span>
                <Badge
                  className={status.className}
                  style={status.style}
                  variant={STATUS_BADGE_VARIANT[row.status]}
                >
                  {t(`landing.status.${row.status}`)}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
