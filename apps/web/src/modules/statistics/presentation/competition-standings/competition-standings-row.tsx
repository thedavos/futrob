"use client";

import type { CompetitionStandingRowDto } from "@futrob/api-contracts";
import { applyStyles, Badge, Caption, Score, Skeleton, TableCell, TableRow, vis } from "@futrob/ui";
import { ClubCrestAvatar } from "@/shared/presentation/club-crest-avatar.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import type { StandingsTableRow, StandingsTeamName } from "./competition-standings-model.ts";
import { styles } from "./competition-standings.styles.ts";

export type PreFormFigureId =
  | "played"
  | "wins"
  | "draws"
  | "losses"
  | "goalsFor"
  | "goalsAgainst"
  | "goalDifference"
  | "buchholz";

export const SECONDARY_FIGURES: ReadonlySet<PreFormFigureId> = new Set([
  "wins",
  "draws",
  "losses",
  "goalsFor",
  "goalsAgainst",
]);

export type StandingsFormats = {
  readonly integer: Intl.NumberFormat;
  readonly signed: Intl.NumberFormat;
};

type FormResult = CompetitionStandingRowDto["form"][number];

const FORM_SLOTS = 5;

const FORM_RESULT_STYLE = {
  win: styles.formWin,
  draw: styles.formDraw,
  loss: styles.formLoss,
} as const satisfies Record<FormResult, (typeof styles)[keyof typeof styles]>;

function figureValue(
  figure: PreFormFigureId,
  row: CompetitionStandingRowDto,
  formats: StandingsFormats,
): string | null {
  switch (figure) {
    case "buchholz":
      return row.swiss ? formats.integer.format(row.swiss.buchholz) : null;
    case "goalDifference":
      return formats.signed.format(row.goalDifference);
    case "played":
    case "wins":
    case "draws":
    case "losses":
    case "goalsFor":
    case "goalsAgainst":
      return formats.integer.format(row[figure]);
    default: {
      const exhaustive: never = figure;
      return exhaustive;
    }
  }
}

export function StandingsRow({
  allColumns,
  entry,
  formats,
  preFormFigures,
  t,
}: {
  /** Shows W/D/L/GF/GA below `md`, where they are otherwise left out to prioritise points. */
  readonly allColumns: boolean;
  readonly entry: StandingsTableRow;
  readonly formats: StandingsFormats;
  readonly preFormFigures: readonly PreFormFigureId[];
  readonly t: Translator;
}) {
  const { row } = entry;
  const deducted = row.pointsDeducted ?? 0;

  return (
    <TableRow className={[styles.row, entry.lastAboveCut && styles.aboveCut]}>
      <TableCell className={[styles.cell, styles.position]}>
        {entry.inHighlightedZone ? (
          <span aria-hidden="true" {...applyStyles(styles.zoneBar)} />
        ) : null}
        <Score
          as="span"
          size="table"
          {...applyStyles(styles.positionValue, row.position === 1 && styles.leader)}
        >
          {formats.integer.format(row.position)}
        </Score>
      </TableCell>
      <TableCell className={[styles.cell, styles.teamCell]}>
        <TeamName deducted={deducted} formats={formats} team={entry.team} t={t} />
        {row.swiss && (row.swiss.byes > 0 || row.swiss.withdrawn) ? (
          <span {...applyStyles(styles.swissDetail)}>
            {row.swiss.withdrawn ? (
              <Badge variant="warning">{t("standings.swiss.withdrawn")}</Badge>
            ) : null}
            {row.swiss.byes > 0 ? (
              <Caption as="span">{t("standings.swiss.byes", { count: row.swiss.byes })}</Caption>
            ) : null}
          </span>
        ) : null}
        <FormStrip form={row.form} narrow t={t} />
      </TableCell>
      {preFormFigures.map((figure) => (
        <TableCell
          align="end"
          className={[
            styles.cell,
            !allColumns && SECONDARY_FIGURES.has(figure) && styles.secondaryCell,
          ]}
          key={figure}
        >
          <Score
            align="end"
            as="span"
            className={
              figure === "goalDifference" && row.goalDifference > 0
                ? styles.figurePositive
                : styles.figure
            }
            size="table"
          >
            {figureValue(figure, row, formats) ?? "—"}
          </Score>
        </TableCell>
      ))}
      <TableCell align="end" className={[styles.cell, styles.formCell]}>
        <FormStrip form={row.form} t={t} />
      </TableCell>
      <TableCell align="end" className={styles.cell}>
        <Score align="end" as="span" className={styles.points} size="table">
          {formats.integer.format(row.points)}
        </Score>
      </TableCell>
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
          {...applyStyles(
            styles.formResult,
            FORM_RESULT_STYLE[result],
            index === form.length - 1 && styles.formLatest,
          )}
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

function TeamName({
  deducted,
  formats,
  team,
  t,
}: {
  readonly deducted: number;
  readonly formats: StandingsFormats;
  readonly team: StandingsTeamName;
  readonly t: Translator;
}) {
  const crest = applyStyles(styles.crest);
  const deductionBadge =
    deducted > 0 ? (
      <Badge
        title={t("standings.sanction.deducted.title", { points: formats.integer.format(deducted) })}
        variant="warning"
      >
        {t("standings.sanction.deducted", { points: formats.integer.format(deducted) })}
      </Badge>
    ) : null;

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
          <span {...applyStyles(styles.teamCopy)}>
            <span {...applyStyles(styles.teamName)}>{team.value}</span>
            {deductionBadge}
          </span>
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
          <span {...applyStyles(styles.teamCopy)}>
            <span {...applyStyles(styles.teamUnresolved)}>{t("standings.team.unresolved")}</span>
            {deductionBadge}
          </span>
        </span>
      );
    default: {
      const exhaustive: never = team;
      return exhaustive;
    }
  }
}
