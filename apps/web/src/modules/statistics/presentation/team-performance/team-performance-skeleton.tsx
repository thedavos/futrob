"use client";

import { useId } from "react";
import {
  applyStyles,
  Caption,
  SectionTitle,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@futrob/ui";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { TEAM_PERFORMANCE_METRICS, teamPerformanceWeight } from "./team-performance-model.ts";
import { styles } from "./team-performance-page.styles.ts";

const SKELETON_KPIS = Array.from({ length: 4 }, (_, index) => index);
const SKELETON_ROWS = Array.from({ length: 6 }, (_, index) => index);

/**
 * Layout-matched loading bones for the KPI summary, ranking table and collapsed
 * criteria card. Column headers and section titles are catalog copy; cells and
 * snapshot values stay reserved so the ready page does not jump.
 */
export function TeamPerformanceSkeleton({ t }: { readonly t: Translator }) {
  return (
    <div aria-busy="true" {...applyStyles(styles.content)}>
      <div aria-hidden="true" {...applyStyles(styles.skeletonKpiGrid)}>
        {SKELETON_KPIS.map((index) => (
          <Skeleton key={index} {...applyStyles(styles.skeletonKpi)} />
        ))}
      </div>
      <RankingTableSkeleton t={t} />
      <CriteriaSkeleton t={t} />
    </div>
  );
}

function RankingTableSkeleton({ t }: { readonly t: Translator }) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} {...applyStyles(styles.section)}>
      <div {...applyStyles(styles.sectionHead)}>
        <SectionTitle id={titleId}>{t("teamPerformance.table.title")}</SectionTitle>
        <Skeleton {...applyStyles(styles.skeletonCaption)} />
        <Caption as="p" className={styles.scrollHint}>
          {t("teamPerformance.table.scrollHint")}
        </Caption>
      </div>
      <div aria-hidden="true" {...applyStyles(styles.skeletonTableWrap)}>
        <Table aria-hidden="true" containerTabIndex={-1} {...applyStyles(styles.table)}>
          <TableHeader>
            <TableRow>
              <TableHead className={styles.expandHead} scope="col" />
              <TableHead align="end" scope="col">
                {t("teamPerformance.table.position")}
              </TableHead>
              <TableHead scope="col">{t("teamPerformance.table.team")}</TableHead>
              <TableHead align="end" scope="col">
                {t("teamPerformance.table.score")}
              </TableHead>
              {TEAM_PERFORMANCE_METRICS.map((metric) => (
                <TableHead align="end" key={metric} scope="col">
                  <span {...applyStyles(styles.headStack)}>
                    <span>{t(`teamPerformance.metric.${metric}`)}</span>
                    <span {...applyStyles(styles.weight)}>
                      {t("teamPerformance.weight", { weight: teamPerformanceWeight(metric) })}
                    </span>
                  </span>
                </TableHead>
              ))}
              <TableHead align="end" scope="col">
                {t("teamPerformance.table.encountersShort")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {SKELETON_ROWS.map((index) => (
              <TableRow key={index}>
                <TableCell className={styles.expandCell} />
                <TableCell align="end">
                  <Skeleton {...applyStyles(styles.skeletonNumeric)} />
                </TableCell>
                <TableCell>
                  <Skeleton {...applyStyles(styles.teamSkeleton)} />
                </TableCell>
                <TableCell align="end">
                  <Skeleton {...applyStyles(styles.skeletonNumeric)} />
                </TableCell>
                {TEAM_PERFORMANCE_METRICS.map((metric) => (
                  <TableCell align="end" key={metric}>
                    <Skeleton {...applyStyles(styles.skeletonNumeric)} />
                  </TableCell>
                ))}
                <TableCell align="end">
                  <Skeleton {...applyStyles(styles.skeletonNumeric)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

function CriteriaSkeleton({ t }: { readonly t: Translator }) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} {...applyStyles(styles.criteria)}>
      <div {...applyStyles(styles.criteriaTop)}>
        <div {...applyStyles(styles.criteriaHeaderCopy)}>
          <SectionTitle id={titleId}>{t("teamPerformance.criteria.title")}</SectionTitle>
          <Skeleton {...applyStyles(styles.skeletonCriteriaMeta)} />
        </div>
        <Skeleton {...applyStyles(styles.skeletonCriteriaTrigger)} />
      </div>
    </section>
  );
}
