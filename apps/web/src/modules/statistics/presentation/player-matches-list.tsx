"use client";

import type { ReactNode } from "react";
import type { PlayerRecentProviderMatchDto } from "@futrob/api-contracts";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  ChoiceGroup,
  ChoiceGroupItem,
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Skeleton,
  applyStyles,
} from "@futrob/ui";
import { listTypography, styles } from "./player-matches-list.styles.ts";
import { SoccerBallIcon } from "@phosphor-icons/react";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import {
  dayHeading,
  EMPTY_DESCRIPTION_KEYS,
  EMPTY_TITLE_KEYS,
  HISTORY_LABEL_KEYS,
  MATCH_SORT_KEYS,
  VIEW_FILTER_KEYS,
} from "./player-match-copy.ts";
import { ViewRecord } from "./player-match-record.tsx";
import { ProviderMatchRow } from "./player-match-row.tsx";
import {
  calendarDayKind,
  groupMatchesByDay,
  isMatchSortOrder,
  isPlayerMatchesView,
  MATCH_SORT_ORDERS,
  matchesForView,
  PLAYER_MATCHES_VIEWS,
  showsMatchTypeBadge,
  sortMatchesByOccurredAt,
  summarizeMatchRecord,
  type MatchDayGroup,
  type MatchSortOrder,
  type PlayerMatchesView,
} from "./player-match-view.ts";

export type SectionStatus = "pending" | "error" | "ready";

export function ReadyMatches({
  activeView,
  dateTimeFormat,
  dayDateFormat,
  matches,
  now,
  numberFormat,
  onSortChange,
  onViewChange,
  sortOrder,
  t,
}: {
  readonly activeView: PlayerMatchesView;
  readonly dateTimeFormat: Intl.DateTimeFormat;
  readonly dayDateFormat: Intl.DateTimeFormat;
  readonly matches: readonly PlayerRecentProviderMatchDto[];
  readonly now: Date;
  readonly numberFormat: Intl.NumberFormat;
  readonly onSortChange: (order: MatchSortOrder) => void;
  readonly onViewChange: (view: PlayerMatchesView) => void;
  readonly sortOrder: MatchSortOrder;
  readonly t: Translator;
}) {
  const visibleMatches = sortMatchesByOccurredAt(matchesForView(matches, activeView), sortOrder);
  const record = summarizeMatchRecord(visibleMatches);
  const groups = groupMatchesByDay(visibleMatches);

  return (
    <div {...applyStyles(styles.stack)}>
      {visibleMatches.length > 0 ? (
        <ViewRecord matches={visibleMatches} numberFormat={numberFormat} record={record} />
      ) : null}
      <div {...applyStyles(styles.body)}>
        <MatchesToolbar
          activeView={activeView}
          onSortChange={onSortChange}
          onViewChange={onViewChange}
          resultCount={visibleMatches.length}
          sortOrder={sortOrder}
          t={t}
        />
        <MatchDayLists
          dateTimeFormat={dateTimeFormat}
          dayDateFormat={dayDateFormat}
          emptyDescription={t(EMPTY_DESCRIPTION_KEYS[activeView])}
          emptyTitle={t(EMPTY_TITLE_KEYS[activeView])}
          groups={groups}
          historyLabel={t(HISTORY_LABEL_KEYS[activeView])}
          now={now}
          numberFormat={numberFormat}
          sortOrder={sortOrder}
          showMatchType={showsMatchTypeBadge(activeView)}
          t={t}
          view={activeView}
        />
      </div>
    </div>
  );
}

