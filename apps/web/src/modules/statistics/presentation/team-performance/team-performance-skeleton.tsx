"use client";

import { useId } from "react";
import {
  applyStyles,
  Caption,
  MetaItem,
  MetaList,
  MetaTerm,
  MetaValue,
  SectionTitle,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  vis,
} from "@futrob/ui";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { TEAM_PERFORMANCE_METRICS, teamPerformanceWeight } from "./team-performance-model.ts";
import { styles } from "./team-performance-page.styles.ts";

/** `TableHead` owns `text-align: left`; inline wins without racing its atomic class. */
const END = { textAlign: "end" } as const;

const SKELETON_ROWS = Array.from({ length: 6 }, (_, index) => index);

const CRITERIA_FIELDS = ["window", "eligibility", "period", "sources", "updated"] as const;

/**
 * Layout-matched loading bones for the ranking table and criteria card. Column
 * headers and section titles are catalog copy; cells and snapshot values stay
 * reserved so the ready page does not jump.
 */
export function TeamPerformanceSkeleton({ t }: { readonly t: Translator }) {
  const label = t("teamPerformance.loading");
  return (
    <div aria-busy="true" {...applyStyles(styles.content)}>
      <span aria-label={label} role="status" {...applyStyles(vis.srOnly)}>
        {label}
      </span>
      <RankingTableSkeleton t={t} />
      <CriteriaSkeleton t={t} />
    </div>
  );
}

function RankingTableSkeleton({ t }: { readonly t: Translator }) {
  const titleId = useId();
  const numeric = applyStyles(styles.numeric);
  return (
    <section aria-labelledby={titleId} {...applyStyles(styles.section)}>
      <div {...applyStyles(styles.sectionHead)}>
        <SectionTitle id={titleId}>{t("teamPerformance.table.title")}</SectionTitle>
        <Skeleton {...applyStyles(styles.skeletonCaption)} />
        <Caption as="p" className={styles.scrollHint}>
          {t("teamPerformance.table.scrollHint")}
        </Caption>
      </div>
      <Table containerTabIndex={-1} {...applyStyles(styles.table)}>
        <TableHeader>
          <TableRow>
            <TableHead scope="col" style={END}>
              {t("teamPerformance.table.position")}
            </TableHead>
            <TableHead scope="col">{t("teamPerformance.table.team")}</TableHead>
            <TableHead scope="col" style={END}>
              {t("teamPerformance.table.score")}
            </TableHead>
            {TEAM_PERFORMANCE_METRICS.map((metric) => (
              <TableHead key={metric} scope="col" style={END}>
                <span {...applyStyles(styles.headStack)}>
                  <span>{t(`teamPerformance.metric.${metric}`)}</span>
                  <span {...applyStyles(styles.weight)}>
                    {t("teamPerformance.weight", { weight: teamPerformanceWeight(metric) })}
                  </span>
                </span>
              </TableHead>
            ))}
            <TableHead scope="col" style={END}>
              {t("teamPerformance.table.encounters")}
            </TableHead>
            <TableHead scope="col">{t("teamPerformance.table.coverage")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {SKELETON_ROWS.map((index) => (
            <TableRow key={index}>
              <TableCell {...numeric}>
                <Skeleton {...applyStyles(styles.skeletonNumeric)} />
              </TableCell>
              <TableCell>
                <Skeleton {...applyStyles(styles.teamSkeleton)} />
              </TableCell>
              <TableCell {...numeric}>
                <Skeleton {...applyStyles(styles.skeletonNumeric)} />
              </TableCell>
              {TEAM_PERFORMANCE_METRICS.map((metric) => (
                <TableCell key={metric} {...numeric}>
                  <Skeleton {...applyStyles(styles.skeletonNumeric)} />
                </TableCell>
              ))}
              <TableCell {...numeric}>
                <Skeleton {...applyStyles(styles.skeletonNumeric)} />
              </TableCell>
              <TableCell>
                <Skeleton {...applyStyles(styles.skeletonCoverage)} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

function CriteriaSkeleton({ t }: { readonly t: Translator }) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} {...applyStyles(styles.criteria)}>
      <div {...applyStyles(styles.sectionHead)}>
        <SectionTitle id={titleId}>{t("teamPerformance.criteria.title")}</SectionTitle>
        <Skeleton {...applyStyles(styles.skeletonDescription)} />
      </div>
      <ul aria-hidden="true" {...applyStyles(styles.weights)}>
        {TEAM_PERFORMANCE_METRICS.map((metric) => (
          <li key={metric}>
            <Skeleton {...applyStyles(styles.skeletonWeight)} />
          </li>
        ))}
      </ul>
      <MetaList columns={2}>
        {CRITERIA_FIELDS.map((field, index) => (
          <MetaItem key={field}>
            <MetaTerm>{t(`teamPerformance.criteria.${field}`)}</MetaTerm>
            <MetaValue>
              <Skeleton
                {...applyStyles(
                  index % 2 === 0 ? styles.skeletonMetaValueWide : styles.skeletonMetaValue,
                )}
              />
            </MetaValue>
          </MetaItem>
        ))}
      </MetaList>
      <Skeleton {...applyStyles(styles.skeletonVersions)} />
      <Skeleton {...applyStyles(styles.skeletonLink)} />
    </section>
  );
}
