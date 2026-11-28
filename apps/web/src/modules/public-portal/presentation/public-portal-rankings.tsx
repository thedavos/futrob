import { useId, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircleIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import type { GetPublicRankingResponse, PublicRankingKindDto } from "@futrob/api-contracts";
import {
  applyStyles,
  Badge,
  Button,
  Caption,
  EmptyState,
  EmptyStateActions,
  EmptyStateCopy,
  EmptyStateDescription,
  EmptyStateTitle,
  Field,
  InputWithIcon,
  Score,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  typography,
  vis,
} from "@futrob/ui";
import emptyStatsUrl from "@/assets/illustration-my-stats.png";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import {
  PORTAL_RANKING_KINDS,
  rankingUsesPerMatchRate,
  type PortalRef,
} from "./public-portal-model.ts";
import { PortalRankingSummaryStrip } from "./public-portal-rankings-summary.tsx";
import { rankingsStyles } from "./public-portal-rankings.styles.ts";
import { PortalEmpty } from "./public-portal-states.tsx";

type Ranking = GetPublicRankingResponse["ranking"];

const ALL_TEAMS = "all";

function Abbr({ full, short }: { readonly full: string; readonly short: string }) {
  return (
    <abbr title={full} {...applyStyles(rankingsStyles.abbr)}>
      {short}
    </abbr>
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
    <nav aria-label={t("portal.rankings.kinds")} {...applyStyles(rankingsStyles.kindsWrap)}>
      <ul {...applyStyles(rankingsStyles.kinds)}>
        {PORTAL_RANKING_KINDS.map((kind) => (
          <li key={kind}>
            <Link
              aria-current={kind === current ? "page" : undefined}
              params={portalRef}
              search={{ kind }}
              to="/$organizationSlug/$competitionKey/rankings"
              {...applyStyles(
                typography.label,
                rankingsStyles.kind,
                kind === current && rankingsStyles.kindActive,
              )}
            >
              {t(`competition.rankings.kind.${kind}`)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Public player rankings (Alternative A): pill kind tabs, 4 ProfileKpiStat summary cards,
 * approved badge + criterion metadata, player/team filters, and dense table.
 */
export function PortalRankingView({
  portalRef,
  ranking,
}: {
  readonly portalRef: PortalRef;
  readonly ranking: Ranking;
}) {
  const { locale, t } = useI18n();
  const headingId = useId();
  const [query, setQuery] = useState("");
  const [teamFilter, setTeamFilter] = useState<string | null>(null);

  const integer = new Intl.NumberFormat(locale);
  const valueFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const rateFormat = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const updated = ranking.updatedAt
    ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(ranking.updatedAt),
      )
    : null;

  const teams = [
    ...new Set(
      ranking.rows.map((row) => row.teamName).filter((name): name is string => name !== null),
    ),
  ].sort((left, right) => left.localeCompare(right, locale));

  const activeTeam = teamFilter && teams.includes(teamFilter) ? teamFilter : null;
  const normalizedQuery = query.trim().toLocaleLowerCase(locale);
  const filteredRows = ranking.rows.filter((row) => {
    if (activeTeam !== null && row.teamName !== activeTeam) return false;
    if (normalizedQuery.length > 0) {
      const hay = `${row.playerName} ${row.teamName ?? ""}`.toLocaleLowerCase(locale);
      if (!hay.includes(normalizedQuery)) return false;
    }
    return true;
  });
  const hasFilters = normalizedQuery.length > 0 || activeTeam !== null;
  const usesRate = rankingUsesPerMatchRate(ranking.kind);
  const teamItems = [
    { value: ALL_TEAMS, label: t("competition.rankings.allTeams") },
    ...teams.map((name) => ({ value: name, label: name })),
  ];

  return (
    <section aria-labelledby={headingId} {...applyStyles(rankingsStyles.stack)}>
      <h2 id={headingId} {...applyStyles(vis.srOnly)}>
        {t(`competition.rankings.table.${ranking.kind}`)}
      </h2>

      <RankingKinds current={ranking.kind} portalRef={portalRef} />

      <div
        aria-label={t("competition.rankings.meta.label")}
        role="group"
        {...applyStyles(rankingsStyles.meta)}
      >
        <Badge variant="approved">
          <CheckCircleIcon aria-hidden="true" size={14} />
          {t("competition.rankings.officialBadge")}
        </Badge>
        <Caption as="span" className={rankingsStyles.metaStrong}>
          {t(`competition.rankings.criterion.${ranking.kind}`)}
        </Caption>
        {updated && ranking.updatedAt ? (
          <>
            <span aria-hidden="true" {...applyStyles(typography.caption, rankingsStyles.metaSep)}>
              ·
            </span>
            <Caption as="span">
              <time dateTime={ranking.updatedAt}>
                {t("standings.table.updated", { time: updated })}
              </time>
            </Caption>
          </>
        ) : null}
      </div>

      {ranking.rows.length === 0 ? (
        <PortalEmpty
          description={t("portal.rankings.empty.description")}
          illustration={emptyStatsUrl}
          title={t("portal.rankings.empty.title")}
        />
      ) : (
        <>
          <PortalRankingSummaryStrip ranking={ranking} />

          <div
            aria-label={t("competition.rankings.filters.label")}
            role="search"
            {...applyStyles(rankingsStyles.filters)}
          >
            <div {...applyStyles(rankingsStyles.searchSlot)}>
              <Field name="portal-rankings-search">
                <InputWithIcon
                  aria-label={t("competition.rankings.search")}
                  dense
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("competition.rankings.search")}
                  startIcon={MagnifyingGlassIcon}
                  type="search"
                  value={query}
                />
              </Field>
            </div>
            {teams.length > 1 ? (
              <div {...applyStyles(rankingsStyles.teamSlot)}>
                <Field name="portal-rankings-team">
                  <Select
                    items={teamItems}
                    onValueChange={(value) =>
                      setTeamFilter(!value || value === ALL_TEAMS ? null : String(value))
                    }
                    value={activeTeam ?? ALL_TEAMS}
                  >
                    <SelectTrigger
                      aria-label={t("competition.rankings.teamFilter")}
                      className={rankingsStyles.filterTrigger}
                      dense
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {teamItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            ) : null}
            <Caption aria-live="polite" as="p" className={rankingsStyles.filterCount}>
              {t("competition.rankings.filters.count", {
                shown: integer.format(filteredRows.length),
                total: integer.format(ranking.rows.length),
              })}
            </Caption>
          </div>

          {filteredRows.length === 0 ? (
            <EmptyState>
              <EmptyStateCopy>
                <EmptyStateTitle>{t("competition.rankings.noMatches.title")}</EmptyStateTitle>
                <EmptyStateDescription>
                  {t("competition.rankings.noMatches.description")}
                </EmptyStateDescription>
              </EmptyStateCopy>
              {hasFilters ? (
                <EmptyStateActions>
                  <Button
                    onClick={() => {
                      setQuery("");
                      setTeamFilter(null);
                    }}
                    type="button"
                    variant="outline"
                  >
                    {t("competition.rankings.clearFilters")}
                  </Button>
                </EmptyStateActions>
              ) : null}
            </EmptyState>
          ) : (
            <Table containerLabelledBy={headingId} dense>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">
                    <Abbr
                      full={t("standings.col.position.full")}
                      short={t("standings.col.position")}
                    />
                  </TableHead>
                  <TableHead scope="col">{t("portal.rankings.col.player")}</TableHead>
                  <TableHead align="end" scope="col">
                    <Abbr
                      full={t("portal.rankings.col.matches.full")}
                      short={t("portal.rankings.col.matches")}
                    />
                  </TableHead>
                  {usesRate ? (
                    <TableHead align="end" className={rankingsStyles.wideOnly} scope="col">
                      <Abbr
                        full={t("portal.rankings.col.perMatch.full")}
                        short={t("portal.rankings.col.perMatch")}
                      />
                    </TableHead>
                  ) : null}
                  <TableHead align="end" aria-sort="descending" scope="col">
                    {t(`competition.rankings.metric.${ranking.kind}`)}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row) => (
                  <TableRow key={`${row.position}:${row.playerName}`}>
                    <TableCell className={rankingsStyles.positionCell}>
                      {row.position === 1 ? (
                        <span aria-hidden="true" {...applyStyles(rankingsStyles.leaderBar)} />
                      ) : null}
                      <Score as="span" size="table">
                        {integer.format(row.position)}
                      </Score>
                    </TableCell>
                    <TableCell>
                      <div {...applyStyles(rankingsStyles.identity)}>
                        <span {...applyStyles(rankingsStyles.playerName)}>{row.playerName}</span>
                        <Caption as="span">{row.teamName ?? "—"}</Caption>
                      </div>
                    </TableCell>
                    <TableCell align="end">{integer.format(row.matchesPlayed)}</TableCell>
                    {usesRate ? (
                      <TableCell align="end" className={rankingsStyles.wideOnly}>
                        {row.matchesPlayed > 0
                          ? rateFormat.format(row.value / row.matchesPlayed)
                          : "—"}
                      </TableCell>
                    ) : null}
                    <TableCell
                      align="end"
                      className={[
                        rankingsStyles.metricCell,
                        row.position === 1 && rankingsStyles.metricLeader,
                      ]}
                    >
                      {valueFormat.format(row.value)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </>
      )}
    </section>
  );
}
