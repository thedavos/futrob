import { useId } from "react";
import type { RankingKindDto, RankingRowDto, RankingSnapshotDto } from "@futrob/api-contracts";
import { filterRankingRows, type RankingRowFilters } from "@futrob/sdk";
import { CheckCircleIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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

const ALL_TEAMS = "all";

/**
 * UX-RNK-001: every ranking states its criterion and eligibility next to the rows, with
 * the official badge the standings use for data computed from approved results only.
 */
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
  const separator = (
    <span aria-hidden="true" {...applyStyles(typography.caption, styles.metaSep)}>
      ·
    </span>
  );
  return (
    <div
      aria-label={t("competition.rankings.meta.label")}
      role="group"
      {...applyStyles(styles.meta)}
    >
      <Badge variant="approved">
        <CheckCircleIcon aria-hidden="true" size={14} />
        {t("competition.rankings.officialBadge")}
      </Badge>
      <Caption as="span" className={styles.metaStrong}>
        {t(RANKING_KIND_COPY[kind].criterion)}
      </Caption>
      {separator}
      <Caption as="span">
        {t("competition.rankings.eligibility", {
          matches: snapshot.eligibility.minimumMatches,
          percent: formatters.percent.format(snapshot.eligibility.minimumTeamMinutesRatio),
        })}
      </Caption>
      {separator}
      <Caption as="span">
        <time dateTime={snapshot.updatedAt}>
          {t("competition.rankings.meta.updated", {
            time: formatters.updatedAt.format(new Date(snapshot.updatedAt)),
          })}
        </time>
      </Caption>
    </div>
  );
}

export type RankingSelection = {
  readonly selectedId: string | null;
  readonly onSelect: (playerProfileId: string) => void;
};

export type RankingFilterControls = {
  readonly filters: RankingRowFilters;
  readonly onFiltersChange: (filters: RankingRowFilters) => void;
  /** Teams offered by the filter: only Teams whose names resolved, so none is guessed. */
  readonly teams: readonly { readonly id: string; readonly name: string }[];
};

