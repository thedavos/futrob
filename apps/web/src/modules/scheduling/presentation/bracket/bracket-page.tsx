"use client";

import { Link } from "@tanstack/react-router";
import {
  applyStyles,
  EmptyState,
  EmptyStateActions,
  EmptyStateCopy,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  TextLink,
  vis,
} from "@futrob/ui";
import pendingBracketUrl from "@/assets/illustration-pending-bracket.png";
import accessUrl from "@/assets/illustration-permissions.png";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { PageScaffold } from "@/shared/presentation/page-scaffold.tsx";
import { RetryAlert } from "@/shared/presentation/retry-alert.tsx";
import {
  isRefusal,
  useCompetitionEncountersQuery,
} from "@/modules/results/presentation/encounter-queries.ts";
import { isFixtureRefusal, useCurrentCompetitionFixture } from "../competition-fixture-queries.ts";
import { competitionFixturePageState } from "../competition-fixture-state.ts";
import { BracketContent } from "./bracket-content.tsx";
import type { Scope, TeamFilter, ViewModeControl } from "./bracket-page-shared.ts";
import { styles } from "./bracket-page.styles.ts";
import { bracketResults, type BracketResults } from "./bracket-results.ts";
import { BracketPageSkeleton } from "./bracket-skeleton.tsx";
import { bracketPageState, type BracketPageState } from "./bracket-state.ts";

export function CompetitionBracketRoute({
  competitionId,
  organizationId,
  ...filter
}: Scope & TeamFilter & ViewModeControl) {
  const query = useCurrentCompetitionFixture(organizationId, competitionId);
  // Scores and official status come from the Encounter list; the draw never waits for them.
  const encounters = useCompetitionEncountersQuery(organizationId, competitionId);
  const retry = () => void query.refetch();
  const state = bracketPageState(
    competitionFixturePageState({
      data: query.data,
      failed: query.isError,
      refused: isFixtureRefusal(query.error),
      retry,
    }),
  );
  return (
    <CompetitionBracketPageView
      competitionId={competitionId}
      organizationId={organizationId}
      results={{
        results: bracketResults(encounters.data?.encounters),
        failed: encounters.isError && !isRefusal(encounters.error),
        retry: () => void encounters.refetch(),
      }}
      state={state}
      {...filter}
    />
  );
}

/** What the Encounter list adds to the draw; `failed` only when a retry may help. */
export type BracketResultsState = {
  readonly results: BracketResults;
  readonly failed: boolean;
  readonly retry: () => void;
};

const NO_RESULTS: BracketResultsState = { results: null, failed: false, retry: () => undefined };

export function CompetitionBracketPageView({
  competitionId,
  organizationId,
  results = NO_RESULTS,
  state,
  teamId,
  onTeamChange,
  view,
  onViewChange,
}: Scope &
  TeamFilter &
  ViewModeControl & {
    readonly state: BracketPageState;
    readonly results?: BracketResultsState;
  }) {
  const { locale, t } = useI18n();
  const scope = { competitionId, organizationId };
  const loadingLabel = state.kind === "loading" ? t("bracket.loading") : "";
  return (
    <PageScaffold page="competition.bracket">
      <span aria-atomic="true" role="status" {...applyStyles(vis.srOnly)}>
        {loadingLabel}
      </span>
      {(() => {
        switch (state.kind) {
          case "loading":
            return <BracketPageSkeleton />;
          case "error":
            return <RetryAlert message={t("bracket.error")} retry={state.retry} t={t} />;
          case "not_found":
            return (
              <EmptyState>
                <EmptyStateIcon>
                  <img alt="" data-outline="none" src={accessUrl} />
                </EmptyStateIcon>
                <EmptyStateCopy>
                  <EmptyStateTitle>{t("fixture.notFound.title")}</EmptyStateTitle>
                  <EmptyStateDescription>{t("fixture.notFound.description")}</EmptyStateDescription>
                </EmptyStateCopy>
              </EmptyState>
            );
          case "empty":
          case "no_bracket":
            return (
              <div {...applyStyles(styles.stack)}>
                {state.refreshFailed ? (
                  <RetryAlert message={t("bracket.refreshError")} retry={state.retry} t={t} />
                ) : null}
                <EmptyState>
                  <EmptyStateIcon>
                    <img alt="" data-outline="none" src={pendingBracketUrl} />
                  </EmptyStateIcon>
                  <EmptyStateCopy>
                    <EmptyStateTitle>
                      {state.kind === "empty"
                        ? t("bracket.empty.title")
                        : t("bracket.noBracket.title")}
                    </EmptyStateTitle>
                    <EmptyStateDescription>
                      {state.kind === "empty"
                        ? t("bracket.empty.description")
                        : t("bracket.noBracket.description")}
                    </EmptyStateDescription>
                  </EmptyStateCopy>
                  {state.kind === "no_bracket" ? (
                    <EmptyStateActions>
                      <TextLink
                        render={
                          <Link
                            params={{ orgId: organizationId, competitionId }}
                            to="/orgs/$orgId/competitions/$competitionId/fixture"
                          />
                        }
                      >
                        {t("bracket.calendarLink")}
                      </TextLink>
                    </EmptyStateActions>
                  ) : null}
                </EmptyState>
              </div>
            );
          case "ready":
            return (
              <BracketContent
                bracket={state.bracket}
                locale={locale}
                onTeamChange={onTeamChange}
                onViewChange={onViewChange}
                refreshFailed={state.refreshFailed}
                results={results.results}
                resultsFailed={results.failed}
                retry={state.retry}
                retryResults={results.retry}
                scope={scope}
                t={t}
                teamId={teamId}
                view={view}
              />
            );
          default: {
            const exhaustive: never = state;
            return exhaustive;
          }
        }
      })()}
    </PageScaffold>
  );
}
