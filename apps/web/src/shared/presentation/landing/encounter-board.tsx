"use client";

import * as stylex from "@stylexjs/stylex";
import { applyStyles, Score, Text, typography } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import { ClubCrestAvatar } from "@/shared/presentation/club-crest-avatar.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";

const JOURNEY = ["sync", "selection", "approval", "publication"] as const;

type RowStatus = "approved" | "selecting" | "synced" | "scheduled";

const STATUS_PROGRESS = {
  synced: { completed: 1, tone: "info" },
  selecting: { completed: 2, tone: "warning" },
  approved: { completed: 3, tone: "approved" },
  scheduled: { completed: 0, tone: "muted" },
} as const satisfies Record<
  RowStatus,
  { completed: number; tone: "info" | "warning" | "approved" | "muted" }
>;

interface DemoRow {
  readonly home: string;
  readonly away: string;
  readonly score: { readonly home: number; readonly away: number } | null;
  readonly status: RowStatus;
}

const ROWS: readonly DemoRow[] = [
  { home: "Real Cuervos", away: "Atlético Norte", score: { home: 2, away: 1 }, status: "approved" },
  { home: "Deportivo Sur", away: "FC Titanes", score: { home: 0, away: 0 }, status: "selecting" },
  { home: "Unión Barrio", away: "Rayo Capital", score: { home: 3, away: 2 }, status: "synced" },
  { home: "Sporting Lomas", away: "CD Estrella", score: null, status: "scheduled" },
];

const styles = stylex.create({
  board: {
    minWidth: 0,
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingInline: {
      default: "1rem",
      [media.sm]: "1.5rem",
    },
    paddingBlock: "1.25rem",
  },
  header: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: "0.75rem",
    paddingBottom: "0.75rem",
  },
  matchday: {
    fontSize: "var(--text-xl)",
    lineHeight: "1.75rem",
    fontWeight: 700,
  },
  row: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
    alignItems: "center",
    columnGap: "0.75rem",
    rowGap: "0.75rem",
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.borderSubtle,
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
    width: "1.75rem",
    height: "1.75rem",
    flexShrink: 0,
  },
  teamName: {
    minWidth: 0,
    overflowWrap: "break-word",
    fontSize: {
      default: "0.875rem",
      [media.sm]: "1rem",
    },
    lineHeight: "1.375rem",
    fontWeight: 600,
  },
  score: {
    minWidth: "5.5rem",
    textAlign: "center",
    whiteSpace: "nowrap",
    fontSize: {
      default: "var(--text-2xl)",
      [media.sm]: "var(--text-3xl)",
    },
    lineHeight: 1.1,
  },
  kickoff: {
    minWidth: "5.5rem",
    textAlign: "center",
    whiteSpace: "nowrap",
    color: colors.mutedForeground,
    fontWeight: 600,
  },
  progress: {
    gridColumnStart: 1,
    gridColumnEnd: -1,
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr)) 6.5rem",
    alignItems: "center",
    gap: "0.25rem",
  },
  segment: {
    height: "0.25rem",
    borderRadius: "var(--corner-full)",
    backgroundColor: colors.surfaceRaised,
  },
  state: {
    justifySelf: "end",
    textAlign: "right",
    fontWeight: 600,
  },
  legend: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr)) 6.5rem",
    gap: "0.25rem",
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.borderSubtle,
    paddingTop: "0.75rem",
  },
});

const TONE_FILL = stylex.create({
  info: { backgroundColor: colors.info },
  warning: { backgroundColor: colors.warning },
  approved: { backgroundColor: colors.approved },
  muted: { backgroundColor: colors.surfaceRaised },
});

const TONE_TEXT = stylex.create({
  info: { color: colors.info },
  warning: { color: colors.warning },
  approved: { color: colors.approved },
  muted: { color: colors.mutedForeground },
});

export function EncounterBoard() {
  const { t } = useI18n();
  const crest = applyStyles(styles.crest);
  return (
    <figure aria-label={t("landing.board.label")} {...applyStyles(styles.board)}>
      <figcaption {...applyStyles(styles.header)}>
        <span {...applyStyles(styles.matchday)}>{t("landing.board.matchday")}</span>
        <Text as="span" look="caption" tone="muted">
          {t("landing.board.competition")}
        </Text>
      </figcaption>
      <ul>
        {ROWS.map((row) => {
          const progress = STATUS_PROGRESS[row.status];
          return (
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
              {row.score === null ? (
                <span {...applyStyles(styles.kickoff)}>{t("landing.board.kickoff")}</span>
              ) : (
                <Score as="span" align="center" {...applyStyles(styles.score)}>
                  {`${row.score.home}–${row.score.away}`}
                </Score>
              )}
              <span {...applyStyles(styles.team, styles.teamAway)}>
                <span {...applyStyles(styles.teamName)}>{row.away}</span>
                <ClubCrestAvatar
                  className={crest.className}
                  imageUrl={null}
                  name={row.away}
                  style={crest.style}
                />
              </span>
              <span {...applyStyles(styles.progress)}>
                {JOURNEY.map((step, index) => (
                  <span
                    aria-hidden="true"
                    key={step}
                    {...applyStyles(
                      styles.segment,
                      index < progress.completed && TONE_FILL[progress.tone],
                    )}
                  />
                ))}
                <span {...applyStyles(typography.caption, styles.state, TONE_TEXT[progress.tone])}>
                  {t(`landing.status.${row.status}`)}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      <div aria-hidden="true" {...applyStyles(styles.legend)}>
        {JOURNEY.map((step) => (
          <Text as="span" key={step} look="caption" tone="muted">
            {t(`landing.mechanism.${step}.title`)}
          </Text>
        ))}
      </div>
    </figure>
  );
}
