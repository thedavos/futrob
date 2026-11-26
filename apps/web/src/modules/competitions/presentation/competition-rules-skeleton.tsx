import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  Caption,
  Card,
  CardContent,
  Heading,
  MetaItem,
  MetaList,
  MetaTerm,
  MetaValue,
  Separator,
  Skeleton,
  vis,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { styles } from "./competition-rules-page.styles.ts";
import { Section } from "./competition-rules-parts.tsx";

const bones = stylex.create({
  badge: {
    width: "5.5rem",
    height: "1.5rem",
    flexShrink: 0,
    borderRadius: "var(--corner-full)",
  },
  notice: {
    width: "100%",
    height: "3.25rem",
    borderRadius: "var(--corner-lg)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
  },
  sectionTitle: {
    width: "7.5rem",
    maxWidth: "70%",
    height: "1.5rem",
  },
  value: {
    width: "5rem",
    maxWidth: "80%",
    height: "1rem",
  },
  valueShort: {
    width: "2.25rem",
    height: "1rem",
  },
  tiebreakIndex: {
    width: "0.75rem",
    height: "1rem",
  },
  tiebreakLabel: {
    width: "9rem",
    maxWidth: "100%",
    height: "1rem",
  },
  caption: {
    width: "100%",
    maxWidth: "22rem",
    height: "0.875rem",
  },
  note: {
    width: "100%",
    height: "2.5rem",
    borderRadius: "var(--corner-lg)",
  },
});

const STAGE_KEYS = [0, 1] as const;
const TIEBREAK_KEYS = [0, 1, 2] as const;

export function CompetitionRulesSkeleton({ t }: { readonly t: Translator }) {
  const label = t("competitionRules.loading");
  return (
    <div aria-busy="true" {...applyStyles(styles.page)}>
      <span aria-label={label} role="status" {...applyStyles(vis.srOnly)}>
        {label}
      </span>
      <div aria-hidden="true" {...applyStyles(styles.statusRow)}>
        <Skeleton {...applyStyles(bones.badge)} />
      </div>
      <Skeleton aria-hidden="true" {...applyStyles(bones.notice)} />
      <div {...applyStyles(styles.columns)}>
        <Card>
          <CardContent className={styles.cardBody}>
            <Section title={t("competitionRules.format.title")}>
              <FactBones
                columns={2}
                labels={[t("competitionRules.format.label"), t("competitionRules.format.teams")]}
              />
            </Section>
            {STAGE_KEYS.map((key) => (
              <StageBones key={key} t={t} />
            ))}
            <Separator />
            <Section title={t("competitionRules.roster.title")}>
              <FactBones columns={2} labels={[t("competitionRules.roster.max")]} />
            </Section>
          </CardContent>
        </Card>
        <PlatformBones t={t} />
      </div>
    </div>
  );
}

function StageBones({ t }: { readonly t: Translator }) {
  return (
    <>
      <Separator />
      <section {...applyStyles(styles.section)}>
        <div aria-hidden="true" {...applyStyles(styles.sectionHead)}>
          <Skeleton {...applyStyles(bones.sectionTitle)} />
        </div>
        <Caption {...applyStyles(styles.help)}>{t("competitionRules.stage.description")}</Caption>
        <Heading as="h3" {...applyStyles(styles.heading)}>
          {t("competitionRules.scoring.title")}
        </Heading>
        <FactBones
          columns={2}
          labels={[
            t("competitionRules.scoring.win"),
            t("competitionRules.scoring.draw"),
            t("competitionRules.scoring.loss"),
          ]}
          value="short"
        />
        <Heading as="h3" {...applyStyles(styles.heading)}>
          {t("competitionRules.encounter.title")}
        </Heading>
        <FactBones
          columns={2}
          labels={[
            t("competitionRules.encounter.matches"),
            t("competitionRules.encounter.resolution"),
          ]}
        />
        <Heading as="h3" {...applyStyles(styles.heading)}>
          {t("competitionRules.reschedule.title")}
        </Heading>
        <FactBones
          columns={2}
          labels={[
            t("competitionRules.reschedule.max"),
            t("competitionRules.reschedule.notice"),
            t("competitionRules.reschedule.expiry"),
            t("competitionRules.reschedule.opponent"),
            t("competitionRules.reschedule.organizer"),
          ]}
        />
      </section>
    </>
  );
}

function PlatformBones({ t }: { readonly t: Translator }) {
  return (
    <Card>
      <CardContent className={styles.cardBody}>
        <Section
          description={t("competitionRules.platform.description")}
          title={t("competitionRules.platform.title")}
        >
          <Heading as="h3" {...applyStyles(styles.heading)}>
            {t("competitionRules.tiebreaks.title")}
          </Heading>
          <Caption {...applyStyles(styles.help)}>
            {t("competitionRules.tiebreaks.description")}
          </Caption>
          <ol aria-hidden="true" {...applyStyles(styles.tiebreaks)}>
            {TIEBREAK_KEYS.map((key) => (
              <li key={key} {...applyStyles(styles.tiebreak)}>
                <Skeleton {...applyStyles(bones.tiebreakIndex)} />
                <Skeleton {...applyStyles(bones.tiebreakLabel)} />
              </li>
            ))}
          </ol>
          <FactBones columns={1} labels={[t("competitionRules.awayGoals")]} />
        </Section>
        <Separator />
        <Section title={t("competitionRules.results.title")}>
          <FactBones columns={1} labels={[t("competitionRules.results.confirmation")]} />
          <div aria-hidden="true">
            <Skeleton {...applyStyles(bones.caption)} />
          </div>
          <Skeleton aria-hidden="true" {...applyStyles(bones.note)} />
        </Section>
      </CardContent>
    </Card>
  );
}

function FactBones({
  columns,
  labels,
  value = "value",
}: {
  readonly columns: 1 | 2;
  readonly labels: readonly string[];
  readonly value?: "value" | "short";
}) {
  const valueStyle = value === "short" ? bones.valueShort : bones.value;
  return (
    <MetaList aria-hidden="true" columns={columns}>
      {labels.map((label) => (
        <MetaItem key={label}>
          <MetaTerm>{label}</MetaTerm>
          <MetaValue>
            <Skeleton {...applyStyles(valueStyle)} />
          </MetaValue>
        </MetaItem>
      ))}
    </MetaList>
  );
}
