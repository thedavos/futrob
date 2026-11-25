"use client";

import { useRef, useState } from "react";
import type { ListCompetitionEncountersResponse } from "@futrob/api-contracts";
import {
  applyStyles,
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateCopy,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  Skeleton,
  vis,
} from "@futrob/ui";
import emptyFixturesUrl from "@/assets/illustration-pending-fixtures.png";
import accessUrl from "@/assets/illustration-permissions.png";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { PageScaffold, type ScaffoldPageId } from "@/shared/presentation/page-scaffold.tsx";
import { RetryAlert } from "@/shared/presentation/retry-alert.tsx";

import { EncounterFiltersToolbar } from "./competition-encounters-filters.tsx";
import {
  encounterFilterRounds,
  encounterFilterTeams,
  encounterStatusCounts,
  filterEncounters,
  groupEncountersByRound,
  NO_ENCOUNTER_FILTERS,
  validEncounterFilters,
  type CompetitionEncountersFilters,
} from "./competition-encounters-model.ts";
import { styles } from "./competition-encounters-page.styles.ts";
import { RoundGroupSection } from "./competition-encounters-rows.tsx";
import { isRefusal, useCompetitionEncountersQuery } from "./encounter-queries.ts";

export type CompetitionEncountersState =
  | { readonly kind: "loading" }
  | { readonly kind: "not_found" }
  | { readonly kind: "error"; readonly retry: () => void }
  | { readonly kind: "ready"; readonly data: ListCompetitionEncountersResponse };

type Scope = { readonly organizationId: string; readonly competitionId: string };

/**
 * Staff read every Encounter under «Enfrentamientos»; a Team member reads the same list
 * under «Partidos», where the server keeps only the Encounters they may open.
 */
type ListPage = {
  readonly page?: Extract<ScaffoldPageId, "competition.encounters" | "competitionPlayer.matches">;
  readonly filters?: CompetitionEncountersFilters;
  readonly onFiltersChange?: (next: CompetitionEncountersFilters) => void;
};

export function CompetitionEncountersRoute({
  filters,
  onFiltersChange,
  page,
  ...scope
}: Scope & ListPage) {
  const query = useCompetitionEncountersQuery(scope.organizationId, scope.competitionId);
  const state: CompetitionEncountersState = (() => {
    if (query.data) return { kind: "ready", data: query.data };
    if (query.isError) {
      return isRefusal(query.error)
        ? { kind: "not_found" }
        : { kind: "error", retry: () => void query.refetch() };
    }
    return { kind: "loading" };
  })();
  return (
    <CompetitionEncountersPageView
      {...scope}
      filters={filters}
      onFiltersChange={onFiltersChange}
      page={page}
      state={state}
    />
  );
}

type UnresolvedEncountersState = Exclude<CompetitionEncountersState, { kind: "ready" }>;

export function CompetitionEncountersStatus({
  page = "competition.encounters",
  state,
}: Pick<ListPage, "page"> & { readonly state: UnresolvedEncountersState }) {
  const { t } = useI18n();
  return (
    <PageScaffold page={page}>
      <EncountersStatusBody state={state} t={t} />
    </PageScaffold>
  );
}

export function CompetitionEncountersPageView({
  competitionId,
  filters,
  onFiltersChange,
  organizationId,
  page = "competition.encounters",
  state,
}: Scope & ListPage & { readonly state: CompetitionEncountersState }) {
  const { locale, t } = useI18n();
  const [localFilters, setLocalFilters] = useState<CompetitionEncountersFilters>(
    filters ?? NO_ENCOUNTER_FILTERS,
  );
  const chosenFilters = filters ?? localFilters;
  const setFilters = onFiltersChange ?? setLocalFilters;

  if (state.kind !== "ready") {
    return <CompetitionEncountersStatus page={page} state={state} />;
  }
  return (
    <PageScaffold page={page}>
      {state.data.encounters.length === 0 ? (
        <EmptyState>
          <EmptyStateIcon>
            <img alt="" data-outline="none" src={emptyFixturesUrl} />
          </EmptyStateIcon>
          <EmptyStateCopy>
            <EmptyStateTitle>{t("encounters.list.empty.title")}</EmptyStateTitle>
            <EmptyStateDescription>{t("encounters.list.empty.description")}</EmptyStateDescription>
          </EmptyStateCopy>
        </EmptyState>
      ) : (
        <EncounterList
          competitionId={competitionId}
          data={state.data}
          filters={chosenFilters}
          locale={locale}
          onFiltersChange={setFilters}
          organizationId={organizationId}
          t={t}
        />
      )}
    </PageScaffold>
  );
}

