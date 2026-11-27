import { useId, useState } from "react";
import { CaretDownIcon } from "@phosphor-icons/react";
import type { TeamPerformanceRankingSnapshotDto } from "@futrob/api-contracts";
import {
  applyStyles,
  Badge,
  Body,
  Caption,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  MetaItem,
  MetaList,
  MetaTerm,
  MetaValue,
  SectionTitle,
} from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import {
  TEAM_PERFORMANCE_METRICS,
  teamPerformanceSummary,
  teamPerformanceWeight,
} from "./team-performance-model.ts";
import { styles } from "./team-performance-page.styles.ts";

/**
 * Compact, collapsible methodology strip: keeps window, eligibility and period visible at all
 * times (UX-RNK-001) while tucking detailed weights and version hashes into a Collapsible.
 */
export function Criteria({
  ranking,
  t,
}: {
  readonly ranking: TeamPerformanceRankingSnapshotDto;
  readonly t: Translator;
}) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const { locale } = useI18n();
  const shortDate = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const dateTime = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  const { from, through } = ranking.window;
  const approved = teamPerformanceSummary(ranking).approvedSources;
  const voided = ranking.sources.filter((source) => source.status === "voided").length;

  return (
    <section aria-labelledby={titleId} {...applyStyles(styles.criteria)}>
      <Collapsible onOpenChange={setOpen} open={open}>
        <div {...applyStyles(styles.criteriaTop)}>
          <div {...applyStyles(styles.criteriaHeaderCopy)}>
            <SectionTitle id={titleId}>{t("teamPerformance.criteria.title")}</SectionTitle>
            <div {...applyStyles(styles.criteriaInlineMeta)}>
              <Caption as="span">
                <strong {...applyStyles(styles.criteriaTerm)}>
                  {t("teamPerformance.criteria.window")}:
                </strong>{" "}
                {t("teamPerformance.criteria.compactWindow", {
                  recent: ranking.window.recentEncounterLimit,
                })}
              </Caption>
              <span aria-hidden="true" {...applyStyles(styles.metaDot)}>
                ·
              </span>
              <Caption as="span">
                <strong {...applyStyles(styles.criteriaTerm)}>
                  {t("teamPerformance.criteria.eligibility")}:
                </strong>{" "}
                {t("teamPerformance.criteria.compactEligibility", {
                  minimum: ranking.window.minimumEncounters,
                })}
              </Caption>
              {from && through ? (
                <>
                  <span aria-hidden="true" {...applyStyles(styles.metaDot)}>
                    ·
                  </span>
                  <Caption as="span">
                    <strong {...applyStyles(styles.criteriaTerm)}>
                      {t("teamPerformance.criteria.period")}:
                    </strong>{" "}
                    <time dateTime={from}>{shortDate.format(new Date(from))}</time> –{" "}
                    <time dateTime={through}>{shortDate.format(new Date(through))}</time>
                  </Caption>
                </>
              ) : null}
              <span aria-hidden="true" {...applyStyles(styles.metaDot)}>
                ·
              </span>
              <Caption as="span">
                <strong {...applyStyles(styles.criteriaTerm)}>
                  {t("teamPerformance.criteria.sources")}:
                </strong>{" "}
                {t("teamPerformance.criteria.sourcesValue", {
                  approved: Number(approved),
                  voided,
                })}
              </Caption>
            </div>
          </div>
          <CollapsibleTrigger className={styles.criteriaTrigger}>
            <span>
              {t(
                open
                  ? "teamPerformance.criteria.toggleHide"
                  : "teamPerformance.criteria.toggleShow",
              )}
            </span>
            <CaretDownIcon
              aria-hidden="true"
              {...applyStyles(styles.chevron, open && styles.chevronOpen)}
            />
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <div {...applyStyles(styles.criteriaBody)}>
            <Body measure size="md" tone="muted">
              {t("teamPerformance.criteria.description")}
            </Body>
            <ul aria-label={t("teamPerformance.weights.label")} {...applyStyles(styles.weights)}>
              {TEAM_PERFORMANCE_METRICS.map((metric) => (
                <li key={metric}>
                  <Badge variant="outline">
                    {t(`teamPerformance.metric.${metric}`)} ·{" "}
                    {t("teamPerformance.weight", { weight: teamPerformanceWeight(metric) })}
                  </Badge>
                </li>
              ))}
            </ul>
            <MetaList columns={2}>
              <MetaItem>
                <MetaTerm>{t("teamPerformance.criteria.window")}</MetaTerm>
                <MetaValue>
                  {t("teamPerformance.criteria.windowValue", {
                    recent: ranking.window.recentEncounterLimit,
                  })}
                </MetaValue>
              </MetaItem>
              <MetaItem>
                <MetaTerm>{t("teamPerformance.criteria.eligibility")}</MetaTerm>
                <MetaValue>
                  {t("teamPerformance.criteria.eligibilityValue", {
                    minimum: ranking.window.minimumEncounters,
                  })}
                </MetaValue>
              </MetaItem>
              <MetaItem>
                <MetaTerm>{t("teamPerformance.criteria.period")}</MetaTerm>
                <MetaValue>
                  {from && through ? (
                    <>
                      <time dateTime={from}>{shortDate.format(new Date(from))}</time> –{" "}
                      <time dateTime={through}>{shortDate.format(new Date(through))}</time>
                    </>
                  ) : (
                    t("teamPerformance.criteria.noPeriod")
                  )}
                </MetaValue>
              </MetaItem>
              <MetaItem>
                <MetaTerm>{t("teamPerformance.criteria.sources")}</MetaTerm>
                <MetaValue>
                  {t("teamPerformance.criteria.sourcesValue", {
                    approved,
                    voided,
                  })}
                </MetaValue>
              </MetaItem>
              <MetaItem>
                <MetaTerm>{t("teamPerformance.criteria.updated")}</MetaTerm>
                <MetaValue>
                  <time dateTime={ranking.updatedAt}>
                    {dateTime.format(new Date(ranking.updatedAt))}
                  </time>
                </MetaValue>
              </MetaItem>
            </MetaList>
            <Caption as="p">
              {t("teamPerformance.criteria.versions", {
                formula: ranking.formulaVersion,
                normalization: ranking.normalizationVersion,
                window: ranking.windowVersion,
              })}
            </Caption>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}
