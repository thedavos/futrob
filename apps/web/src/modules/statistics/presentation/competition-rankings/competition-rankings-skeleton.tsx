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
} from "@futrob/ui";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { styles } from "./competition-rankings-page.styles.ts";
import { RANKING_KIND_COPY, RANKING_KINDS } from "./competition-rankings-view.ts";

const SKELETON_ROWS = Array.from({ length: 6 }, (_, index) => index);

/** Layout-matched bones for the rankings page: kind tabs, KPI summary, criterion meta and rows. */
export function CompetitionRankingsSkeleton({
  rankingKind,
  t,
}: {
  readonly rankingKind: RankingKindDto;
  readonly t: Translator;
}) {
  return (
    <div aria-hidden="true" {...applyStyles(styles.content)}>
      <div {...applyStyles(styles.tabListSkeleton)}>
        {RANKING_KINDS.map((kind) => (
          <span key={kind} {...applyStyles(typography.label, styles.skeletonTabLabel)}>
            {t(RANKING_KIND_COPY[kind].tab)}
          </span>
        ))}
      </div>
      <div {...applyStyles(styles.panel)}>
        <Skeleton {...applyStyles(styles.skeletonKpis)} />
        <div {...applyStyles(styles.meta)}>
          <Skeleton {...applyStyles(styles.skeletonBadge)} />
          <span {...applyStyles(typography.caption, styles.metaStrong)}>
            {t(RANKING_KIND_COPY[rankingKind].criterion)}
          </span>
          <Skeleton {...applyStyles(styles.skeletonMetaValue)} />
        </div>
        <div {...applyStyles(styles.tableSection)}>
          <Table containerTabIndex={-1} dense {...applyStyles(styles.table)}>
            <TableHeader>
              <TableRow>
                <TableHead align="end" scope="col" {...applyStyles(styles.position)}>
                  <abbr
                    {...applyStyles(styles.abbr)}
                    title={t("competition.rankings.column.positionTitle")}
                  >
                    {t("competition.rankings.column.position")}
                  </abbr>
                </TableHead>
                <TableHead scope="col">{t("competition.rankings.column.player")}</TableHead>
                <TableHead align="end" scope="col" {...applyStyles(styles.secondaryHead)}>
                  <abbr
                    {...applyStyles(styles.abbr)}
                    title={t("competition.rankings.column.matchesTitle")}
                  >
                    {t("competition.rankings.column.matches")}
                  </abbr>
                </TableHead>
                <TableHead align="end" scope="col" {...applyStyles(styles.secondaryHead)}>
                  <abbr
                    {...applyStyles(styles.abbr)}
                    title={t("competition.rankings.column.minutesTitle")}
                  >
                    {t("competition.rankings.column.minutes")}
                  </abbr>
                </TableHead>
                <TableHead align="end" scope="col" {...applyStyles(styles.metricHead)}>
                  {t(RANKING_KIND_COPY[rankingKind].metric)}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SKELETON_ROWS.map((index) => (
                <TableRow key={index}>
                  <TableCell align="end" {...applyStyles(styles.position)}>
                    <Skeleton {...applyStyles(styles.skeletonPosition)} />
                  </TableCell>
                  <TableCell>
                    <div {...applyStyles(styles.identity)}>
                      <Skeleton {...applyStyles(styles.nameSkeleton)} />
                      <Skeleton {...applyStyles(styles.skeletonTeam)} />
                    </div>
                  </TableCell>
                  <TableCell align="end" {...applyStyles(styles.secondary)}>
                    <Skeleton {...applyStyles(styles.skeletonNumeric)} />
                  </TableCell>
                  <TableCell align="end" {...applyStyles(styles.secondary)}>
                    <Skeleton {...applyStyles(styles.skeletonNumeric)} />
                  </TableCell>
                  <TableCell align="end" {...applyStyles(styles.metric)}>
                    <Skeleton {...applyStyles(styles.skeletonMetric)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
