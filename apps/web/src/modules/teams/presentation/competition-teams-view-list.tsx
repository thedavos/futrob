"use client";

import type { CompetitionTeamManagementSummaryDto } from "@futrob/api-contracts";
import * as stylex from "@stylexjs/stylex";
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
  Skeleton,
  typography,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
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

const spin = stylex.keyframes({
  to: { transform: "rotate(360deg)" },
});

const styles = stylex.create({
  stack: {
    display: "grid",
    gap: "0.75rem",
    padding: "1rem",
  },
  skeleton: {
    height: "4.25rem",
  },
  emptyWrap: {
    minWidth: 0,
    padding: "1.25rem",
  },
  empty: {
    minHeight: "16rem",
    minWidth: 0,
  },
  toolbar: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    padding: "1rem",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.border,
  },
  pills: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
  },
  pendingDot: {
    width: "0.375rem",
    height: "0.375rem",
    flexShrink: 0,
    borderRadius: "var(--corner-full)",
    backgroundColor: colors.warning,
  },
  nav: {
    display: "flex",
    flexDirection: "column",
  },
  item: {
    position: "relative",
    width: "100%",
    minHeight: "4.25rem",
    paddingBlock: "0.75rem",
    paddingLeft: "1rem",
    paddingRight: "0.875rem",
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: "color-mix(in oklab, var(--border-subtle) 65%, transparent)",
    textAlign: "start",
    cursor: "pointer",
    transitionProperty: "background-color, color",
    transitionDuration: "var(--duration-fast)",
    transitionTimingFunction: "var(--ease-standard)",
    backgroundColor: {
      default: "transparent",
      ":hover": "color-mix(in oklab, var(--muted) 45%, transparent)",
      ":is([aria-current=true])": "color-mix(in oklab, var(--muted) 30%, transparent)",
      ":is([aria-current=true]):hover": "color-mix(in oklab, var(--muted) 50%, transparent)",
    },
    outlineColor: colors.ring,
    outlineStyle: {
      default: "none",
      ":focus-visible": "solid",
    },
    outlineWidth: 2,
    outlineOffset: -2,
  },
  itemLast: {
    borderBottomWidth: 0,
  },
  selectionBar: {
    position: "absolute",
    insetInlineStart: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
    pointerEvents: "none",
  },
  row: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "0.75rem",
  },
  copy: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
    gap: "0.25rem",
  },
  name: {
    display: "block",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: "var(--text-sm)",
    lineHeight: "1.25rem",
    fontWeight: 500,
    color: colors.foreground,
  },
  selectedName: {
    fontWeight: 600,
  },
  metaRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: "0.5rem",
    rowGap: "0.125rem",
  },
  meta: {
    fontVariantNumeric: "tabular-nums",
    color: colors.mutedForeground,
  },
  warningMeta: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.25rem",
    color: colors.warning,
    fontWeight: 500,
  },
  warningIcon: {
    width: "0.875rem",
    height: "0.875rem",
    flexShrink: 0,
  },
  filteredEmpty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.75rem",
    padding: "1.5rem 1rem",
    textAlign: "center",
  },
  filteredEmptyText: {
    color: colors.mutedForeground,
  },
  moreWrap: {
    padding: "0.75rem 1rem",
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.border,
  },
  more: {
    width: "100%",
  },
  spinner: {
    width: "1rem",
    height: "1rem",
    animationName: {
      default: spin,
      [media.reduceMotion]: "none",
    },
    animationDuration: "1s",
    animationIterationCount: "infinite",
    animationTimingFunction: "linear",
  },
});

const skeleton = applyStyles(styles.skeleton);
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
    return (
      <div
        aria-label={t("competition.teams.list.loading")}
        role="status"
        {...applyStyles(styles.stack)}
      >
        <Skeleton className={skeleton.className} style={skeleton.style} />
        <Skeleton className={skeleton.className} style={skeleton.style} />
        <Skeleton className={skeleton.className} style={skeleton.style} />
      </div>
    );
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
              {t("competition.teams.filter.all", { count: counts.total })}
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
