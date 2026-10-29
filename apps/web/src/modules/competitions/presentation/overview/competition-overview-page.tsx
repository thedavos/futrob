"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type {
  ActivityEntryDto,
  CompetitionDto,
  CompetitionEntryDto,
  CompetitionTeamManagementSummaryDto,
  ListCompetitionEncountersResponse,
} from "@futrob/api-contracts";
import { COMPETITION_PERMISSION } from "@futrob/competitions";
import { RESULT_PERMISSION } from "@futrob/results";
import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  Badge,
  Button,
  Caption,
  PageHeader,
  PageHeaderActions,
  PageHeaderDescription,
  PageHeaderTitle,
  Skeleton,
} from "@futrob/ui";
import { media } from "@futrob/ui/styles/media.stylex";
import { usePendingActivitiesQuery } from "@/modules/notifications/presentation/activity-queries.ts";
import { organizationCompetitionStatusLabel } from "@/modules/organizations/presentation/organization-home-copy.ts";
import { useCompetitionEncountersQuery } from "@/modules/results/presentation/encounter-queries.ts";
import { useCompetitionTeamManagementQuery } from "@/modules/teams/presentation/competition-team-queries.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { useCapabilities } from "@/shared/presentation/permissions/index.ts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { RetryAlert } from "@/shared/presentation/retry-alert.tsx";
import {
  competitionFormatLabel,
  competitionListBadgeVariant,
  competitionPlatformLabel,
  competitionScheduleLabel,
  competitionTeamsLabel,
} from "../competition-labels.ts";
import {
  useCompetitionDraftQuery,
  useCompetitionParticipantsQuery,
} from "../competition-queries.ts";
import { CompetitionOverviewKpis, type OverviewMetric } from "./competition-overview-kpis.tsx";
import {
  awaitingResultEncounters,
  countEntries,
  upcomingEncounters,
  type OverviewSlice,
} from "./competition-overview-model.ts";
import { PendingSection, TeamsSection, UpcomingSection } from "./competition-overview-sections.tsx";

const styles = stylex.create({
  main: {
    display: "flex",
    width: "100%",
    minWidth: 0,
    flexDirection: "column",
    gap: "1rem",
  },
  header: {
    marginBottom: 0,
  },
  titleSkeleton: {
    width: "16rem",
    maxWidth: "100%",
    height: "2.25rem",
  },
  summary: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.5rem 0.75rem",
  },
  columns: {
    display: "grid",
    minWidth: 0,
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.lg]: "repeat(2, minmax(0, 1fr))",
    },
    gap: "1rem",
    alignItems: "start",
  },
});

export interface CompetitionOverviewViewProps {
  readonly organizationId: string;
  readonly competitionId: string;
  readonly competition: OverviewSlice<CompetitionDto>;
  readonly encounters: OverviewSlice<ListCompetitionEncountersResponse>;
  readonly entries: OverviewSlice<readonly CompetitionEntryDto[]>;
  readonly teams: OverviewSlice<readonly CompetitionTeamManagementSummaryDto[]>;
  readonly activities: OverviewSlice<readonly ActivityEntryDto[]>;
  /** Fixed «now» for deterministic relative times; defaults to the current time. */
  readonly now?: Date;
}

function mapSlice<Data, Shown>(
  slice: OverviewSlice<Data>,
  pick: (data: Data) => Shown,
): OverviewSlice<Shown> {
  return slice.status === "ready" ? { status: "ready", data: pick(slice.data) } : slice;
}

function metricOf<T>(slice: OverviewSlice<T>, count: (data: T) => number): OverviewMetric {
  return slice.status === "ready"
    ? count(slice.data)
    : slice.status === "error"
      ? "unavailable"
      : "loading";
}

export function CompetitionOverviewView({
  activities,
  competition,
  competitionId,
  encounters,
  entries,
  now = new Date(),
  organizationId,
  teams,
}: CompetitionOverviewViewProps) {
  const { t } = useI18n();
  const entryCounts = entries.status === "ready" ? countEntries(entries.data) : null;

  return (
    <main {...applyStyles(styles.main)}>
      <PageHeader className={styles.header}>
        {competition.status === "ready" ? (
          <PageHeaderTitle truncate>{competition.data.name}</PageHeaderTitle>
        ) : competition.status === "loading" ? (
          <Skeleton {...applyStyles(styles.titleSkeleton)} />
        ) : (
          <PageHeaderTitle>{t("shell.nav.competition.overview")}</PageHeaderTitle>
        )}
        <PageHeaderDescription>{t("competition.overview.description")}</PageHeaderDescription>
        {competition.status === "ready" && competition.data.status === "draft" ? (
          <PageHeaderActions>
            <Button
              render={
                <Link
                  params={{ orgId: organizationId, competitionId }}
                  to="/orgs/$orgId/competitions/$competitionId/setup"
                />
              }
            >
              {t("competition.overview.continueSetup")}
            </Button>
          </PageHeaderActions>
        ) : null}
      </PageHeader>

      {competition.status === "error" ? (
        <RetryAlert message={t("competition.overview.error")} retry={competition.retry} t={t} />
      ) : null}
      {competition.status === "ready" ? (
        <CompetitionSummary
          approved={entryCounts?.approved ?? null}
          competition={competition.data}
        />
      ) : null}

      <CompetitionOverviewKpis
        applications={metricOf(entries, (data) => countEntries(data).pending)}
        awaiting={metricOf(encounters, (data) => awaitingResultEncounters(data.encounters).length)}
        teams={metricOf(entries, (data) => countEntries(data).approved)}
        upcoming={metricOf(
          encounters,
          (data) => upcomingEncounters(data.encounters, Infinity).length,
        )}
      />

      <div {...applyStyles(styles.columns)}>
        <PendingSection
          activities={activities}
          awaitingCount={mapSlice(
            encounters,
            (data) => awaitingResultEncounters(data.encounters).length,
          )}
          competitionId={competitionId}
          entriesPending={mapSlice(entries, (data) => countEntries(data).pending)}
          now={now}
          organizationId={organizationId}
        />
        <UpcomingSection
          competitionId={competitionId}
          encounters={encounters}
          organizationId={organizationId}
        />
      </div>
      <TeamsSection competitionId={competitionId} organizationId={organizationId} teams={teams} />
    </main>
  );
}

