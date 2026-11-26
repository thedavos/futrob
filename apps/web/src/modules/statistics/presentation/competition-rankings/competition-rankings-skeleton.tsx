import { useId } from "react";
import type { RankingKindDto } from "@futrob/api-contracts";
import {
  applyStyles,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  typography,
  vis,
} from "@futrob/ui";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { styles } from "./competition-rankings-page.styles.ts";
import { RANKING_KIND_COPY, RANKING_KINDS } from "./competition-rankings-view.ts";

const SKELETON_ROWS = Array.from({ length: 6 }, (_, index) => index);

const META_TERMS = [
  "competition.rankings.meta.criterion",
  "competition.rankings.meta.eligibility",
  "competition.rankings.meta.updated",
] as const;

/** Layout-matched bones for the rankings page: kind tabs, criterion meta, and rows. */
export function CompetitionRankingsSkeleton({
  rankingKind,
  t,
}: {
  readonly rankingKind: RankingKindDto;
  readonly t: Translator;
}) {
  const headingId = useId();
  const label = t("competition.rankings.loading");
  return (
    <div aria-busy="true" aria-label={label} {...applyStyles(styles.content)}>
      <span aria-label={label} role="status" {...applyStyles(vis.srOnly)}>
        {label}
      </span>
      <div aria-hidden="true" {...applyStyles(styles.tabListSkeleton)}>
        {RANKING_KINDS.map((kind) => (
          <span key={kind} {...applyStyles(typography.label, styles.skeletonTabLabel)}>
            {t(RANKING_KIND_COPY[kind].tab)}
          </span>
        ))}
      </div>
      <div {...applyStyles(styles.panel)}>
        <dl aria-hidden="true" {...applyStyles(styles.meta)}>
          {META_TERMS.map((term) => (
            <div key={term} {...applyStyles(styles.metaItem)}>
              <dt {...applyStyles(typography.label, styles.metaTerm)}>{t(term)}</dt>
              <dd {...applyStyles(styles.metaValue)}>
                <Skeleton {...applyStyles(styles.skeletonMetaValue)} />
              </dd>
            </div>
          ))}
        </dl>
        <section aria-labelledby={headingId} {...applyStyles(styles.tableSection)}>
          <h2 id={headingId} {...applyStyles(vis.srOnly)}>
            {t(RANKING_KIND_COPY[rankingKind].table)}
          </h2>
          <Table
            aria-labelledby={headingId}
            containerLabelledBy={headingId}
            containerTabIndex={-1}
            dense
            {...applyStyles(styles.table)}
          >
            <TableHeader>
              <TableRow>
                <TableHead scope="col" {...applyStyles(styles.position)}>
                  <abbr title={t("competition.rankings.column.positionTitle")}>
                    {t("competition.rankings.column.position")}
                  </abbr>
                </TableHead>
                <TableHead scope="col">{t("competition.rankings.column.player")}</TableHead>
                <TableHead scope="col" {...applyStyles(styles.numeric)}>
                  <abbr title={t("competition.rankings.column.matchesTitle")}>
                    {t("competition.rankings.column.matches")}
                  </abbr>
                </TableHead>
                <TableHead scope="col" {...applyStyles(styles.numeric)}>
                  <abbr title={t("competition.rankings.column.minutesTitle")}>
                    {t("competition.rankings.column.minutes")}
                  </abbr>
                </TableHead>
                <TableHead scope="col" {...applyStyles(styles.numeric)}>
                  {t(RANKING_KIND_COPY[rankingKind].metric)}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SKELETON_ROWS.map((index) => (
                <TableRow key={index}>
                  <TableCell {...applyStyles(styles.position)}>
                    <Skeleton {...applyStyles(styles.skeletonPosition)} />
                  </TableCell>
                  <TableCell>
                    <div {...applyStyles(styles.identity)}>
                      <Skeleton {...applyStyles(styles.nameSkeleton)} />
                      <Skeleton {...applyStyles(styles.skeletonTeam)} />
                    </div>
                  </TableCell>
                  <TableCell {...applyStyles(styles.numeric)}>
                    <Skeleton {...applyStyles(styles.skeletonNumeric)} />
                  </TableCell>
                  <TableCell {...applyStyles(styles.numeric)}>
                    <Skeleton {...applyStyles(styles.skeletonNumeric)} />
                  </TableCell>
                  <TableCell {...applyStyles(styles.metric)}>
                    <Skeleton {...applyStyles(styles.skeletonMetric)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      </div>
    </div>
  );
}
