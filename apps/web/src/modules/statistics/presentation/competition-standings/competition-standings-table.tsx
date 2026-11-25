"use client";

import { useId, useState } from "react";
import type { CompetitionStandingSnapshotDto } from "@futrob/api-contracts";
import { CheckCircleIcon, FlagCheckeredIcon, TableIcon } from "@phosphor-icons/react";
import {
  applyStyles,
  Badge,
  Button,
  Caption,
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  typography,
  vis,
} from "@futrob/ui";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import {
  playoffCut,
  standingsTableRows,
  swissStandingsProgress,
  type TeamNames,
} from "./competition-standings-model.ts";
import {
  SECONDARY_FIGURES,
  StandingsRow,
  type PreFormFigureId,
  type StandingsFormats,
} from "./competition-standings-row.tsx";
import { styles } from "./competition-standings.styles.ts";

const LEAGUE_PRE_FORM: readonly PreFormFigureId[] = [
  "played",
  "wins",
  "draws",
  "losses",
  "goalsFor",
  "goalsAgainst",
  "goalDifference",
];

const SWISS_PRE_FORM: readonly PreFormFigureId[] = [
  "played",
  "wins",
  "draws",
  "losses",
  "goalsFor",
  "goalsAgainst",
  "goalDifference",
  "buchholz",
];

export function CompetitionStandingsTable({
  names,
  snapshot,
  t,
}: {
  readonly names: TeamNames;
  readonly snapshot: CompetitionStandingSnapshotDto;
  readonly t: Translator;
}) {
  const headingId = useId();
  const tableId = useId();
  // Below `md` the table prioritises identity and points; this keeps W/D/L/GF/GA one tap away.
  const [allColumns, setAllColumns] = useState(false);
  const formats: StandingsFormats = {
    integer: new Intl.NumberFormat(t.locale),
    signed: new Intl.NumberFormat(t.locale, { signDisplay: "exceptZero" }),
  };
  const updated = new Intl.DateTimeFormat(t.locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(snapshot.updatedAt));
  const rows = standingsTableRows(snapshot, names);
  const cut = playoffCut(snapshot);
  const preFormFigures = snapshot.swiss ? SWISS_PRE_FORM : LEAGUE_PRE_FORM;
  const progress = swissStandingsProgress(snapshot.swiss);
  const tiebreakCopy =
    snapshot.formulaVersion === "swiss-points-buchholz-gd-gf-v1"
      ? t("standings.tiebreak.swiss")
      : t("standings.tiebreak.league");

  return (
    <section aria-labelledby={headingId} {...applyStyles(styles.section)}>
      <h2 id={headingId} {...applyStyles(vis.srOnly)}>
        {t("standings.table.label")}
      </h2>
      <div {...applyStyles(styles.metaBar)}>
        <p {...applyStyles(styles.meta)}>
          <Badge variant="approved">
            <CheckCircleIcon aria-hidden="true" size={14} />
            {t("standings.officialBadge")}
          </Badge>
          {progress ? <SwissProgress progress={progress} t={t} /> : null}
          <Caption as="span">
            <time dateTime={snapshot.updatedAt}>
              {t("standings.table.updated", { time: updated })}
            </time>
          </Caption>
          <span aria-hidden="true" {...applyStyles(typography.caption, styles.metaSep)}>
            ·
          </span>
          <Caption
            as="span"
            title={t("standings.table.formula", { version: snapshot.formulaVersion })}
          >
            {tiebreakCopy}
          </Caption>
        </p>
        <Button
          aria-controls={tableId}
          aria-expanded={allColumns}
          className={styles.columnsToggle}
          onClick={() => setAllColumns((value) => !value)}
          variant="outline"
        >
          <TableIcon aria-hidden="true" size={16} />
          {allColumns ? t("standings.columns.showFewer") : t("standings.columns.showAll")}
        </Button>
      </div>
      {snapshot.swiss ? <Caption as="p">{t("standings.swiss.tiebreak")}</Caption> : null}
      <Table
        className={styles.table}
        containerClassName={styles.tableContainer}
        containerLabelledBy={headingId}
        id={tableId}
      >
        <TableHeader className={styles.header}>
          <TableRow className={styles.headerRow}>
            <TableHead className={[styles.headCell, styles.headPosition]} scope="col">
              <abbr title={t("standings.col.position.full")} {...applyStyles(styles.abbr)}>
                {t("standings.col.position")}
              </abbr>
            </TableHead>
            <TableHead className={[styles.headCell, styles.headTeam]} scope="col">
              {t("standings.col.team")}
            </TableHead>
            {preFormFigures.map((figure) => (
              <TableHead
                align="end"
                className={[
                  styles.headCell,
                  !allColumns && SECONDARY_FIGURES.has(figure) && styles.headSecondary,
                ]}
                key={figure}
                scope="col"
              >
                <abbr title={t(`standings.col.${figure}.full`)} {...applyStyles(styles.abbr)}>
                  {t(`standings.col.${figure}`)}
                </abbr>
              </TableHead>
            ))}
            <TableHead align="end" className={[styles.headCell, styles.headForm]} scope="col">
              <abbr title={t("standings.col.form.full")} {...applyStyles(styles.abbr)}>
                {t("standings.col.form")}
              </abbr>
            </TableHead>
            <TableHead align="end" className={[styles.headCell, styles.headPoints]} scope="col">
              <abbr title={t("standings.col.points.full")} {...applyStyles(styles.abbr)}>
                {t("standings.col.points")}
              </abbr>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((entry) => (
            <StandingsRow
              allColumns={allColumns}
              entry={entry}
              formats={formats}
              key={entry.row.teamId}
              preFormFigures={preFormFigures}
              t={t}
            />
          ))}
        </TableBody>
      </Table>
      <div {...applyStyles(styles.footer)}>
        <div {...applyStyles(styles.legend)}>
          {cut === null ? (
            <span {...applyStyles(typography.caption, styles.legendItem)}>
              <span aria-hidden="true" {...applyStyles(styles.legendBar)} />
              {t("standings.legend.leader")}
            </span>
          ) : (
            <>
              <span {...applyStyles(typography.caption, styles.legendItem, styles.cutNote)}>
                <span aria-hidden="true" {...applyStyles(styles.legendBar)} />
                {t("standings.playoffCut", { count: cut })}
              </span>
              <span {...applyStyles(typography.caption, styles.legendItem)}>
                <span aria-hidden="true" {...applyStyles(styles.legendDash)} />
                {t("standings.legend.cut")}
              </span>
            </>
          )}
        </div>
        <Caption as="span">{t("standings.legend.form")}</Caption>
      </div>
    </section>
  );
}

function SwissProgress({
  progress,
  t,
}: {
  readonly progress: NonNullable<ReturnType<typeof swissStandingsProgress>>;
  readonly t: Translator;
}) {
  switch (progress.kind) {
    case "final":
      return (
        <span {...applyStyles(typography.label, styles.swissFinal)}>
          <FlagCheckeredIcon aria-hidden size={16} />
          {t("standings.swiss.final")}
        </span>
      );
    case "round":
      return (
        <span {...applyStyles(typography.label, styles.swissProgress)}>
          {t("standings.swiss.round", { current: progress.current, total: progress.total })}
        </span>
      );
    case "between":
      return (
        <span {...applyStyles(typography.label, styles.swissProgress)}>
          {t("standings.swiss.completed", {
            completed: progress.completed,
            total: progress.total,
          })}
        </span>
      );
    default: {
      const exhaustive: never = progress;
      return exhaustive;
    }
  }
}