export function RankingTable({
  filterControls,
  formatters,
  kind,
  names,
  selection,
  snapshot,
  t,
}: {
  readonly filterControls: RankingFilterControls;
  readonly formatters: RankingFormatters;
  readonly kind: RankingKindDto;
  readonly names: RankingNamesState;
  readonly selection: RankingSelection;
  readonly snapshot: RankingSnapshotDto;
  readonly t: Translator;
}) {
  const headingId = useId();
  const resolved = rankingNamesOf(names);
  const { filters, onFiltersChange } = filterControls;
  const rows = filterRankingRows(snapshot.rows, resolved, filters);
  const filtered = filters.query.trim() !== "" || filters.teamId !== null;
  return (
    <section aria-labelledby={headingId} {...applyStyles(styles.tableSection)}>
      <h2 id={headingId} {...applyStyles(vis.srOnly)}>
        {t(RANKING_KIND_COPY[kind].table)}
      </h2>
      <NamesNotice names={names} t={t} />
      <RankingFilters
        controls={filterControls}
        shown={rows.length}
        t={t}
        total={snapshot.rows.length}
      />
      {rows.length === 0 ? (
        <EmptyState>
          <EmptyStateCopy>
            <EmptyStateTitle>{t("competition.rankings.noMatches.title")}</EmptyStateTitle>
            <EmptyStateDescription>
              {t("competition.rankings.noMatches.description")}
            </EmptyStateDescription>
          </EmptyStateCopy>
          {filtered ? (
            <EmptyStateActions>
              <Button
                onClick={() => onFiltersChange({ query: "", teamId: null })}
                type="button"
                variant="outline"
              >
                {t("competition.rankings.clearFilters")}
              </Button>
            </EmptyStateActions>
          ) : null}
        </EmptyState>
      ) : (
        <Table
          aria-labelledby={headingId}
          containerLabelledBy={headingId}
          dense
          {...applyStyles(styles.table)}
        >
          <TableHeader>
            <TableRow>
              <TableHead align="end" scope="col" {...applyStyles(styles.position)}>
                <abbr
                  title={t("competition.rankings.column.positionTitle")}
                  {...applyStyles(styles.abbr)}
                >
                  {t("competition.rankings.column.position")}
                </abbr>
              </TableHead>
              <TableHead scope="col">{t("competition.rankings.column.player")}</TableHead>
              <TableHead align="end" scope="col" {...applyStyles(styles.secondaryHead)}>
                <abbr
                  title={t("competition.rankings.column.matchesTitle")}
                  {...applyStyles(styles.abbr)}
                >
                  {t("competition.rankings.column.matches")}
                </abbr>
              </TableHead>
              <TableHead align="end" scope="col" {...applyStyles(styles.secondaryHead)}>
                <abbr
                  title={t("competition.rankings.column.minutesTitle")}
                  {...applyStyles(styles.abbr)}
                >
                  {t("competition.rankings.column.minutes")}
                </abbr>
              </TableHead>
              <TableHead
                align="end"
                aria-sort="descending"
                scope="col"
                {...applyStyles(styles.metricHead)}
              >
                {t(RANKING_KIND_COPY[kind].metric)}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <RankingRow
                formatters={formatters}
                key={row.playerProfileId}
                kind={kind}
                loadingNames={names.status === "loading"}
                names={resolved}
                row={row}
                selection={selection}
                t={t}
              />
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}

function RankingFilters({
  controls,
  shown,
  t,
  total,
}: {
  readonly controls: RankingFilterControls;
  readonly shown: number;
  readonly t: Translator;
  readonly total: number;
}) {
  const { filters, onFiltersChange, teams } = controls;
  const teamItems = [
    { value: ALL_TEAMS, label: t("competition.rankings.allTeams") },
    ...teams.map((team) => ({ value: team.id, label: team.name })),
  ];
  const integer = new Intl.NumberFormat(t.locale);
  return (
    <div
      aria-label={t("competition.rankings.filters.label")}
      role="search"
      {...applyStyles(styles.filters)}
    >
      <Field name="rankings-search">
        <InputWithIcon
          aria-label={t("competition.rankings.search")}
          dense
          onChange={(event) => onFiltersChange({ ...filters, query: event.target.value })}
          placeholder={t("competition.rankings.search")}
          startIcon={MagnifyingGlassIcon}
          type="search"
          value={filters.query}
        />
      </Field>
      {teams.length > 1 ? (
        <Field name="rankings-team-filter">
          <Select
            items={teamItems}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                // "all" or a value outside the offered Teams shows every Team.
                teamId: teams.find((team) => team.id === value)?.id ?? null,
              })
            }
            value={filters.teamId ?? ALL_TEAMS}
          >
            <SelectTrigger aria-label={t("competition.rankings.teamFilter")} dense>
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
      ) : null}
      <Caption aria-live="polite" as="p" className={styles.filterCount}>
        {t("competition.rankings.filters.count", {
          shown: integer.format(shown),
          total: integer.format(total),
        })}
      </Caption>
    </div>
  );
}

function RankingRow({
  formatters,
  kind,
  loadingNames,
  names,
  row,
  selection,
  t,
}: {
  readonly formatters: RankingFormatters;
  readonly kind: RankingKindDto;
  readonly loadingNames: boolean;
  readonly names: RankingNames;
  readonly row: RankingRowDto;
  readonly selection: RankingSelection;
  readonly t: Translator;
}) {
  const player = rankingPlayerName(names, row);
  const team = row.teamId ? names.teams.get(row.teamId) : undefined;
  const selected = selection.selectedId === row.playerProfileId;
  const select = () => selection.onSelect(row.playerProfileId);
  return (
    <TableRow
      aria-selected={selected}
      className={styles.selectableRow}
      data-ranking-row=""
      data-state={selected ? "selected" : undefined}
      onClick={select}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          select();
        }
      }}
      tabIndex={0}
    >
      <TableCell align="end" {...applyStyles(styles.position, styles.positionCell)}>
        {selected ? <span aria-hidden="true" {...applyStyles(styles.selectionBar)} /> : null}
        {formatters.integer.format(row.position)}
      </TableCell>
      <TableCell>
        {loadingNames ? (
          <span aria-label={t("competition.rankings.names.loading")} role="img">
            <Skeleton {...applyStyles(styles.nameSkeleton)} />
          </span>
        ) : (
          <div {...applyStyles(styles.identity)}>
            <Text
              className={
                player ? (selected ? styles.playerNameSelected : styles.playerName) : styles.unnamed
              }
              tone="default"
            >
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
      <TableCell align="end" {...applyStyles(styles.secondary)}>
        {formatters.integer.format(row.matchesPlayed)}
      </TableCell>
      <TableCell align="end" {...applyStyles(styles.secondary)}>
        {formatters.integer.format(row.minutes)}
      </TableCell>
      <TableCell align="end" {...applyStyles(styles.metric)}>
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
