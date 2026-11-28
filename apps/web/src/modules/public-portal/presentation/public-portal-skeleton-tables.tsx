import { useId } from "react";
import type { PublicRankingKindDto } from "@futrob/api-contracts";
import {
  applyStyles,
  Caption,
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
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { PORTAL_RANKING_KINDS } from "./public-portal-model.ts";
import { rankingsStyles } from "./public-portal-rankings.styles.ts";
import { boneStyles } from "./public-portal-skeleton.styles.ts";
import { styles } from "./public-portal.styles.ts";

const KPI_CARDS = [0, 1, 2, 3] as const;
const TABLE_ROWS = [0, 1, 2, 3, 4, 5] as const;
const STANDINGS_WIDE_FIGURES = [0, 1, 2, 3, 4] as const;

function Abbr({ full, short }: { readonly full: string; readonly short: string }) {
  return (
    <abbr title={full} {...applyStyles(styles.abbr)}>
      {short}
    </abbr>
  );
}

function KpiBones() {
  return (
    <div aria-hidden="true" {...applyStyles(boneStyles.kpiGrid)}>
      {KPI_CARDS.map((index) => (
        <Skeleton key={index} {...applyStyles(boneStyles.kpiCard)} />
      ))}
    </div>
  );
}

function FigureBone({ cell }: { readonly cell: ReturnType<typeof applyStyles> }) {
  return (
    <TableCell align="end" className={cell.className} style={cell.style}>
      <Skeleton {...applyStyles(styles.figureBone)} />
    </TableCell>
  );
}

export function StandingsBones() {
  const { t } = useI18n();
  const headingId = useId();
  const cell = applyStyles(styles.tableCellBone);
  const wideCell = applyStyles(styles.tableCellBone, styles.wideOnly);
  return (
    <div {...applyStyles(styles.rounds)}>
      <KpiBones />
      <section aria-labelledby={headingId} {...applyStyles(styles.section)}>
        <h2 id={headingId} {...applyStyles(vis.srOnly)}>
          {t("standings.table.label")}
        </h2>
        <Caption as="p">{t("portal.standings.caption")}</Caption>
        <Table
          containerClassName={styles.tableSkeleton}
          containerLabelledBy={headingId}
          containerTabIndex={-1}
        >
          <TableHeader>
            <TableRow>
              <TableHead scope="col">
                <Abbr full={t("standings.col.position.full")} short={t("standings.col.position")} />
              </TableHead>
              <TableHead scope="col">{t("standings.col.team")}</TableHead>
              <TableHead align="end" scope="col">
                <Abbr full={t("standings.col.played.full")} short={t("standings.col.played")} />
              </TableHead>
              <TableHead align="end" className={styles.wideOnly} scope="col">
                <Abbr
                  full={t("portal.standings.col.wins.full")}
                  short={t("portal.standings.col.wins")}
                />
              </TableHead>
              <TableHead align="end" className={styles.wideOnly} scope="col">
                <Abbr
                  full={t("portal.standings.col.draws.full")}
                  short={t("portal.standings.col.draws")}
                />
              </TableHead>
              <TableHead align="end" className={styles.wideOnly} scope="col">
                <Abbr
                  full={t("portal.standings.col.losses.full")}
                  short={t("portal.standings.col.losses")}
                />
              </TableHead>
              <TableHead align="end" className={styles.wideOnly} scope="col">
                <Abbr
                  full={t("portal.standings.col.goalsFor.full")}
                  short={t("portal.standings.col.goalsFor")}
                />
              </TableHead>
              <TableHead align="end" className={styles.wideOnly} scope="col">
                <Abbr
                  full={t("portal.standings.col.goalsAgainst.full")}
                  short={t("portal.standings.col.goalsAgainst")}
                />
              </TableHead>
              <TableHead align="end" scope="col">
                <Abbr
                  full={t("standings.col.goalDifference.full")}
                  short={t("standings.col.goalDifference")}
                />
              </TableHead>
              <TableHead align="end" scope="col">
                <Abbr full={t("standings.col.points.full")} short={t("standings.col.points")} />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {TABLE_ROWS.map((index) => (
              <TableRow key={index}>
                <TableCell className={cell.className} style={cell.style}>
                  <Skeleton {...applyStyles(styles.positionBone)} />
                </TableCell>
                <TableCell className={cell.className} style={cell.style}>
                  <Skeleton {...applyStyles(styles.teamNameBone)} />
                </TableCell>
                <FigureBone cell={cell} />
                {STANDINGS_WIDE_FIGURES.map((figure) => (
                  <FigureBone cell={wideCell} key={figure} />
                ))}
                <FigureBone cell={cell} />
                <FigureBone cell={cell} />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}

export function RankingsBones({ rankingKind }: { readonly rankingKind: PublicRankingKindDto }) {
  const { t } = useI18n();
  const headingId = useId();
  const cell = applyStyles(styles.tableCellBone);
  const wideCell = applyStyles(styles.tableCellBone, styles.wideOnly);
  return (
    <section aria-labelledby={headingId} {...applyStyles(styles.section)}>
      <h2 id={headingId} {...applyStyles(vis.srOnly)}>
        {t(`competition.rankings.table.${rankingKind}`)}
      </h2>
      <nav aria-label={t("portal.rankings.kinds")} {...applyStyles(rankingsStyles.kindsWrap)}>
        <ul {...applyStyles(rankingsStyles.kinds)}>
          {PORTAL_RANKING_KINDS.map((kind) => (
            <li key={kind}>
              <span
                {...applyStyles(
                  typography.label,
                  rankingsStyles.kind,
                  kind === rankingKind && rankingsStyles.kindActive,
                )}
              >
                {t(`competition.rankings.kind.${kind}`)}
              </span>
            </li>
          ))}
        </ul>
      </nav>
      <Caption as="p">{t(`competition.rankings.criterion.${rankingKind}`)}</Caption>
      <KpiBones />
      <Table
        containerClassName={styles.tableSkeleton}
        containerLabelledBy={headingId}
        containerTabIndex={-1}
        dense
      >
        <TableHeader>
          <TableRow>
            <TableHead scope="col">
              <Abbr full={t("standings.col.position.full")} short={t("standings.col.position")} />
            </TableHead>
            <TableHead scope="col">{t("portal.rankings.col.player")}</TableHead>
            <TableHead align="end" scope="col">
              <Abbr
                full={t("portal.rankings.col.matches.full")}
                short={t("portal.rankings.col.matches")}
              />
            </TableHead>
            <TableHead align="end" className={styles.wideOnly} scope="col">
              <Abbr
                full={t("portal.rankings.col.perMatch.full")}
                short={t("portal.rankings.col.perMatch")}
              />
            </TableHead>
            <TableHead align="end" scope="col">
              {t(`competition.rankings.metric.${rankingKind}`)}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {TABLE_ROWS.map((index) => (
            <TableRow key={index}>
              <TableCell className={cell.className} style={cell.style}>
                <Skeleton {...applyStyles(styles.positionBone)} />
              </TableCell>
              <TableCell className={cell.className} style={cell.style}>
                <Skeleton {...applyStyles(styles.playerBone)} />
              </TableCell>
              <FigureBone cell={cell} />
              <FigureBone cell={wideCell} />
              <FigureBone cell={cell} />
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