function CompetitionSummary({
  approved,
  competition,
}: {
  readonly approved: number | null;
  readonly competition: CompetitionDto;
}) {
  const { locale, t } = useI18n();
  const schedule = competitionScheduleLabel(competition.schedule, locale, t);
  const details = [
    competitionFormatLabel(competition.format, t),
    `${competition.gameEdition} · ${competitionPlatformLabel(competition.platform)}`,
    approved === null ? null : competitionTeamsLabel(approved, competition.teams.max, t),
    schedule,
  ].filter((part): part is string => part !== null);
  return (
    <section aria-label={t("competition.overview.status")} {...applyStyles(styles.summary)}>
      <Badge variant={competitionListBadgeVariant(competition.status)}>
        {organizationCompetitionStatusLabel(competition.status, t)}
      </Badge>
      <Caption as="p">{details.join(" · ")}</Caption>
    </section>
  );
}

/** Reads that failed with nothing cached are an error; cached data stays visible on a refresh. */
function sliceOf<Data, Shown>(
  query: {
    readonly data: Data | undefined;
    readonly isError: boolean;
    readonly refetch: () => void;
  },
  pick: (data: Data) => Shown,
): OverviewSlice<Shown> {
  if (query.data !== undefined) return { status: "ready", data: pick(query.data) };
  if (query.isError) return { status: "error", retry: () => query.refetch() };
  return { status: "loading" };
}

function OperatorOverview({
  canReviewResults,
  competitionId,
  organizationId,
}: {
  readonly canReviewResults: boolean;
  readonly competitionId: string;
  readonly organizationId: string;
}) {
  const draft = useCompetitionDraftQuery(organizationId, competitionId);
  const encounters = useCompetitionEncountersQuery(organizationId, competitionId);
  const participants = useCompetitionParticipantsQuery(organizationId, competitionId);
  const teams = useCompetitionTeamManagementQuery(organizationId, competitionId);
  // The sidebar queue reads the same key, so the overview adds no request of its own.
  const activities = usePendingActivitiesQuery(
    canReviewResults
      ? { kind: "organization", organizationId, competitionId }
      : { kind: "mine", competitionId },
  );

  return (
    <CompetitionOverviewView
      activities={sliceOf(activities, (data) => data.activities)}
      competition={sliceOf(draft, (data) => data.competition)}
      competitionId={competitionId}
      encounters={sliceOf(encounters, (data) => data)}
      entries={sliceOf(participants, (data) => data.participants)}
      organizationId={organizationId}
      teams={sliceOf(teams, (data) => data.pages[0]?.items ?? [])}
    />
  );
}

const CAPABILITIES = {
  operate: COMPETITION_PERMISSION.update,
  reviewResults: RESULT_PERMISSION.resultApprove,
} as const;

/**
 * Operators of the competition get the overview. A failed permission read stays retryable.
 * Everyone else who reaches the route keeps the short welcome.
 */
export function CompetitionOverviewRoute({
  competitionId,
  organizationId,
}: {
  readonly competitionId: string;
  readonly organizationId: string;
}) {
  const queryClient = useQueryClient();
  const access = useCapabilities({ organizationId, competitionId }, CAPABILITIES);

  if (access.loading) {
    return (
      <main aria-busy="true" {...applyStyles(styles.main)}>
        <Skeleton {...applyStyles(styles.titleSkeleton)} />
      </main>
    );
  }
  if (access.unavailable) {
    return (
      <CompetitionOverviewAccessError
        onRetry={() => {
          void queryClient.invalidateQueries({ queryKey: queryKeys.authorization.all });
        }}
      />
    );
  }
  if (access.operate) {
    return (
      <OperatorOverview
        canReviewResults={access.reviewResults}
        competitionId={competitionId}
        organizationId={organizationId}
      />
    );
  }
  return <CompetitionOverviewMember />;
}

/** Someone in the competition without operator access. Their pages stay in the context menu. */
export function CompetitionOverviewMember() {
  const { t } = useI18n();
  return (
    <main {...applyStyles(styles.main)}>
      <PageHeader>
        <PageHeaderTitle>{t("competition.overview.memberTitle")}</PageHeaderTitle>
        <PageHeaderDescription>{t("competition.overview.memberDescription")}</PageHeaderDescription>
      </PageHeader>
    </main>
  );
}

/** A failed permission read is not the same as lacking the operator role. */
export function CompetitionOverviewAccessError({ onRetry }: { readonly onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <main {...applyStyles(styles.main)}>
      <PageHeader>
        <PageHeaderTitle>{t("shell.nav.competition.overview")}</PageHeaderTitle>
        <PageHeaderDescription>{t("competition.overview.description")}</PageHeaderDescription>
      </PageHeader>
      <RetryAlert message={t("competition.overview.accessError")} retry={onRetry} t={t} />
    </main>
  );
}
