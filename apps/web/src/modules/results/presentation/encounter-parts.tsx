import type { EncounterViewDto } from "@futrob/api-contracts";
import { Alert, AlertDescription, applyStyles, Button, Score, Text } from "@futrob/ui";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
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

export function RetryAlert({
  message,
  retry,
  t,
}: {
  readonly message: string;
  readonly retry: () => void;
  readonly t: Translator;
}) {
  return (
    <Alert variant="destructive">
      <AlertDescription {...applyStyles(styles.error)}>
        <span>{message}</span>
        <Button onClick={retry} variant="secondary">
          {t("common.retry")}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
