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
  Skeleton,
  TextLink,
} from "@futrob/ui";
import pendingBracketUrl from "@/assets/illustration-pending-bracket.png";
import accessUrl from "@/assets/illustration-permissions.png";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { PageScaffold } from "@/shared/presentation/page-scaffold.tsx";
import { RetryAlert } from "@/shared/presentation/retry-alert.tsx";
import { isFixtureRefusal, useCurrentCompetitionFixture } from "../competition-fixture-queries.ts";
import { competitionFixturePageState } from "../competition-fixture-state.ts";
import { BracketContent } from "./bracket-content.tsx";
import type { Scope, TeamFilter } from "./bracket-page-shared.ts";
import { styles } from "./bracket-page.styles.ts";
import { bracketPageState, type BracketPageState } from "./bracket-state.ts";

export function CompetitionBracketRoute({
  competitionId,
  organizationId,
  ...filter
}: Scope & TeamFilter) {
  const query = useCurrentCompetitionFixture(organizationId, competitionId);
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
      state={state}
      {...filter}
    />
  );
}

export function CompetitionBracketPageView({
  competitionId,
  organizationId,
  state,
  teamId,
  onTeamChange,
}: Scope & TeamFilter & { readonly state: BracketPageState }) {
  const { locale, t } = useI18n();
  const scope = { competitionId, organizationId };
  return (
    <PageScaffold page="competition.bracket">
      {(() => {
        switch (state.kind) {
          case "loading":
            return (
              <div
                aria-busy="true"
                aria-label={t("bracket.loading")}
                role="status"
                {...applyStyles(styles.stack)}
              >
                <Skeleton {...applyStyles(styles.skeleton)} />
              </div>
            );
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
                refreshFailed={state.refreshFailed}
                retry={state.retry}
                scope={scope}
                t={t}
                teamId={teamId}
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
