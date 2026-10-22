import type { ReactNode } from "react";
import {
  Alert,
  AlertDescription,
  applyStyles,
  Button,
  Caption,
  Card,
  CardContent,
  Heading,
  MetaItem,
  MetaTerm,
  MetaValue,
  MetaList,
  Separator,
  typography,
} from "@futrob/ui";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { styles } from "./competition-rules-page.styles.ts";

export function RetryAlert({
  message,
  onRetry,
  t,
}: {
  readonly message: string;
  readonly onRetry: () => void;
  readonly t: Translator;
}) {
  return (
    <Alert variant="destructive">
      <AlertDescription {...applyStyles(styles.retry)}>
        <span>{message}</span>
        <Button onClick={onRetry} variant="secondary">
          {t("common.retry")}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

/** Fixed platform behavior (standings order, 24 h confirmation); not stored per competition. */
export function PlatformRules({ t }: { readonly t: Translator }) {
  const tiebreaks = [
    t("competitionRules.tiebreaks.points"),
    t("competitionRules.tiebreaks.goalDifference"),
    t("competitionRules.tiebreaks.goalsFor"),
  ];
  return (
    <Card>
      <CardContent className={styles.cardBody}>
        <Section
          description={t("competitionRules.platform.description")}
          title={t("competitionRules.platform.title")}
        >
          <Heading as="h4" {...applyStyles(styles.heading)}>
            {t("competitionRules.tiebreaks.title")}
          </Heading>
          <Caption {...applyStyles(styles.help)}>
            {t("competitionRules.tiebreaks.description")}
          </Caption>
          <ol {...applyStyles(styles.tiebreaks)}>
            {tiebreaks.map((criterion, index) => (
              <li key={criterion} {...applyStyles(styles.tiebreak)}>
                <span {...applyStyles(styles.tiebreakIndex)}>{index + 1}</span>
                <span>{criterion}</span>
              </li>
            ))}
          </ol>
          <MetaList columns={1}>
            <Fact label={t("competitionRules.awayGoals")}>
              {t("competitionRules.awayGoalsOff")}
            </Fact>
          </MetaList>
        </Section>
        <Separator />
        <Section title={t("competitionRules.results.title")}>
          <MetaList columns={1}>
            <Fact label={t("competitionRules.results.confirmation")}>
              {t("competitionRules.results.windowValue")}
            </Fact>
          </MetaList>
          <Caption {...applyStyles(styles.help)}>{t("competitionRules.results.fallback")}</Caption>
          <p {...applyStyles(typography.caption, styles.note)}>
            {t("competitionRules.results.officialOnly")}
          </p>
        </Section>
      </CardContent>
    </Card>
  );
}

export function Section({
  title,
  description,
  children,
}: {
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
}) {
  return (
    <section {...applyStyles(styles.section)}>
      <div {...applyStyles(styles.sectionHead)}>
        <Heading {...applyStyles(styles.heading)}>{title}</Heading>
      </div>
      {description ? <Caption {...applyStyles(styles.help)}>{description}</Caption> : null}
      {children}
    </section>
  );
}

export function Fact({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}) {
  return (
    <MetaItem>
      <MetaTerm>{label}</MetaTerm>
      <MetaValue>{children}</MetaValue>
    </MetaItem>
  );
}
