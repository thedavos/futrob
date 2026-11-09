"use client";

import { Link } from "@tanstack/react-router";
import type { CompetitionStandingSnapshotDto } from "@futrob/api-contracts";
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
} from "@futrob/ui";
import emptyStandingsUrl from "@/assets/illustration-empty-standings.png";
import accessUrl from "@/assets/illustration-permissions.png";
import notFoundUrl from "@/assets/illustration-sports-venue.png";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { PageScaffold } from "@/shared/presentation/page-scaffold.tsx";
import { teamNamesFrom, type TeamNames } from "./competition-standings-model.ts";
import {
  isRefusal,
  useCompetitionStandings,
  useStandingsTeamNames,
} from "./competition-standings-queries.ts";
import { CompetitionStandingsTable } from "./competition-standings-table.tsx";
import { styles } from "./competition-standings.styles.ts";
import { RetryAlert } from "@/shared/presentation/retry-alert.tsx";

/** Each state is distinct: no approved results is not a failure, and a refusal is not empty. */
export type CompetitionStandingsState =
  | { readonly kind: "loading" }
  | { readonly kind: "access_error"; readonly retry: () => void }
  | { readonly kind: "forbidden" }
  | { readonly kind: "not_found" }
  | { readonly kind: "error"; readonly retry: () => void }
  | {
      readonly kind: "empty";
      /** The last refresh failed; the empty result is the last known one, not a confirmed current one. */
      readonly refreshFailed: boolean;
      /** Results are approved from Encounters; only actors who can read them get the way there. */
      readonly canViewEncounters: boolean;
      readonly retry: () => void;
    }
  | {
      readonly kind: "ready";
      readonly snapshot: CompetitionStandingSnapshotDto;
      readonly names: TeamNames;
      /** The last refresh failed; the table is the last good read, not a confirmed current one. */
      readonly refreshFailed: boolean;
      readonly namesRefreshFailed: boolean;
      readonly retry: () => void;
      readonly retryNames: () => void;
    };

export function CompetitionStandingsRoute({
  competitionId,
  organizationId,
}: {
  readonly competitionId: string;
  readonly organizationId: string;
}) {
  const { access, allowed, canViewEncounters, standings } = useCompetitionStandings(
    organizationId,
    competitionId,
  );
  // A refusal is the query's stored value, so no later error can bring older data back.
  const standingsValue = standings.data;
  const refusal = isRefusal(standingsValue) ? standingsValue : undefined;
  const snapshot =
    standingsValue && !isRefusal(standingsValue) ? standingsValue.standings : undefined;
  const teams = useStandingsTeamNames(
    organizationId,
    competitionId,
    Boolean(snapshot && snapshot.rows.length > 0),
  );
  const teamsValue = teams.data && !isRefusal(teams.data) ? teams.data : undefined;

  const state: CompetitionStandingsState = (() => {
    if (access.capability.status === "unavailable") {
      return { kind: "access_error", retry: () => void access.query.refetch() };
    }
    if (access.capability.status === "loading") return { kind: "loading" };
    if (!allowed) return { kind: "forbidden" };
    if (refusal?.refused === "permission") return { kind: "forbidden" };
    if (refusal?.refused === "not_found") return { kind: "not_found" };
    if (refusal) return { kind: "access_error", retry: () => void standings.refetch() };
    if (standingsValue) {
      if (!snapshot || snapshot.rows.length === 0) {
        return {
          kind: "empty",
          refreshFailed: standings.isError,
          canViewEncounters,
          retry: () => void standings.refetch(),
        };
      }
      return {
        kind: "ready",
        snapshot,
        names: teamsValue
          ? { kind: "ready", byId: teamNamesFrom(teamsValue.teams) }
          : teams.isError || teams.data
            ? { kind: "unavailable" }
            : { kind: "loading" },
        refreshFailed: standings.isError,
        namesRefreshFailed: Boolean(teamsValue) && teams.isError,
        retry: () => void standings.refetch(),
        retryNames: () => void teams.refetch(),
      };
    }
    if (standings.isError) return { kind: "error", retry: () => void standings.refetch() };
    return { kind: "loading" };
  })();

  return (
    <CompetitionStandingsPageView
      competitionId={competitionId}
      organizationId={organizationId}
      state={state}
    />
  );
}

