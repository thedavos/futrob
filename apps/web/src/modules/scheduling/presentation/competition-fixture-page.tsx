"use client";

import { useState } from "react";
import {
  applyStyles,
  EmptyState,
  EmptyStateCopy,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  Skeleton,
} from "@futrob/ui";
import emptyFixturesUrl from "@/assets/illustration-pending-fixtures.png";
import accessUrl from "@/assets/illustration-permissions.png";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { PageScaffold } from "@/shared/presentation/page-scaffold.tsx";
import { RetryAlert } from "@/shared/presentation/retry-alert.tsx";
import { isFixtureRefusal, useCurrentCompetitionFixture } from "./competition-fixture-queries.ts";
import {
  competitionFixturePageState,
  type CompetitionFixturePageState,
} from "./competition-fixture-state.ts";
import type { CompetitionFixtureView } from "./competition-fixture-view.ts";
import { FixtureCalendar, type FixtureCalendarViewKind } from "./fixture-calendar.tsx";
import { styles } from "./competition-fixture-page.styles.ts";

type Scope = { readonly organizationId: string; readonly competitionId: string };

export function CompetitionFixtureRoute({ competitionId, organizationId }: Scope) {
  const query = useCurrentCompetitionFixture(organizationId, competitionId);
  // Read once per visit: "today" and the next date stay put while the page is open.
  const [now] = useState(() => new Date());
  const retry = () => void query.refetch();
  const state = competitionFixturePageState({
    data: query.data,
    failed: query.isError,
    refused: isFixtureRefusal(query.error),
    retry,
  });
  return (
    <CompetitionFixturePageView
      competitionId={competitionId}
      now={now}
      organizationId={organizationId}
      state={state}
    />
  );
}

export function CompetitionFixturePageView({
  competitionId,
  initialView,
  now,
  organizationId,
  state,
}: Scope & {
  readonly state: CompetitionFixturePageState;
  readonly now: Date;
  readonly initialView?: FixtureCalendarViewKind;
}) {
  const { t } = useI18n();
  return (
    <PageScaffold page="competition.fixture">
      {(() => {
        switch (state.kind) {
          case "loading":
            return (
              <div
                aria-busy="true"
                aria-label={t("fixture.loading")}
                role="status"
                {...applyStyles(styles.list)}
              >
                <Skeleton {...applyStyles(styles.skeleton)} />
                <Skeleton {...applyStyles(styles.skeleton)} />
              </div>
            );
          case "error":
            return <RetryAlert message={t("fixture.error")} retry={state.retry} t={t} />;
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
            return <FixtureEmpty refreshFailed={state.refreshFailed} retry={state.retry} />;
          case "ready":
            // A fixture whose rounds hold no Encounter reads as no schedule yet.
            return hasEncounters(state.view) ? (
              <FixtureCalendar
                competitionId={competitionId}
                initialView={initialView}
                now={now}
                organizationId={organizationId}
                refreshFailed={state.refreshFailed}
                retry={state.retry}
                view={state.view}
              />
            ) : (
              <FixtureEmpty refreshFailed={state.refreshFailed} retry={state.retry} />
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

function FixtureEmpty({
  refreshFailed,
  retry,
}: {
  readonly refreshFailed: boolean;
  readonly retry: () => void;
}) {
  const { t } = useI18n();
  return (
    <div {...applyStyles(styles.stack)}>
      {refreshFailed ? (
        <RetryAlert message={t("fixture.refreshError")} retry={retry} t={t} />
      ) : null}
      <EmptyState>
        <EmptyStateIcon>
          <img alt="" data-outline="none" src={emptyFixturesUrl} />
        </EmptyStateIcon>
        <EmptyStateCopy>
          <EmptyStateTitle>{t("fixture.empty.title")}</EmptyStateTitle>
          <EmptyStateDescription>{t("fixture.empty.description")}</EmptyStateDescription>
        </EmptyStateCopy>
      </EmptyState>
    </div>
  );
}

function hasEncounters(view: CompetitionFixtureView): boolean {
  return view.stages.some((stage) => stage.rounds.some((round) => round.encounters.length > 0));
}
