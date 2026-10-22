"use client";

import { useId } from "react";
import type { CompetitionStandingSnapshotDto } from "@futrob/api-contracts";
import {
  applyProps,
  applyStyles,
  Caption,
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
import {
  standingsTableRows,
  type StandingsTableRow,
  type StandingsTeamName,
  type TeamNames,
} from "./competition-standings-model.ts";
import { styles } from "./competition-standings.styles.ts";

type ColumnId =
  | "played"
  | "wins"
  | "draws"
  | "losses"
  | "goalsFor"
  | "goalsAgainst"
  | "goalDifference"
  | "points";

type Column = {
  readonly id: ColumnId;
  /** Moves under the team name on a narrow screen instead of taking a column. */
  readonly secondary: boolean;
};

/**
 * Identity and the figures that rank a team stay visible on a narrow screen; the rest
 * of the record moves under the team name so no figure is lost.
 */
const COLUMNS: readonly Column[] = [
  { id: "played", secondary: false },
  { id: "wins", secondary: true },
  { id: "draws", secondary: true },
  { id: "losses", secondary: true },
  { id: "goalsFor", secondary: true },
  { id: "goalsAgainst", secondary: true },
  { id: "goalDifference", secondary: false },
  { id: "points", secondary: false },
];

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
      <Table containerLabelledBy={headingId} dense>
        <TableHeader>
          <TableRow>
            <TableHead scope="col" {...applyStyles(styles.headPosition)}>
              <abbr title={t("standings.col.position.full")}>{t("standings.col.position")}</abbr>
            </TableHead>
            <TableHead scope="col" {...applyStyles(styles.headTeam)}>
              {t("standings.col.team")}
            </TableHead>
            {COLUMNS.map((column) => (
              <NumericHead column={column} key={column.id} t={t} />
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((entry) => (
            <StandingsRow entry={entry} formats={formats} key={entry.row.teamId} t={t} />
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

function NumericHead({ column, t }: { readonly column: Column; readonly t: Translator }) {
  return (
    <TableHead
      scope="col"
      {...applyProps(undefined, undefined, styles.numeric, column.secondary && styles.secondary)}
    >
      <abbr title={t(`standings.col.${column.id}.full`)}>{t(`standings.col.${column.id}`)}</abbr>
    </TableHead>
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
    <TableRow>
      <TableCell {...applyStyles(styles.position)}>
        {formats.integer.format(row.position)}
      </TableCell>
      <TableCell {...applyStyles(styles.teamCell)}>
        <TeamName team={entry.team} t={t} />
        <Caption as="span" {...applyStyles(styles.record)}>
          {t("standings.row.record", {
            wins: formats.integer.format(row.wins),
            draws: formats.integer.format(row.draws),
            losses: formats.integer.format(row.losses),
            goalsFor: formats.integer.format(row.goalsFor),
            goalsAgainst: formats.integer.format(row.goalsAgainst),
          })}
        </Caption>
      </TableCell>
      {COLUMNS.map((column) => (
        <TableCell
          key={column.id}
          {...applyProps(
            undefined,
            undefined,
            styles.numeric,
            column.secondary && styles.secondary,
            column.id === "points" && styles.points,
          )}
        >
          {(column.id === "goalDifference" ? formats.signed : formats.integer).format(
            row[column.id],
          )}
        </TableCell>
      ))}
    </TableRow>
  );
}

function TeamName({ team, t }: { readonly team: StandingsTeamName; readonly t: Translator }) {
  switch (team.kind) {
    case "name":
      return <span {...applyStyles(styles.teamName)}>{team.value}</span>;
    case "loading":
      return (
        <span role="status" aria-label={t("standings.team.loading")}>
          <Skeleton {...applyStyles(styles.teamSkeleton)} />
        </span>
      );
    case "unresolved":
      return <span {...applyStyles(styles.teamUnresolved)}>{t("standings.team.unresolved")}</span>;
    default: {
      const exhaustive: never = team;
      return exhaustive;
    }
  }
}