export function CompetitionStandingsPageView({
  competitionId,
  organizationId,
  state,
}: {
  readonly competitionId: string;
  readonly organizationId: string;
  readonly state: CompetitionStandingsState;
}) {
  const { t } = useI18n();
  return (
    <PageScaffold page="competition.standings">
      {(() => {
        switch (state.kind) {
          case "loading":
            return (
              <div
                aria-busy="true"
                aria-label={t("standings.loading")}
                role="status"
                {...applyStyles(styles.stack)}
              >
                <Skeleton {...applyStyles(styles.skeleton)} />
                <Skeleton {...applyStyles(styles.skeleton)} />
                <Skeleton {...applyStyles(styles.skeleton)} />
              </div>
            );
          case "access_error":
            return <RetryAlert message={t("standings.accessError")} retry={state.retry} t={t} />;
          case "error":
            return <RetryAlert message={t("standings.error")} retry={state.retry} t={t} />;
          case "forbidden":
            return (
              <EmptyState>
                <EmptyStateIcon>
                  <img alt="" data-outline="none" src={accessUrl} />
                </EmptyStateIcon>
                <EmptyStateCopy>
                  <EmptyStateTitle>{t("standings.forbidden.title")}</EmptyStateTitle>
                  <EmptyStateDescription>
                    {t("standings.forbidden.description")}
                  </EmptyStateDescription>
                </EmptyStateCopy>
                <EmptyStateActions>
                  <Button
                    render={<Link params={{ orgId: organizationId }} to="/orgs/$orgId" />}
                    role="link"
                    variant="outline"
                  >
                    {t("standings.forbidden.back")}
                  </Button>
                </EmptyStateActions>
              </EmptyState>
            );
          case "not_found":
            return (
              <EmptyState>
                <EmptyStateIcon>
                  <img alt="" data-outline="none" src={notFoundUrl} />
                </EmptyStateIcon>
                <EmptyStateCopy>
                  <EmptyStateTitle>{t("standings.notFound.title")}</EmptyStateTitle>
                  <EmptyStateDescription>
                    {t("standings.notFound.description")}
                  </EmptyStateDescription>
                </EmptyStateCopy>
                <EmptyStateActions>
                  <Button
                    render={
                      <Link params={{ orgId: organizationId }} to="/orgs/$orgId/competitions" />
                    }
                    role="link"
                    variant="outline"
                  >
                    {t("standings.notFound.action")}
                  </Button>
                </EmptyStateActions>
              </EmptyState>
            );
          case "empty":
            return (
              <div {...applyStyles(styles.stack)}>
                {state.refreshFailed ? (
                  <RetryAlert message={t("standings.refreshError")} retry={state.retry} t={t} />
                ) : null}
                <EmptyState>
                  <EmptyStateIcon>
                    <img alt="" data-outline="none" src={emptyStandingsUrl} />
                  </EmptyStateIcon>
                  <EmptyStateCopy>
                    <EmptyStateTitle>{t("standings.empty.title")}</EmptyStateTitle>
                    <EmptyStateDescription>
                      {t("standings.empty.description")}
                    </EmptyStateDescription>
                  </EmptyStateCopy>
                  {state.canViewEncounters ? (
                    <EmptyStateActions>
                      <Button
                        render={
                          <Link
                            params={{ orgId: organizationId, competitionId }}
                            to="/orgs/$orgId/competitions/$competitionId/encounters"
                          />
                        }
                        role="link"
                      >
                        {t("standings.empty.action")}
                      </Button>
                    </EmptyStateActions>
                  ) : null}
                </EmptyState>
              </div>
            );
          case "ready":
            return (
              <div {...applyStyles(styles.stack)}>
                {state.refreshFailed ? (
                  <RetryAlert message={t("standings.refreshError")} retry={state.retry} t={t} />
                ) : null}
                {state.names.kind === "unavailable" || state.namesRefreshFailed ? (
                  <RetryAlert
                    message={
                      state.names.kind === "unavailable"
                        ? t("standings.teamNames.error")
                        : t("standings.teamNames.refreshError")
                    }
                    retry={state.retryNames}
                    t={t}
                  />
                ) : null}
                <CompetitionStandingsTable names={state.names} snapshot={state.snapshot} t={t} />
              </div>
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
