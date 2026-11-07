"use client";

import { useState } from "react";
import { ENCOUNTER_PERMISSION } from "@futrob/scheduling";
import {
  Alert,
  AlertDescription,
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
import {
  useCompetitionDraftQuery,
  useCompetitionParticipantsQuery,
} from "@/modules/competitions/presentation/competition-queries.ts";
import { useSwissStandingsFinal } from "@/modules/statistics/presentation/competition-standings/competition-standings-queries.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { PageScaffold } from "@/shared/presentation/page-scaffold.tsx";
import { useCapabilities } from "@/shared/presentation/permissions/index.ts";
import { RetryAlert } from "@/shared/presentation/retry-alert.tsx";
import { fixtureRoundLabel, fixtureStageLabel } from "./competition-fixture-labels.ts";
import { ByeRow, ClosedRow, EncounterRow, UnpairedRound } from "./competition-fixture-rows.tsx";
import {
  isFixtureRefusal,
  useCurrentCompetitionFixture,
  useSwissFixtureCommands,
} from "./competition-fixture-queries.ts";
import {
  competitionFixturePageState,
  type CompetitionFixturePageState,
} from "./competition-fixture-state.ts";
import type { CompetitionFixtureView } from "./competition-fixture-view.ts";
import { styles } from "./competition-fixture-page.styles.ts";
import { SwissRoundActions } from "./swiss-fixture-actions.tsx";
import type { SwissFixtureCommands } from "./swiss-fixture-commands.ts";
import { SwissFixtureGenerateForm, type FixtureNotice } from "./swiss-fixture-generate-form.tsx";

type Scope = { readonly organizationId: string; readonly competitionId: string };

const CAPABILITIES = { manageSchedule: ENCOUNTER_PERMISSION.scheduleManage } as const;

export function CompetitionFixtureRoute({ competitionId, organizationId }: Scope) {
  const query = useCurrentCompetitionFixture(organizationId, competitionId);
  const access = useCapabilities({ organizationId, competitionId }, CAPABILITIES);
  const commands = useSwissFixtureCommands(organizationId, competitionId);
  const retry = () => void query.refetch();
  const canGenerateCheck = access.manageSchedule && query.data?.fixture === null;
  const draft = useCompetitionDraftQuery(organizationId, competitionId, canGenerateCheck);
  const participants = useCompetitionParticipantsQuery(
    organizationId,
    competitionId,
    canGenerateCheck,
  );
  const swissFinal = useSwissStandingsFinal(
    organizationId,
    competitionId,
    access.manageSchedule && query.data?.fixture?.format === "swiss",
  );
  const competition = canGenerateCheck ? draft.data?.competition : undefined;
  const state = competitionFixturePageState({
    data: query.data,
    failed: query.isError,
    refused: isFixtureRefusal(query.error),
    retry,
    generate:
      competition?.format === "swiss" && competition.status === "published" && participants.data
        ? {
            timeZone: competition.timeZone,
            teamCount: participants.data.participants.filter((entry) => entry.status === "approved")
              .length,
          }
        : null,
    // Over means nothing is left to close or withdraw from; the plan alone cannot tell.
    canManageSwiss: access.manageSchedule && !swissFinal,
  });
  return (
    <CompetitionFixturePageView
      commands={commands}
      competitionId={competitionId}
      organizationId={organizationId}
      state={state}
    />
  );
}

export function CompetitionFixturePageView({
  commands,
  competitionId,
  organizationId,
  state,
}: Scope & {
  readonly commands?: SwissFixtureCommands;
  readonly state: CompetitionFixturePageState;
}) {
  const { locale, t } = useI18n();
  // Page-level: a generated fixture swaps the form for the list, and the outcome must survive it.
  const [notice, setNotice] = useState<FixtureNotice | null>(null);
  return (
    <PageScaffold page="competition.fixture">
      {notice ? (
        <div role="status" {...applyStyles(styles.notice)}>
          <Alert variant={notice.tone}>
            <AlertDescription>{notice.text}</AlertDescription>
          </Alert>
        </div>
      ) : null}
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
                {state.generate && commands && state.generate.teamCount >= 2 ? (
                  <SwissFixtureGenerateForm
                    commands={commands}
                    context={state.generate}
                    onNotice={setNotice}
                    organizationId={organizationId}
                  />
                ) : (
                  <EmptyState>
                    <EmptyStateIcon>
                      <img alt="" data-outline="none" src={emptyFixturesUrl} />
                    </EmptyStateIcon>
                    <EmptyStateCopy>
                      <EmptyStateTitle>{t("fixture.empty.title")}</EmptyStateTitle>
                      <EmptyStateDescription>
                        {state.generate
                          ? t("fixture.generate.needTeams")
                          : t("fixture.empty.description")}
                      </EmptyStateDescription>
                    </EmptyStateCopy>
                  </EmptyState>
                )}
              </div>
            );
          case "ready":
            return (
              <FixtureList
                commands={state.canManageSwiss ? commands : undefined}
                competitionId={competitionId}
                locale={locale}
                onNotice={setNotice}
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
  commands,
  competitionId,
  locale,
  onNotice,
  organizationId,
  refreshFailed,
  retry,
  t,
  view,
}: Scope & {
  readonly commands: SwissFixtureCommands | undefined;
  readonly locale: string;
  readonly onNotice: (notice: FixtureNotice) => void;
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
      {view.swiss ? (
        <div {...applyStyles(styles.swissSummary)}>
          <Text look="label">
            {t("fixture.swiss.progress", {
              paired: view.swiss.roundsPaired,
              total: view.swiss.roundsTotal,
            })}
          </Text>
          {view.swiss.withdrawn.length > 0 ? (
            <Caption as="p">
              {t("fixture.swiss.withdrawn", {
                teams: view.swiss.withdrawn
                  .map((team) => team.name ?? t("fixture.side.unknownTeam"))
                  .join(", "),
              })}
            </Caption>
          ) : null}
        </div>
      ) : null}
      {view.stages.map((stage) => (
        <section key={stage.id} aria-labelledby={stage.id} {...applyStyles(styles.stage)}>
          <Heading as="h2" id={stage.id}>
            {fixtureStageLabel(stage.kind, t)}
          </Heading>
          {stage.rounds.map((round) => (
            <section key={round.id} aria-labelledby={round.id} {...applyStyles(styles.round)}>
              <div {...applyStyles(styles.roundHeader)}>
                <Heading as="h3" id={round.id}>
                  {fixtureRoundLabel(round.name, t)}
                </Heading>
                {commands && view.swiss && round.number === view.swiss.currentRoundNumber ? (
                  <SwissRoundActions
                    canClose={round.encounters.some((encounter) => encounter.kind === "match")}
                    commands={commands}
                    onNotice={onNotice}
                    organizationId={organizationId}
                    roundNumber={round.number}
                    swiss={view.swiss}
                  />
                ) : null}
              </div>
              {view.swiss && round.encounters.length === 0 ? (
                <UnpairedRound kickoff={kickoff} round={round} t={t} />
              ) : (
                <ol {...applyStyles(styles.list)}>
                  {round.encounters.map((encounter) => (
                    <li key={encounter.id}>
                      {encounter.kind === "bye" ? (
                        <ByeRow encounter={encounter} t={t} />
                      ) : encounter.kind === "closed" ? (
                        <ClosedRow encounter={encounter} kickoff={kickoff} t={t} />
                      ) : (
                        <EncounterRow
                          competitionId={competitionId}
                          encounter={encounter}
                          kickoff={kickoff}
                          organizationId={organizationId}
                          t={t}
                        />
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          ))}
        </section>
      ))}
    </div>
  );
}
