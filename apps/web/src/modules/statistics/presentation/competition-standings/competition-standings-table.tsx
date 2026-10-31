"use client";

import { useId } from "react";
import type {
  CompetitionStandingRowDto,
  CompetitionStandingSnapshotDto,
} from "@futrob/api-contracts";
import {
  applyStyles,
  Caption,
  Score,
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
import { ClubCrestAvatar } from "@/shared/presentation/club-crest-avatar.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import {
  playoffCut,
  standingsTableRows,
  type StandingsTableRow,
  type StandingsTeamName,
  type TeamNames,
} from "./competition-standings-model.ts";
import { styles } from "./competition-standings.styles.ts";

type FigureId = "played" | "goalDifference" | "points";

const FIGURES: readonly FigureId[] = ["played", "goalDifference", "points"];

type FormResult = CompetitionStandingRowDto["form"][number];

const FORM_SLOTS = 5;

const FORM_RESULT_STYLE = {
  win: styles.formWin,
  draw: styles.formDraw,
  loss: styles.formLoss,
} as const satisfies Record<FormResult, (typeof styles)[keyof typeof styles]>;

type Formats = {
  readonly integer: Intl.NumberFormat;
  readonly signed: Intl.NumberFormat;
};

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
  const formats: Formats = {
    integer: new Intl.NumberFormat(t.locale),
    signed: new Intl.NumberFormat(t.locale, { signDisplay: "exceptZero" }),
  };
  const updated = new Intl.DateTimeFormat(t.locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(snapshot.updatedAt));
  const rows = standingsTableRows(snapshot, names);
  const cut = playoffCut(snapshot);

  return (
    <section aria-labelledby={headingId} {...applyStyles(styles.section)}>
      <h2 id={headingId} {...applyStyles(vis.srOnly)}>
        {t("standings.table.label")}
      </h2>
      <p {...applyStyles(styles.meta)}>
        <Caption as="span">
          <time dateTime={snapshot.updatedAt}>
            {t("standings.table.updated", { time: updated })}
          </time>
        </Caption>
        <Caption as="span">
          {t("standings.table.formula", { version: snapshot.formulaVersion })}
        </Caption>
      </p>
      <Table
        className={styles.table}
        containerClassName={styles.tableContainer}
        containerLabelledBy={headingId}
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
            <TableHead className={[styles.headCell, styles.headForm]} scope="col">
              <abbr title={t("standings.col.form.full")} {...applyStyles(styles.abbr)}>
                {t("standings.col.form")}
              </abbr>
            </TableHead>
            {FIGURES.map((figure) => (
              <TableHead key={figure} scope="col" {...applyStyles(styles.headCell, styles.numeric)}>
                <abbr title={t(`standings.col.${figure}.full`)} {...applyStyles(styles.abbr)}>
                  {t(`standings.col.${figure}`)}
                </abbr>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((entry) => (
            <StandingsRow entry={entry} formats={formats} key={entry.row.teamId} t={t} />
          ))}
        </TableBody>
      </Table>
      {cut === null ? null : (
        <p {...applyStyles(typography.caption, styles.cutNote)}>
          {t("standings.playoffCut", { count: cut })}
        </p>
      )}
    </section>
  );
}

function StandingsRow({
  entry,
  formats,
  t,
}: {
  readonly entry: StandingsTableRow;
  readonly formats: Formats;
  readonly t: Translator;
}) {
  const { row } = entry;
  return (
    <TableRow className={[styles.row, entry.lastAboveCut && styles.aboveCut]}>
      <TableCell className={[styles.cell, styles.position]}>
        <Score
          as="span"
          size="table"
          {...applyStyles(styles.positionValue, row.position === 1 && styles.leader)}
        >
          {formats.integer.format(row.position)}
        </Score>
      </TableCell>
      <TableCell className={[styles.cell, styles.teamCell]}>
        <TeamName team={entry.team} t={t} />
        <FormStrip form={row.form} narrow t={t} />
      </TableCell>
      <TableCell className={[styles.cell, styles.formCell]}>
        <FormStrip form={row.form} t={t} />
      </TableCell>
      {FIGURES.map((figure) => (
        <TableCell className={[styles.cell, styles.numeric]} key={figure}>
          <Score
            align="end"
            as="span"
            size="table"
            {...applyStyles(figure === "points" ? styles.points : styles.figure)}
          >
            {(figure === "goalDifference" ? formats.signed : formats.integer).format(row[figure])}
          </Score>
        </TableCell>
      ))}
    </TableRow>
  );
}

function FormStrip({
  form,
  narrow = false,
  t,
}: {
  readonly form: CompetitionStandingRowDto["form"];
  readonly narrow?: boolean;
  readonly t: Translator;
}) {
  const empty = Math.max(0, FORM_SLOTS - form.length);
  return (
    <span {...applyStyles(styles.form, narrow && styles.formNarrow)}>
      <span {...applyStyles(vis.srOnly)}>{t("standings.col.form.full")}: </span>
      {form.map((result, index) => (
        <span
          // Results are positional: the same result can repeat, and order is the meaning.
          key={index}
          {...applyStyles(styles.formResult, FORM_RESULT_STYLE[result])}
        >
          <span aria-hidden="true">{t(`standings.form.${result}.short`)}</span>
          <span {...applyStyles(vis.srOnly)}>
            {t(`standings.form.${result}`)}
            {index < form.length - 1 ? ", " : ""}
          </span>
        </span>
      ))}
      {Array.from({ length: empty }, (_, index) => (
        <span aria-hidden="true" key={`empty-${index}`} {...applyStyles(styles.formEmpty)} />
      ))}
    </span>
  );
}

function TeamName({ team, t }: { readonly team: StandingsTeamName; readonly t: Translator }) {
  const crest = applyStyles(styles.crest);
  switch (team.kind) {
    case "name":
      return (
        <span {...applyStyles(styles.team)}>
          <ClubCrestAvatar
            className={crest.className}
            imageUrl={null}
            name={team.value}
            style={crest.style}
          />
          <span {...applyStyles(styles.teamName)}>{team.value}</span>
        </span>
      );
    case "loading":
      return (
        <span role="status" aria-label={t("standings.team.loading")}>
          <Skeleton {...applyStyles(styles.teamSkeleton)} />
        </span>
      );
    case "unresolved":
      return (
        <span {...applyStyles(styles.team)}>
          <span aria-hidden="true" {...applyStyles(styles.crest, styles.crestPlaceholder)} />
          <span {...applyStyles(styles.teamUnresolved)}>{t("standings.team.unresolved")}</span>
        </span>
      );
    default: {
      const exhaustive: never = team;
      return exhaustive;
    }
  }
}
