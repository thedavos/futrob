"use client";

import * as stylex from "@stylexjs/stylex";
import { applyStyles, Badge, Score, Text } from "@futrob/ui";
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
  board: {
    minWidth: 0,
    overflow: "hidden",
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.borderSubtle,
    paddingInline: "1.25rem",
    paddingBlock: "0.875rem",
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
    paddingInline: {
      default: "1rem",
      [media.sm]: "1.25rem",
    },
    paddingBlock: "1rem",
  },
  team: {
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    gap: "0.625rem",
  },
  teamAway: {
    justifyContent: "flex-end",
    textAlign: "right",
  },
  crest: {
    width: "1.5rem",
    height: "1.5rem",
    flexShrink: 0,
  },
  teamName: {
    minWidth: 0,
    overflowWrap: "break-word",
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

export function EncounterBoard() {
  const { t } = useI18n();
  const crest = applyStyles(styles.crest);
  const status = applyStyles(styles.status);
  return (
    <figure aria-label={t("landing.board.label")} {...applyStyles(styles.board)}>
      <figcaption {...applyStyles(styles.header)}>
        <Text as="span" look="label">
          {t("landing.board.matchday")}
        </Text>
        <Text as="span" look="caption" tone="muted">
          {t("landing.board.competition")}
        </Text>
      </figcaption>
      <ul>
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
            <Score
              as="span"
              align="center"
              tone={row.homeGoals === null || row.awayGoals === null ? "muted" : "default"}
              {...applyStyles(styles.score)}
            >
              {row.homeGoals === null || row.awayGoals === null
                ? "—"
                : `${row.homeGoals}–${row.awayGoals}`}
            </Score>
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
    </figure>
  );
}
