import { useId, useState } from "react";
import { CheckCircleIcon, FlagCheckeredIcon, TableIcon } from "@phosphor-icons/react";
import type { GetPublicStandingsResponse } from "@futrob/api-contracts";
import {
  applyStyles,
  Badge,
  Button,
  Caption,
  Score,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  typography,
  vis,
} from "@futrob/ui";
import emptyStandingsUrl from "@/assets/illustration-empty-standings.png";
import { ClubCrestAvatar } from "@/shared/presentation/club-crest-avatar.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { publicStandingsCut } from "./public-portal-model.ts";
import { PortalFormStrip } from "./public-portal-shared.tsx";
import { PortalStandingsSummaryStrip } from "./public-portal-standings-summary.tsx";
import { standingsStyles } from "./public-portal-standings.styles.ts";
import { PortalEmpty } from "./public-portal-states.tsx";

type Standings = GetPublicStandingsResponse["standings"];

function Abbr({ full, short }: { readonly full: string; readonly short: string }) {
  return (
    <abbr title={full} {...applyStyles(standingsStyles.abbr)}>
      {short}
    </abbr>
  );
}

/**
 * Official public table (Alternative A): 4 ProfileKpiStat summary cards, approved badge,
 * Swiss support, FormStrip from the public contract, playoff cut zone bar, and mobile column toggle.
 */
