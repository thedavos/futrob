import type { EncounterViewDto } from "@futrob/api-contracts";
import { applyStyles, elevation, Score, Text, vis } from "@futrob/ui";
import type { TeamScore } from "./encounter-preview.ts";
import { styles } from "./encounter-page.styles.ts";

export type Formats = {
  readonly kickoff: Intl.DateTimeFormat;
  readonly clock: Intl.DateTimeFormat;
};

export function TeamScoreLine({
  score,
  view,
}: {
  readonly score: TeamScore;
  readonly view: EncounterViewDto;
}) {
  const homeLeads = score.home > score.away;
  const awayLeads = score.away > score.home;
  const scoreText = `${score.home}–${score.away}`;
  return (
    <div {...applyStyles(styles.scoreLine)}>
      <Text tone="default" weight="semibold" className={styles.scoreHome}>
        {view.home.name}
      </Text>
      <span {...applyStyles(styles.scorePill, elevation.sm)}>
        <Score as="span">
          <span {...applyStyles(vis.srOnly)}>{scoreText}</span>
          <span aria-hidden="true">
            <span {...applyStyles(homeLeads && styles.scoreLead)}>{score.home}</span>
            <span {...applyStyles(styles.scoreDash)}>–</span>
            <span {...applyStyles(awayLeads && styles.scoreLead)}>{score.away}</span>
          </span>
        </Score>
      </span>
      <Text tone="default" weight="semibold" className={styles.scoreAway}>
        {view.away.name}
      </Text>
    </div>
  );
}
