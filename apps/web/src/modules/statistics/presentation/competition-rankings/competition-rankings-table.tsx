import { useId } from "react";
import type { RankingKindDto, RankingRowDto, RankingSnapshotDto } from "@futrob/api-contracts";
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
  Text,
  typography,
  vis,
} from "@futrob/ui";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { styles } from "./competition-rankings-page.styles.ts";
import {
  formatRankingValue,
  RANKING_KIND_COPY,
  rankingNamesOf,
  rankingPlayerName,
  type RankingFormatters,
  type RankingNames,
  type RankingNamesState,
} from "./competition-rankings-view.ts";
import { RetryAlert } from "@/shared/presentation/retry-alert.tsx";

/** UX-RNK-001: every ranking states its criterion and eligibility next to the rows. */
export function RankingMeta({
  formatters,
  kind,
  snapshot,
  t,
}: {
  readonly formatters: RankingFormatters;
  readonly kind: RankingKindDto;
  readonly snapshot: RankingSnapshotDto;
  readonly t: Translator;
}) {
  const items = [
    { term: t("competition.rankings.meta.criterion"), value: t(RANKING_KIND_COPY[kind].criterion) },
    {
      term: t("competition.rankings.meta.eligibility"),
      value: t("competition.rankings.eligibility", {
        matches: snapshot.eligibility.minimumMatches,
        percent: formatters.percent.format(snapshot.eligibility.minimumTeamMinutesRatio),
      }),
    },
    {
      term: t("competition.rankings.meta.updated"),
      value: (
        <time dateTime={snapshot.updatedAt}>
          {formatters.updatedAt.format(new Date(snapshot.updatedAt))}
        </time>
      ),
    },
  ];
  return (
    <dl {...applyStyles(styles.meta)}>
      {items.map((item) => (
        <div key={item.term} {...applyStyles(styles.metaItem)}>
          <dt {...applyStyles(typography.label, styles.metaTerm)}>{item.term}</dt>
          <dd {...applyStyles(typography.body, styles.metaValue)}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function RankingTable({
  formatters,
  kind,
  names,
  snapshot,
  t,
}: {
  readonly formatters: RankingFormatters;
  readonly kind: RankingKindDto;
  readonly names: RankingNamesState;
  readonly snapshot: RankingSnapshotDto;
  readonly t: Translator;
}) {
  const headingId = useId();
  const resolved = rankingNamesOf(names);
  return (
    <section aria-labelledby={headingId} {...applyStyles(styles.tableSection)}>
      <h2 id={headingId} {...applyStyles(vis.srOnly)}>
        {t(RANKING_KIND_COPY[kind].table)}
      </h2>
      <NamesNotice names={names} t={t} />
      <Table
        aria-labelledby={headingId}
        containerLabelledBy={headingId}
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
            <TableHead aria-sort="descending" scope="col" {...applyStyles(styles.numeric)}>
              {t(RANKING_KIND_COPY[kind].metric)}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {snapshot.rows.map((row) => (
            <RankingRow
              formatters={formatters}
              key={row.playerProfileId}
              kind={kind}
              loadingNames={names.status === "loading"}
              names={resolved}
              row={row}
              t={t}
            />
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

function RankingRow({
  formatters,
  kind,
  loadingNames,
  names,
  row,
  t,
}: {
  readonly formatters: RankingFormatters;
  readonly kind: RankingKindDto;
  readonly loadingNames: boolean;
  readonly names: RankingNames;
  readonly row: RankingRowDto;
  readonly t: Translator;
}) {
  const player = rankingPlayerName(names, row);
  const team = row.teamId ? names.teams.get(row.teamId) : undefined;
  return (
    <TableRow data-ranking-row="">
      <TableCell {...applyStyles(styles.position)}>
        {formatters.integer.format(row.position)}
      </TableCell>
      <TableCell>
        {loadingNames ? (
          <span aria-label={t("competition.rankings.names.loading")} role="img">
            <Skeleton {...applyStyles(styles.nameSkeleton)} />
          </span>
        ) : (
          <div {...applyStyles(styles.identity)}>
            <Text className={player ? styles.playerName : styles.unnamed} tone="default">
              {player ?? t("competition.rankings.player.unnamed")}
            </Text>
            <Caption as="span" className={styles.teamName}>
              {row.teamId === null
                ? t("competition.rankings.team.none")
                : (team ?? t("competition.rankings.team.unnamed"))}
            </Caption>
          </div>
        )}
      </TableCell>
      <TableCell {...applyStyles(styles.numeric)}>
        {formatters.integer.format(row.matchesPlayed)}
      </TableCell>
      <TableCell {...applyStyles(styles.numeric)}>
        {formatters.integer.format(row.minutes)}
      </TableCell>
      <TableCell {...applyStyles(styles.metric)}>
        {formatRankingValue(kind, row.value, formatters)}
      </TableCell>
    </TableRow>
  );
}

function NamesNotice({ names, t }: { readonly names: RankingNamesState; readonly t: Translator }) {
  if (names.status === "loading") return null;
  return (
    <>
      {names.restricted === "none" ? null : (
        <Caption as="p">
          {t(
            names.restricted === "all"
              ? "competition.rankings.names.restricted"
              : "competition.rankings.names.partiallyRestricted",
          )}
        </Caption>
      )}
      {names.status === "failed" ? (
        <RetryAlert message={t("competition.rankings.names.error")} retry={names.retry} t={t} />
      ) : null}
    </>
  );
}
