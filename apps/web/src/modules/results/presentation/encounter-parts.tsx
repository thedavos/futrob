import type { EncounterViewDto } from "@futrob/api-contracts";
import { applyStyles, Score, Text } from "@futrob/ui";
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
  return (
    <div {...applyStyles(styles.scoreLine)}>
      <Text tone="default" weight="semibold" className={styles.scoreHome}>
        {view.home.name}
      </Text>
      <span {...applyStyles(styles.scorePill)}>
        <Score as="span">{`${score.home}–${score.away}`}</Score>
      </span>
      <Text tone="default" weight="semibold" className={styles.scoreAway}>
        {view.away.name}
      </Text>
    </div>
  );
}