export function MatchDayLists({
  dateTimeFormat,
  dayDateFormat,
  emptyDescription,
  emptyTitle,
  groups,
  historyLabel,
  now,
  numberFormat,
  sortOrder,
  showMatchType,
  t,
  view,
}: {
  readonly dateTimeFormat: Intl.DateTimeFormat;
  readonly dayDateFormat: Intl.DateTimeFormat;
  readonly emptyDescription: string;
  readonly emptyTitle: string;
  readonly groups: readonly MatchDayGroup[];
  readonly historyLabel: string;
  readonly now: Date;
  readonly numberFormat: Intl.NumberFormat;
  readonly sortOrder: MatchSortOrder;
  readonly showMatchType: boolean;
  readonly t: Translator;
  readonly view: PlayerMatchesView;
}) {
  if (groups.length === 0) {
    return <MatchesEmpty description={emptyDescription} title={emptyTitle} />;
  }

  return (
    <div aria-label={historyLabel} role="region" {...applyStyles(styles.stack)}>
      {groups.map((group) => {
        const kind = calendarDayKind(group.occurredAt, now);
        const heading = dayHeading(kind, group.occurredAt, dayDateFormat, t);
        return (
          <section key={group.dayKey} {...applyStyles(styles.day)}>
            <h2 {...applyStyles(listTypography.label, styles.dayHeading)}>
              <time dateTime={group.dayKey}>{heading}</time>
            </h2>
            <ol {...applyStyles(styles.dayList)}>
              {group.matches.map((item) => (
                <ProviderMatchRow
                  dateTimeFormat={dateTimeFormat}
                  item={item}
                  key={`${item.match.provider.key}:${item.match.provider.externalMatchId}`}
                  numberFormat={numberFormat}
                  sortOrder={sortOrder}
                  showMatchType={showMatchType}
                  t={t}
                  view={view}
                />
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

export function MatchesToolbar({
  activeView,
  onSortChange,
  onViewChange,
  resultCount,
  sortOrder,
  t,
}: {
  readonly activeView: PlayerMatchesView;
  readonly onSortChange: (order: MatchSortOrder) => void;
  readonly onViewChange: (view: PlayerMatchesView) => void;
  readonly resultCount?: number;
  readonly sortOrder: MatchSortOrder;
  readonly t: Translator;
}) {
  const toolbar = applyStyles(styles.toolbar);
  const toolbarContent = applyStyles(styles.toolbarContent);
  const views = applyStyles(styles.views);
  const viewPill = applyStyles(styles.viewPill);
  const separator = applyStyles(styles.separator);
  const sortTrigger = applyStyles(styles.sortTrigger);
  return (
    <Card className={toolbar.className} style={toolbar.style}>
      <CardContent className={toolbarContent.className} style={toolbarContent.style}>
        <ChoiceGroup<PlayerMatchesView>
          aria-label={t("player.matches.view.label")}
          className={views.className}
          onValueChange={(value) => {
            if (isPlayerMatchesView(value)) onViewChange(value);
          }}
          style={views.style}
          value={activeView}
        >
          {PLAYER_MATCHES_VIEWS.map((view) => (
            <ChoiceGroupItem
              appearance="pill"
              className={viewPill.className}
              key={view}
              style={viewPill.style}
              value={view}
            >
              {t(VIEW_FILTER_KEYS[view])}
            </ChoiceGroupItem>
          ))}
        </ChoiceGroup>
        <Separator className={separator.className} orientation="vertical" style={separator.style} />
        <div {...applyStyles(styles.toolbarEnd)}>
          <Select
            itemToStringLabel={(value) =>
              isMatchSortOrder(value) ? t(MATCH_SORT_KEYS[value]) : ""
            }
            items={MATCH_SORT_ORDERS.map((order) => ({
              label: t(MATCH_SORT_KEYS[order]),
              value: order,
            }))}
            onValueChange={(value) => {
              if (isMatchSortOrder(value)) onSortChange(value);
            }}
            value={sortOrder}
          >
            <SelectTrigger
              aria-label={t("player.matches.sort.label")}
              className={sortTrigger.className}
              dense
              style={sortTrigger.style}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {MATCH_SORT_ORDERS.map((order) => (
                <SelectItem key={order} value={order}>
                  {t(MATCH_SORT_KEYS[order])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {resultCount === undefined ? null : (
            <p role="status" {...applyStyles(listTypography.caption, styles.count)}>
              {t("player.matches.results.count", { count: resultCount })}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function MatchesEmpty({
  actions,
  description,
  title,
}: {
  readonly actions?: ReactNode;
  readonly description: string;
  readonly title: string;
}) {
  return (
    <EmptyState {...applyStyles(styles.empty)}>
      <EmptyStateIcon>
        <SoccerBallIcon aria-hidden="true" />
      </EmptyStateIcon>
      <EmptyStateTitle>{title}</EmptyStateTitle>
      <EmptyStateDescription>{description}</EmptyStateDescription>
      {actions ? <EmptyStateActions>{actions}</EmptyStateActions> : null}
    </EmptyState>
  );
}

export function MatchesLoading({ label }: { readonly label: string }) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      aria-label={label}
      role="status"
      {...applyStyles(styles.loading)}
    >
      <p {...applyStyles(listTypography.caption, styles.muted)}>{label}</p>
      <div {...applyStyles(styles.skeletonStack)}>
        <Skeleton {...applyStyles(styles.skeleton)} />
        <Skeleton {...applyStyles(styles.skeleton)} />
      </div>
    </div>
  );
}

export function SectionError({
  message,
  onRetry,
  t,
}: {
  readonly message: string;
  readonly onRetry: () => void;
  readonly t: Translator;
}) {
  return (
    <Alert variant="destructive">
      <AlertDescription {...applyStyles(styles.error)}>
        <span>{message}</span>
        <Button onClick={onRetry} variant="secondary">
          {t("player.retry")}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export function sectionStatus(query: {
  readonly isPending: boolean;
  readonly isError: boolean;
}): SectionStatus {
  if (query.isPending) return "pending";
  if (query.isError) return "error";
  return "ready";
}
