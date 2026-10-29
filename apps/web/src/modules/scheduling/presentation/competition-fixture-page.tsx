"use client";

import { Link } from "@tanstack/react-router";
import {
  applyStyles,
  Caption,
  EmptyState,
  EmptyStateCopy,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  Heading,
  Skeleton,
  Text,
} from "@futrob/ui";
import emptyFixturesUrl from "@/assets/illustration-pending-fixtures.png";
import accessUrl from "@/assets/illustration-permissions.png";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { PageScaffold } from "@/shared/presentation/page-scaffold.tsx";
import { RetryAlert } from "@/shared/presentation/retry-alert.tsx";
import {
  fixtureRoundLabel,
  fixtureSideLabel,
  fixtureStageLabel,
} from "./competition-fixture-labels.ts";
import { isFixtureRefusal, useCurrentCompetitionFixture } from "./competition-fixture-queries.ts";
import {
  competitionFixturePageState,
  type CompetitionFixturePageState,
} from "./competition-fixture-state.ts";
import type { CompetitionFixtureView, FixtureEncounterView } from "./competition-fixture-view.ts";
import { styles } from "./competition-fixture-page.styles.ts";

type Scope = { readonly organizationId: string; readonly competitionId: string };

export function CompetitionFixtureRoute({ competitionId, organizationId }: Scope) {
  const query = useCurrentCompetitionFixture(organizationId, competitionId);
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
      organizationId={organizationId}
      state={state}
    />
  );
}

export function CompetitionFixturePageView({
  competitionId,
  organizationId,
  state,
}: Scope & { readonly state: CompetitionFixturePageState }) {
  const { locale, t } = useI18n();
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
            return (
              <div {...applyStyles(styles.stack)}>
                {state.refreshFailed ? (
                  <RetryAlert message={t("fixture.refreshError")} retry={state.retry} t={t} />
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
          case "ready":
            return (
              <FixtureList
                competitionId={competitionId}
                locale={locale}
                organizationId={organizationId}
                refreshFailed={state.refreshFailed}
                retry={state.retry}
                t={t}
                view={state.view}
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

function FixtureList({
  competitionId,
  locale,
  organizationId,
  refreshFailed,
  retry,
  t,
  view,
}: Scope & {
  readonly locale: string;
  readonly refreshFailed: boolean;
  readonly retry: () => void;
  readonly t: Translator;
  readonly view: CompetitionFixtureView;
}) {
  const kickoff = new Intl.DateTimeFormat(locale, {
    timeZone: view.timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div {...applyStyles(styles.stack)}>
      {refreshFailed ? (
        <RetryAlert message={t("fixture.refreshError")} retry={retry} t={t} />
      ) : null}
      <Caption as="p">{t("fixture.timeZone", { zone: view.timeZone })}</Caption>
      {view.stages.map((stage) => (
        <section key={stage.id} aria-labelledby={stage.id} {...applyStyles(styles.stage)}>
          <Heading as="h2" id={stage.id}>
            {fixtureStageLabel(stage.kind, t)}
          </Heading>
          {stage.rounds.map((round) => (
            <section key={round.id} aria-labelledby={round.id} {...applyStyles(styles.round)}>
              <Heading as="h3" id={round.id}>
                {fixtureRoundLabel(round.name, t)}
              </Heading>
              <ol {...applyStyles(styles.list)}>
                {round.encounters.map((encounter) => (
                  <li key={encounter.id}>
                    <EncounterRow
                      competitionId={competitionId}
                      encounter={encounter}
                      kickoff={kickoff}
                      organizationId={organizationId}
                      t={t}
                    />
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </section>
      ))}
    </div>
  );
}

function EncounterRow({
  competitionId,
  encounter,
  kickoff,
  organizationId,
  t,
}: Scope & {
  readonly encounter: FixtureEncounterView;
  readonly kickoff: Intl.DateTimeFormat;
  readonly t: Translator;
}) {
  const home = fixtureSideLabel(encounter.home, t);
  const away = fixtureSideLabel(encounter.away, t);
  return (
    <Link
      aria-label={t("fixture.open", { home, away })}
      params={{ orgId: organizationId, competitionId, encounterId: encounter.id }}
      to="/orgs/$orgId/competitions/$competitionId/encounters/$encounterId"
      {...applyStyles(styles.row)}
    >
      <div {...applyStyles(styles.rowMeta)}>
        {encounter.group ? (
          <Caption as="span">{t("fixture.group", { group: encounter.group })}</Caption>
        ) : null}
        <Caption as="span">{t("fixture.slots", { count: encounter.officialMatchCount })}</Caption>
      </div>
      <div {...applyStyles(styles.matchup)}>
        <Text align="end" className={styles.side} weight="semibold">
          {home}
        </Text>
        <Text tone="muted" weight="bold">
          {t("encounter.vs")}
        </Text>
        <Text align="start" className={styles.side} weight="semibold">
          {away}
        </Text>
      </div>
      <Text tone="default" weight="medium">
        <time dateTime={encounter.scheduledStartAt}>
          {kickoff.format(new Date(encounter.scheduledStartAt))}
        </time>
      </Text>
    </Link>
  );
}
