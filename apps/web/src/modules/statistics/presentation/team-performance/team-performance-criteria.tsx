import { useId } from "react";
import { Link } from "@tanstack/react-router";
import { CaretRightIcon } from "@phosphor-icons/react";
import type { TeamPerformanceRankingSnapshotDto } from "@futrob/api-contracts";
import {
  applyStyles,
  Badge,
  Body,
  Caption,
  MetaItem,
  MetaList,
  MetaTerm,
  MetaValue,
  SectionTitle,
  TextLink,
} from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import {
  TEAM_PERFORMANCE_METRICS,
  teamPerformanceSummary,
  teamPerformanceWeight,
} from "./team-performance-model.ts";
import { styles } from "./team-performance-page.styles.ts";

type Scope = { readonly organizationId: string; readonly competitionId: string };

/** Formula, window, sources and versions behind the ranking, as reported by the snapshot. */
export function Criteria({
  competitionId,
  organizationId,
  ranking,
  t,
}: Scope & { readonly ranking: TeamPerformanceRankingSnapshotDto; readonly t: Translator }) {
  const titleId = useId();
  const { locale } = useI18n();
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const dateTime = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  const { from, through } = ranking.window;
  const voided = ranking.sources.filter((source) => source.status === "voided").length;
  return (
    <section aria-labelledby={titleId} {...applyStyles(styles.criteria)}>
      <div {...applyStyles(styles.sectionHead)}>
        <SectionTitle id={titleId}>{t("teamPerformance.criteria.title")}</SectionTitle>
        <Body measure size="md" tone="muted">
          {t("teamPerformance.criteria.description")}
        </Body>
      </div>
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
                <time dateTime={from}>{date.format(new Date(from))}</time> –{" "}
                <time dateTime={through}>{date.format(new Date(through))}</time>
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
              approved: teamPerformanceSummary(ranking).approvedSources,
              voided,
            })}
          </MetaValue>
        </MetaItem>
        <MetaItem>
          <MetaTerm>{t("teamPerformance.criteria.updated")}</MetaTerm>
          <MetaValue>
            <time dateTime={ranking.updatedAt}>{dateTime.format(new Date(ranking.updatedAt))}</time>
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
      <TextLink
        className={styles.link}
        render={
          <Link
            params={{ orgId: organizationId, competitionId }}
            to="/orgs/$orgId/competitions/$competitionId/standings"
          />
        }
        text="caption"
      >
        {t("teamPerformance.standingsLink")}
        <CaretRightIcon aria-hidden {...applyStyles(styles.chevron)} />
      </TextLink>
    </section>
  );
}