function EncountersStatusBody({
  state,
  t,
}: {
  readonly state: UnresolvedEncountersState;
  readonly t: Translator;
}) {
  switch (state.kind) {
    case "loading":
      return (
        <div
          aria-busy="true"
          aria-label={t("encounters.list.loading")}
          role="status"
          {...applyStyles(styles.skeletonStack)}
        >
          <Skeleton {...applyStyles(styles.skeletonToolbar)} />
          <Skeleton {...applyStyles(styles.skeletonGroup)} />
          <Skeleton {...applyStyles(styles.skeletonGroup)} />
        </div>
      );
    case "error":
      return <RetryAlert message={t("encounters.list.error")} retry={state.retry} t={t} />;
    case "not_found":
      return (
        <EmptyState>
          <EmptyStateIcon>
            <img alt="" data-outline="none" src={accessUrl} />
          </EmptyStateIcon>
          <EmptyStateCopy>
            <EmptyStateTitle>{t("encounters.list.notFound.title")}</EmptyStateTitle>
            <EmptyStateDescription>
              {t("encounters.list.notFound.description")}
            </EmptyStateDescription>
          </EmptyStateCopy>
        </EmptyState>
      );
    default: {
      const exhaustive: never = state;
      return exhaustive;
    }
  }
}

function EncounterList({
  competitionId,
  data,
  filters: chosenFilters,
  locale,
  onFiltersChange,
  organizationId,
  t,
}: Scope & {
  readonly data: ListCompetitionEncountersResponse;
  readonly filters: CompetitionEncountersFilters;
  readonly locale: string;
  readonly onFiltersChange: (next: CompetitionEncountersFilters) => void;
  readonly t: Translator;
}) {
  const statusGroupRef = useRef<HTMLDivElement>(null);
  const timeZone = data.competition.timeZone;
  const teams = encounterFilterTeams(data.encounters, locale);
  const rounds = encounterFilterRounds(data.encounters);
  const filters = validEncounterFilters(chosenFilters, teams, rounds);
  const counts = encounterStatusCounts(data.encounters, filters);
  const filtered = filterEncounters(data.encounters, filters);
  const groups = groupEncountersByRound(filtered, timeZone);

  const timeFormat = new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  });
  const shortDateFormat = new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const shortDateTimeFormat = new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const rangeDateFormat = new Intl.DateTimeFormat(locale, {
    timeZone,
    day: "numeric",
    month: "short",
  });

  const resetFilters = () => {
    onFiltersChange(NO_ENCOUNTER_FILTERS);
    const firstRadio = statusGroupRef.current?.querySelector<HTMLElement>('[role="radio"]');
    firstRadio?.focus();
  };

  return (
    <section aria-labelledby="competition-encounters" {...applyStyles(styles.section)}>
      <h2 id="competition-encounters" {...applyStyles(vis.srOnly)}>
        {t("encounters.list.label")}
      </h2>

      <EncounterFiltersToolbar
        counts={counts}
        filteredCount={filtered.length}
        filters={filters}
        onFiltersChange={onFiltersChange}
        onReset={resetFilters}
        roundCount={groups.length}
        rounds={rounds}
        statusGroupRef={statusGroupRef}
        t={t}
        teams={teams}
        timeZone={timeZone}
      />

      {filtered.length === 0 ? (
        <EmptyState>
          <EmptyStateCopy>
            <EmptyStateTitle>{t("encounters.list.filtered.title")}</EmptyStateTitle>
            <EmptyStateDescription>
              {t("encounters.list.filtered.description")}
            </EmptyStateDescription>
          </EmptyStateCopy>
          <EmptyStateActions>
            <Button onClick={resetFilters} variant="outline">
              {t("encounters.list.filters.reset")}
            </Button>
          </EmptyStateActions>
        </EmptyState>
      ) : (
        <ol {...applyStyles(styles.rounds)}>
          {groups.map((group) => (
            <li key={group.round.number}>
              <RoundGroupSection
                competitionId={competitionId}
                group={group}
                organizationId={organizationId}
                rangeDateFormat={rangeDateFormat}
                shortDateFormat={shortDateFormat}
                shortDateTimeFormat={shortDateTimeFormat}
                t={t}
                timeFormat={timeFormat}
              />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
