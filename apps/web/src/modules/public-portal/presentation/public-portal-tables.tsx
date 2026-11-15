import { useId } from "react";
import { Link } from "@tanstack/react-router";
import type {
  GetPublicRankingResponse,
  GetPublicStandingsResponse,
  PublicRankingKindDto,
} from "@futrob/api-contracts";
import {
  applyStyles,
  Caption,
  Score,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  vis,
} from "@futrob/ui";
import emptyStandingsUrl from "@/assets/illustration-empty-standings.png";
import emptyStatsUrl from "@/assets/illustration-my-stats.png";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { PORTAL_RANKING_KINDS, type PortalRef } from "./public-portal-model.ts";
import { PortalEmpty } from "./public-portal-states.tsx";
import { styles } from "./public-portal.styles.ts";

type Standings = GetPublicStandingsResponse["standings"];
type Ranking = GetPublicRankingResponse["ranking"];

function Abbr({ full, short }: { readonly full: string; readonly short: string }) {
  return (
    <abbr title={full} {...applyStyles(styles.abbr)}>
      {short}
    </abbr>
  );
}

function UpdatedAt({ iso }: { readonly iso: string | null }) {
  const { locale, t } = useI18n();
  if (!iso) return null;
  const time = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(iso),
  );
  return (
    <Caption as="p">
      <time dateTime={iso}>{t("standings.table.updated", { time })}</time>
    </Caption>
  );
}

/** Official table. Narrow screens keep position, team, played, goal difference and points. */
export function PortalStandingsView({ standings }: { readonly standings: Standings }) {
  const { t } = useI18n();
  const headingId = useId();
  if (standings.rows.length === 0) {
    return (
      <PortalEmpty
        description={t("portal.standings.empty.description")}
        illustration={emptyStandingsUrl}
        title={t("portal.standings.empty.title")}
      />
    );
  }
  const signed = new Intl.NumberFormat(t.locale, { signDisplay: "exceptZero" });
  return (
    <section aria-labelledby={headingId} {...applyStyles(styles.section)}>
      <h2 id={headingId} {...applyStyles(vis.srOnly)}>
        {t("standings.table.label")}
      </h2>
      <Caption as="p">{t("portal.standings.caption")}</Caption>
      <UpdatedAt iso={standings.updatedAt} />
      <Table containerLabelledBy={headingId}>
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
          {standings.rows.map((row) => (
            <TableRow key={`${row.position}:${row.teamName}`}>
              <TableCell>
                <Score as="span" size="table">
                  {row.position}
                </Score>
              </TableCell>
              <TableCell className={styles.teamCell}>{row.teamName}</TableCell>
              <TableCell align="end">{row.played}</TableCell>
              <TableCell align="end" className={styles.wideOnly}>
                {row.wins}
              </TableCell>
              <TableCell align="end" className={styles.wideOnly}>
                {row.draws}
              </TableCell>
              <TableCell align="end" className={styles.wideOnly}>
                {row.losses}
              </TableCell>
              <TableCell align="end" className={styles.wideOnly}>
                {row.goalsFor}
              </TableCell>
              <TableCell align="end" className={styles.wideOnly}>
                {row.goalsAgainst}
              </TableCell>
              <TableCell align="end">{signed.format(row.goalDifference)}</TableCell>
              <TableCell align="end" className={styles.pointsCell}>
                {row.points}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

/** Player rankings with the criterion spelled out (UX-RNK-001), one kind at a time. */
export function PortalRankingView({
  portalRef,
  ranking,
}: {
  readonly portalRef: PortalRef;
  readonly ranking: Ranking;
}) {
  const { t } = useI18n();
  const headingId = useId();
  const number = new Intl.NumberFormat(t.locale, { maximumFractionDigits: 2 });
  return (
    <section aria-labelledby={headingId} {...applyStyles(styles.section)}>
      <h2 id={headingId} {...applyStyles(vis.srOnly)}>
        {t(`competition.rankings.table.${ranking.kind}`)}
      </h2>
      <RankingKinds current={ranking.kind} portalRef={portalRef} />
      <Caption as="p">{t(`competition.rankings.criterion.${ranking.kind}`)}</Caption>
      {ranking.rows.length === 0 ? (
        <PortalEmpty
          description={t("portal.rankings.empty.description")}
          illustration={emptyStatsUrl}
          title={t("portal.rankings.empty.title")}
        />
      ) : (
        <>
          <UpdatedAt iso={ranking.updatedAt} />
          <Table containerLabelledBy={headingId}>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">
                  <Abbr
                    full={t("standings.col.position.full")}
                    short={t("standings.col.position")}
                  />
                </TableHead>
                <TableHead scope="col">{t("portal.rankings.col.player")}</TableHead>
                <TableHead className={styles.wideOnly} scope="col">
                  {t("portal.rankings.col.team")}
                </TableHead>
                <TableHead align="end" scope="col">
                  <Abbr
                    full={t("portal.rankings.col.matches.full")}
                    short={t("portal.rankings.col.matches")}
                  />
                </TableHead>
                <TableHead align="end" scope="col">
                  {t(`competition.rankings.metric.${ranking.kind}`)}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranking.rows.map((row) => (
                <TableRow key={`${row.position}:${row.playerName}`}>
                  <TableCell>
                    <Score as="span" size="table">
                      {row.position}
                    </Score>
                  </TableCell>
                  <TableCell className={styles.teamCell}>{row.playerName}</TableCell>
                  <TableCell className={styles.wideOnly}>{row.teamName ?? "—"}</TableCell>
                  <TableCell align="end">{row.matchesPlayed}</TableCell>
                  <TableCell align="end" className={styles.pointsCell}>
                    {number.format(row.value)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </section>
  );
}

function RankingKinds({
  current,
  portalRef,
}: {
  readonly current: PublicRankingKindDto;
  readonly portalRef: PortalRef;
}) {
  const { t } = useI18n();
  return (
    <nav aria-label={t("portal.rankings.kinds")}>
      <ul {...applyStyles(styles.kinds)}>
        {PORTAL_RANKING_KINDS.map((kind) => (
          <li key={kind}>
            <Link
              aria-current={kind === current ? "page" : undefined}
              params={portalRef}
              search={{ kind }}
              to="/$organizationSlug/$competitionKey/rankings"
              {...applyStyles(styles.kind, kind === current && styles.kindActive)}
            >
              {t(`competition.rankings.kind.${kind}`)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
