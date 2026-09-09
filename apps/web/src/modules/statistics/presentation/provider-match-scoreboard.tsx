import { Fragment, type ReactNode } from "react";
import type { PlayerRecentProviderMatchDto } from "@futrob/api-contracts";
import { applyStyles, type StyleXStyles } from "@futrob/ui";
import { MatchClubSide, scoreDigitStyle } from "./player-match-row-parts.tsx";
import { rowElevation, rowTypography, styles } from "./player-match-row.styles.ts";
import { matchOutcome } from "./player-match-view.ts";

export function MatchHeaderMeta({ items }: { readonly items: readonly ReactNode[] }) {
  const parts = items.filter((item) => item !== null && item !== false && item !== undefined);
  return (
    <div {...applyStyles(styles.meta)}>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {index > 0 ? (
            <span aria-hidden="true" {...applyStyles(rowTypography.caption, styles.muted)}>
              ·
            </span>
          ) : null}
          {part}
        </Fragment>
      ))}
    </div>
  );
}

export function ProviderMatchScore({
  finalizedLabel,
  item,
  redCardsAway,
  redCardsHome,
  redCardsLabel,
  scoreRowClassName,
  vsLabel,
}: {
  readonly finalizedLabel: string;
  readonly item: PlayerRecentProviderMatchDto;
  readonly redCardsAway: number | null;
  readonly redCardsHome: number | null;
  readonly redCardsLabel: string;
  readonly scoreRowClassName?: StyleXStyles;
  readonly vsLabel: string;
}) {
  const { match } = item;
  const outcome = matchOutcome(item);
  return (
    <div {...applyStyles(styles.scoreRow, scoreRowClassName)}>
      <MatchClubSide
        imageUrl={match.home.imageUrl}
        name={match.home.name}
        redCards={redCardsHome}
        redCardsLabel={redCardsLabel}
      />
      <div {...applyStyles(styles.scoreStack)}>
        <span data-match-status="finalized" {...applyStyles(rowTypography.caption, styles.status)}>
          {finalizedLabel}
        </span>
        <div
          data-match-outcome={outcome === "unknown" ? undefined : outcome}
          data-match-score=""
          {...applyStyles(styles.score, rowElevation.score)}
        >
          <span
            data-score-digit="home"
            data-score-lead={match.home.goals > match.away.goals ? "home" : undefined}
            {...applyStyles(
              rowTypography.score,
              styles.scoreDigit,
              scoreDigitStyle(match.home.goals, match.away.goals, "home"),
            )}
          >
            {match.home.goals}
          </span>
          <span {...applyStyles(rowTypography.score, styles.vs)}>{vsLabel}</span>
          <span
            data-score-digit="away"
            data-score-lead={match.away.goals > match.home.goals ? "away" : undefined}
            {...applyStyles(
              rowTypography.score,
              styles.scoreDigit,
              scoreDigitStyle(match.home.goals, match.away.goals, "away"),
            )}
          >
            {match.away.goals}
          </span>
        </div>
      </div>
      <MatchClubSide
        imageUrl={match.away.imageUrl}
        name={match.away.name}
        redCards={redCardsAway}
        redCardsLabel={redCardsLabel}
      />
    </div>
  );
}
