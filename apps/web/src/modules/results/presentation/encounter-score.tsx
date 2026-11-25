import { Fragment } from "react";
import type { EncounterMatchScoreDto } from "@futrob/api-contracts";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, Score } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";

const styles = stylex.create({
  pill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.375rem",
    flexShrink: 0,
    paddingBlock: "0.25rem",
    paddingInline: "0.625rem",
    borderRadius: "var(--corner-md)",
    backgroundColor: colors.muted,
    color: colors.foreground,
    whiteSpace: "nowrap",
  },
  match: {
    display: "inline-flex",
    alignItems: "baseline",
    gap: "0.1875rem",
  },
  lead: {
    color: colors.primary,
  },
  separator: {
    color: colors.mutedForeground,
  },
});

/** «2–1», or «2–1 · 0–0» when the Encounter has two approved official matches. */
export function formatEncounterScore(score: readonly EncounterMatchScoreDto[]): string {
  return score.map((match) => `${match.homeGoals}–${match.awayGoals}`).join(" · ");
}

/** Compact official score pill: muted surface, tabular numerals, leading goal in primary lime. */
export function EncounterScorePill({
  label,
  score,
}: {
  readonly label: string;
  readonly score: readonly EncounterMatchScoreDto[];
}) {
  return (
    <Score aria-label={label} as="span" className={styles.pill} size="table">
      {score.map((match, index) => {
        const homeLeads = match.homeGoals > match.awayGoals;
        const awayLeads = match.awayGoals > match.homeGoals;
        return (
          <Fragment key={index}>
            {index > 0 ? (
              <span aria-hidden="true" {...applyStyles(styles.separator)}>
                ·
              </span>
            ) : null}
            <span {...applyStyles(styles.match)}>
              <span {...applyStyles(homeLeads && styles.lead)}>{match.homeGoals}</span>
              <span aria-hidden="true">–</span>
              <span {...applyStyles(awayLeads && styles.lead)}>{match.awayGoals}</span>
            </span>
          </Fragment>
        );
      })}
    </Score>
  );
}