export function PortalStandingsView({ standings }: { readonly standings: Standings }) {
  const { locale, t } = useI18n();
  const headingId = useId();
  const tableId = useId();
  const [allColumns, setAllColumns] = useState(false);

  if (standings.rows.length === 0) {
    return (
      <PortalEmpty
        description={t("portal.standings.empty.description")}
        illustration={emptyStandingsUrl}
        title={t("portal.standings.empty.title")}
      />
    );
  }

  const integer = new Intl.NumberFormat(locale);
  const signed = new Intl.NumberFormat(locale, { signDisplay: "exceptZero" });
  const updated = standings.updatedAt
    ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(standings.updatedAt),
      )
    : null;
  const cut = publicStandingsCut(standings);
  const isSwiss = standings.swiss !== null;
  const tiebreakCopy = isSwiss ? t("standings.tiebreak.swiss") : t("standings.tiebreak.league");
  const crest = applyStyles(standingsStyles.crest);

  return (
    <div {...applyStyles(standingsStyles.stack)}>
      <PortalStandingsSummaryStrip standings={standings} />

      <section aria-labelledby={headingId} {...applyStyles(standingsStyles.section)}>
        <h2 id={headingId} {...applyStyles(vis.srOnly)}>
          {t("standings.table.label")}
        </h2>

        <div {...applyStyles(standingsStyles.metaBar)}>
          <p {...applyStyles(standingsStyles.meta)}>
            <Badge variant="approved">
              <CheckCircleIcon aria-hidden="true" size={14} />
              {t("standings.officialBadge")}
            </Badge>
            {standings.swiss ? (
              standings.swiss.isFinal ? (
                <span {...applyStyles(typography.label, standingsStyles.swissFinal)}>
                  <FlagCheckeredIcon aria-hidden="true" size={16} />
                  {t("standings.swiss.final")}
                </span>
              ) : standings.swiss.currentRound !== null ? (
                <span {...applyStyles(typography.label, standingsStyles.swissProgress)}>
                  {t("standings.swiss.round", {
                    current: standings.swiss.currentRound,
                    total: standings.swiss.roundsTotal,
                  })}
                </span>
              ) : (
                <span {...applyStyles(typography.label, standingsStyles.swissProgress)}>
                  {t("standings.swiss.completed", {
                    completed: standings.swiss.roundsCompleted,
                    total: standings.swiss.roundsTotal,
                  })}
                </span>
              )
            ) : null}
            {updated && standings.updatedAt ? (
              <Caption as="span">
                <time dateTime={standings.updatedAt}>
                  {t("standings.table.updated", { time: updated })}
                </time>
              </Caption>
            ) : null}
            <span aria-hidden="true" {...applyStyles(typography.caption, standingsStyles.metaSep)}>
              ·
            </span>
            <Caption as="span">{tiebreakCopy}</Caption>
          </p>

          <Button
            aria-controls={tableId}
            aria-expanded={allColumns}
            className={standingsStyles.columnsToggle}
            onClick={() => setAllColumns((value) => !value)}
            type="button"
            variant="outline"
          >
            <TableIcon aria-hidden="true" size={16} />
            {allColumns ? t("standings.columns.showFewer") : t("standings.columns.showAll")}
          </Button>
        </div>

        <Caption as="p">{t("portal.standings.caption")}</Caption>
        {isSwiss ? <Caption as="p">{t("standings.swiss.tiebreak")}</Caption> : null}

        <Table containerLabelledBy={headingId} id={tableId}>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">
                <Abbr full={t("standings.col.position.full")} short={t("standings.col.position")} />
              </TableHead>
              <TableHead scope="col">{t("standings.col.team")}</TableHead>
              <TableHead align="end" scope="col">
                <Abbr full={t("standings.col.played.full")} short={t("standings.col.played")} />
              </TableHead>
              <TableHead
                align="end"
                className={!allColumns ? standingsStyles.secondaryCol : undefined}
                scope="col"
              >
                <Abbr
                  full={t("portal.standings.col.wins.full")}
                  short={t("portal.standings.col.wins")}
                />
              </TableHead>
              <TableHead
                align="end"
                className={!allColumns ? standingsStyles.secondaryCol : undefined}
                scope="col"
              >
                <Abbr
                  full={t("portal.standings.col.draws.full")}
                  short={t("portal.standings.col.draws")}
                />
              </TableHead>
              <TableHead
                align="end"
                className={!allColumns ? standingsStyles.secondaryCol : undefined}
                scope="col"
              >
                <Abbr
                  full={t("portal.standings.col.losses.full")}
                  short={t("portal.standings.col.losses")}
                />
              </TableHead>
              <TableHead
                align="end"
                className={!allColumns ? standingsStyles.secondaryCol : undefined}
                scope="col"
              >
                <Abbr
                  full={t("portal.standings.col.goalsFor.full")}
                  short={t("portal.standings.col.goalsFor")}
                />
              </TableHead>
              <TableHead
                align="end"
                className={!allColumns ? standingsStyles.secondaryCol : undefined}
                scope="col"
              >
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
              {isSwiss ? (
                <TableHead align="end" scope="col">
                  <Abbr
                    full={t("standings.col.buchholz.full")}
                    short={t("standings.col.buchholz")}
                  />
                </TableHead>
              ) : null}
              <TableHead align="end" className={standingsStyles.formCol} scope="col">
                <Abbr full={t("standings.col.form.full")} short={t("standings.col.form")} />
              </TableHead>
              <TableHead align="end" scope="col">
                <Abbr full={t("standings.col.points.full")} short={t("standings.col.points")} />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {standings.rows.map((row) => {
              const inZone = cut !== null ? row.position <= cut : row.position === 1;
              const isCutBoundary =
                cut !== null && row.position === cut && cut < standings.rows.length;
              return (
                <TableRow
                  className={isCutBoundary ? standingsStyles.rowAboveCut : undefined}
                  key={`${row.position}:${row.teamName}`}
                >
                  <TableCell className={standingsStyles.positionCell}>
                    {inZone ? (
                      <span aria-hidden="true" {...applyStyles(standingsStyles.zoneBar)} />
                    ) : null}
                    <Score
                      as="span"
                      size="table"
                      {...applyStyles(
                        standingsStyles.positionValue,
                        row.position === 1 && standingsStyles.positionLeader,
                      )}
                    >
                      {integer.format(row.position)}
                    </Score>
                  </TableCell>
                  <TableCell className={standingsStyles.teamCell}>
                    <div {...applyStyles(standingsStyles.teamWrap)}>
                      <ClubCrestAvatar
                        className={crest.className}
                        imageUrl={null}
                        name={row.teamName}
                        style={crest.style}
                      />
                      <span {...applyStyles(standingsStyles.teamName)}>{row.teamName}</span>
                    </div>
                    {row.withdrawn || (row.byes ?? 0) > 0 ? (
                      <span {...applyStyles(standingsStyles.swissDetail)}>
                        {row.withdrawn ? (
                          <Badge variant="warning">{t("standings.swiss.withdrawn")}</Badge>
                        ) : null}
                        {(row.byes ?? 0) > 0 ? (
                          <Caption as="span">
                            {t("standings.swiss.byes", { count: row.byes ?? 0 })}
                          </Caption>
                        ) : null}
                      </span>
                    ) : null}
                    <PortalFormStrip compact form={row.form} narrow t={t} />
                  </TableCell>
                  <TableCell align="end">{integer.format(row.played)}</TableCell>
                  <TableCell
                    align="end"
                    className={!allColumns ? standingsStyles.secondaryCol : undefined}
                  >
                    {integer.format(row.wins)}
                  </TableCell>
                  <TableCell
                    align="end"
                    className={!allColumns ? standingsStyles.secondaryCol : undefined}
                  >
                    {integer.format(row.draws)}
                  </TableCell>
                  <TableCell
                    align="end"
                    className={!allColumns ? standingsStyles.secondaryCol : undefined}
                  >
                    {integer.format(row.losses)}
                  </TableCell>
                  <TableCell
                    align="end"
                    className={!allColumns ? standingsStyles.secondaryCol : undefined}
                  >
                    {integer.format(row.goalsFor)}
                  </TableCell>
                  <TableCell
                    align="end"
                    className={!allColumns ? standingsStyles.secondaryCol : undefined}
                  >
                    {integer.format(row.goalsAgainst)}
                  </TableCell>
                  <TableCell
                    align="end"
                    className={row.goalDifference > 0 ? standingsStyles.figurePositive : undefined}
                  >
                    {signed.format(row.goalDifference)}
                  </TableCell>
                  {isSwiss ? (
                    <TableCell align="end">
                      {row.buchholz !== undefined ? integer.format(row.buchholz) : "—"}
                    </TableCell>
                  ) : null}
                  <TableCell align="end" className={standingsStyles.formCol}>
                    <PortalFormStrip form={row.form} t={t} />
                  </TableCell>
                  <TableCell align="end" className={standingsStyles.pointsCell}>
                    {integer.format(row.points)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <div {...applyStyles(standingsStyles.footer)}>
          <div {...applyStyles(standingsStyles.legend)}>
            {cut === null ? (
              <span {...applyStyles(typography.caption, standingsStyles.legendItem)}>
                <span aria-hidden="true" {...applyStyles(standingsStyles.legendBar)} />
                {t("standings.legend.leader")}
              </span>
            ) : (
              <>
                <span
                  {...applyStyles(
                    typography.caption,
                    standingsStyles.legendItem,
                    standingsStyles.cutNote,
                  )}
                >
                  <span aria-hidden="true" {...applyStyles(standingsStyles.legendBar)} />
                  {t("standings.playoffCut", { count: cut })}
                </span>
                <span {...applyStyles(typography.caption, standingsStyles.legendItem)}>
                  <span aria-hidden="true" {...applyStyles(standingsStyles.legendDash)} />
                  {t("standings.legend.cut")}
                </span>
              </>
            )}
          </div>
          <Caption as="span">{t("standings.legend.form")}</Caption>
        </div>
      </section>
    </div>
  );
}
