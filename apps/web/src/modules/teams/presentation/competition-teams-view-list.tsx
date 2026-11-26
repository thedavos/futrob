"use client";

import type { CompetitionTeamManagementSummaryDto } from "@futrob/api-contracts";
import {
  applyStyles,
  Button,
  ChoiceGroup,
  ChoiceGroupItem,
  EmptyState,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  Field,
  InputWithIcon,
  typography,
} from "@futrob/ui";
import {
  CircleNotchIcon,
  MagnifyingGlassIcon,
  UsersThreeIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { runAction } from "@/shared/presentation/run-action.ts";
import {
  filterCompetitionTeams,
  summarizeCompetitionTeams,
  type CompetitionTeamsFilter,
  type CompetitionTeamsSummary,
} from "./competition-teams-model.ts";
import type { CompetitionTeamsViewProps } from "./competition-teams-view.tsx";
import { EntryBadge } from "./competition-teams-view-entry.tsx";
import { styles } from "./competition-teams-view-list.styles.ts";
import { TeamListSkeleton } from "./competition-teams-view-skeleton.tsx";

const more = applyStyles(styles.more);
const spinner = applyStyles(styles.spinner);

export type TeamListProps = CompetitionTeamsViewProps & {
  readonly query?: string;
  readonly filter?: CompetitionTeamsFilter;
  readonly summary?: CompetitionTeamsSummary;
  readonly onQueryChange?: (query: string) => void;
  readonly onFilterChange?: (filter: CompetitionTeamsFilter) => void;
};

export function TeamList({
  items,
  loadingList,
  selectedTeamId,
  onSelectTeam,
  hasMoreTeams,
  loadingMoreTeams,
  onLoadMoreTeams,
  query = "",
  filter = "all",
  summary,
  onQueryChange,
  onFilterChange,
}: TeamListProps) {
  const { t } = useI18n();

  if (loadingList) {
    return <TeamListSkeleton />;
  }

  if (items.length === 0) {
    return (
      <div {...applyStyles(styles.emptyWrap)}>
        <EmptyState className={styles.empty}>
          <EmptyStateIcon>
            <UsersThreeIcon />
          </EmptyStateIcon>
          <EmptyStateTitle>{t("competition.teams.list.emptyTitle")}</EmptyStateTitle>
          <EmptyStateDescription>
            {t("competition.teams.list.emptyDescription")}
          </EmptyStateDescription>
        </EmptyState>
      </div>
    );
  }

  const counts = summary ?? summarizeCompetitionTeams(items);
  const visibleItems = filterCompetitionTeams(items, query, filter);
  const hasActiveFilters = query.trim().length > 0 || filter !== "all";

  return (
    <>
      {onQueryChange && onFilterChange ? (
        <div role="search" {...applyStyles(styles.toolbar)}>
          <Field name="competition-teams-search">
            <InputWithIcon
              aria-label={t("competition.teams.search")}
              autoComplete="off"
              dense
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder={t("competition.teams.search")}
              startIcon={MagnifyingGlassIcon}
              type="search"
              value={query}
            />
          </Field>
          <ChoiceGroup
            aria-label={t("competition.teams.filter.label")}
            className={styles.pills}
            onValueChange={(value) => {
              if (value === "all" || value === "pending" || value === "no_club") {
                onFilterChange(value);
              }
            }}
            value={filter}
          >
            <ChoiceGroupItem appearance="pill" dense value="all">
              {t("competition.teams.filter.all", { count: counts.loaded })}
            </ChoiceGroupItem>
            <ChoiceGroupItem appearance="pill" dense value="pending">
              {counts.pending > 0 ? (
                <span aria-hidden="true" {...applyStyles(styles.pendingDot)} />
              ) : null}
              {t("competition.teams.filter.pending", { count: counts.pending })}
            </ChoiceGroupItem>
            <ChoiceGroupItem appearance="pill" dense value="no_club">
              {t("competition.teams.filter.noClub", { count: counts.noClub })}
            </ChoiceGroupItem>
          </ChoiceGroup>
        </div>
      ) : null}

      {visibleItems.length === 0 ? (
        <div {...applyStyles(styles.filteredEmpty)}>
          <p {...applyStyles(typography.caption, styles.filteredEmptyText)}>
            {t("competition.teams.list.noMatches")}
          </p>
          {hasActiveFilters && onQueryChange && onFilterChange ? (
            <Button
              dense
              onClick={() => {
                onQueryChange("");
                onFilterChange("all");
              }}
              type="button"
              variant="outline"
            >
              {t("competition.teams.list.clearFilters")}
            </Button>
          ) : null}
        </div>
      ) : (
        <nav aria-label={t("competition.teams.list.navAria")} {...applyStyles(styles.nav)}>
          {visibleItems.map((item, index) => {
            const selected = selectedTeamId === item.team.id;
            const isLast = index === visibleItems.length - 1;
            return (
              <button
                aria-current={selected ? "true" : undefined}
                key={item.team.id}
                onClick={() => onSelectTeam(item.team.id)}
                type="button"
                {...applyStyles(styles.item, isLast && styles.itemLast)}
              >
                {selected ? (
                  <span aria-hidden="true" {...applyStyles(styles.selectionBar)} />
                ) : null}
                <span {...applyStyles(styles.row)}>
                  <span {...applyStyles(styles.copy)}>
                    <span
                      title={item.team.name}
                      {...applyStyles(styles.name, selected && styles.selectedName)}
                    >
                      {item.team.name}
                    </span>
                    <span {...applyStyles(styles.metaRow)}>
                      <span {...applyStyles(typography.caption, styles.meta)}>
                        {t("competition.teams.list.rosterMeta", {
                          count: item.roster.memberCount,
                          max: item.roster.maxSize,
                          state: rosterState(item, t),
                        })}
                      </span>
                      {item.externalClub === null ? (
                        <span {...applyStyles(typography.caption, styles.warningMeta)}>
                          <WarningIcon aria-hidden="true" {...applyStyles(styles.warningIcon)} />
                          {t("competition.teams.list.noClubBadge")}
                        </span>
                      ) : null}
                    </span>
                  </span>
                  <EntryBadge status={item.entry.status} />
                </span>
              </button>
            );
          })}
        </nav>
      )}

      {hasMoreTeams && onLoadMoreTeams ? (
        <div {...applyStyles(styles.moreWrap)}>
          <Button
            aria-busy={loadingMoreTeams || undefined}
            className={more.className}
            dense
            disabled={loadingMoreTeams}
            onClick={() => runAction(onLoadMoreTeams)}
            style={more.style}
            variant="outline"
          >
            {loadingMoreTeams ? (
              <CircleNotchIcon
                aria-hidden="true"
                className={spinner.className}
                data-icon="inline-start"
                style={spinner.style}
              />
            ) : null}
            {t("competition.teams.list.loadMore")}
          </Button>
        </div>
      ) : null}
    </>
  );
}

function rosterState(
  item: CompetitionTeamManagementSummaryDto,
  t: (key: "competition.teams.list.rosterOpen" | "competition.teams.list.rosterClosed") => string,
): string {
  return item.roster.state === "open"
    ? t("competition.teams.list.rosterOpen")
    : t("competition.teams.list.rosterClosed");
}
