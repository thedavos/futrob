"use client";

import { Link } from "@tanstack/react-router";
import type { CompetitionStandingSnapshotDto } from "@futrob/api-contracts";
import {
  Alert,
  AlertDescription,
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
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { PageScaffold } from "@/shared/presentation/page-scaffold.tsx";
import { teamNamesFrom, type TeamNames } from "./competition-standings-model.ts";
import {
  isStandingsRefusal,
  useCompetitionStandings,
  useStandingsTeamNames,
} from "./competition-standings-queries.ts";
import { CompetitionStandingsTable } from "./competition-standings-table.tsx";
import { styles } from "./competition-standings.styles.ts";

/** Each state is distinct: no approved results is not a failure, and a refusal is not empty. */
export type CompetitionStandingsState =
  | { readonly kind: "loading" }
  | { readonly kind: "access_error"; readonly retry: () => void }
  | { readonly kind: "forbidden" }
  | { readonly kind: "error"; readonly retry: () => void }
  | { readonly kind: "empty" }
  | {
      readonly kind: "ready";
      readonly snapshot: CompetitionStandingSnapshotDto;
      readonly names: TeamNames;
      readonly retryNames: () => void;
    };

export function CompetitionStandingsRoute({
  competitionId,
  organizationId,
}: {
  readonly competitionId: string;
  readonly organizationId: string;
}) {
  const { access, allowed, standings } = useCompetitionStandings(organizationId, competitionId);
  const snapshot = standings.data?.standings;
  const teams = useStandingsTeamNames(
    organizationId,
    Boolean(snapshot && snapshot.rows.length > 0),
  );

  const state: CompetitionStandingsState = (() => {
    if (access.capability.status === "unavailable") {
      return { kind: "access_error", retry: () => void access.query.refetch() };
    }
    if (access.capability.status === "loading") return { kind: "loading" };
    if (!allowed) return { kind: "forbidden" };
    if (standings.data) {
      if (!snapshot || snapshot.rows.length === 0) return { kind: "empty" };
      return {
        kind: "ready",
        snapshot,
        names: teams.data
          ? { kind: "ready", byId: teamNamesFrom(teams.data.teams) }
          : teams.isError
            ? { kind: "unavailable" }
            : { kind: "loading" },
        retryNames: () => void teams.refetch(),
      };
    }
    if (standings.isError) {
      return isStandingsRefusal(standings.error)
        ? { kind: "forbidden" }
        : { kind: "error", retry: () => void standings.refetch() };
    }
    return { kind: "loading" };
  })();

  return <CompetitionStandingsPageView organizationId={organizationId} state={state} />;
}

export function CompetitionStandingsPageView({
  organizationId,
  state,
}: {
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
                    variant="outline"
                  >
                    {t("standings.forbidden.back")}
                  </Button>
                </EmptyStateActions>
              </EmptyState>
            );
          case "empty":
            return (
              <EmptyState>
                <EmptyStateIcon>
                  <img alt="" data-outline="none" src={emptyStandingsUrl} />
                </EmptyStateIcon>
                <EmptyStateCopy>
                  <EmptyStateTitle>{t("standings.empty.title")}</EmptyStateTitle>
                  <EmptyStateDescription>{t("standings.empty.description")}</EmptyStateDescription>
                </EmptyStateCopy>
              </EmptyState>
            );
          case "ready":
            return (
              <div {...applyStyles(styles.stack)}>
                {state.names.kind === "unavailable" ? (
                  <RetryAlert
                    message={t("standings.teamNames.error")}
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

function RetryAlert({
  message,
  retry,
  t,
}: {
  readonly message: string;
  readonly retry: () => void;
  readonly t: Translator;
}) {
  return (
    <Alert variant="destructive">
      <AlertDescription {...applyStyles(styles.alertBody)}>
        <span>{message}</span>
        <Button onClick={retry} variant="secondary">
          {t("common.retry")}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
