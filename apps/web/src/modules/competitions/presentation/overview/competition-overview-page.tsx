"use client";

import { useQueryClient } from "@tanstack/react-query";
import type {
  CompetitionDto,
  CompetitionEntryDto,
  CompetitionTeamManagementSummaryDto,
  ListCompetitionEncountersResponse,
} from "@futrob/api-contracts";
import { COMPETITION_PERMISSION } from "@futrob/competitions";
import { isPubliclyVisibleStatus } from "@futrob/public-portal";
import { RESULT_PERMISSION } from "@futrob/results";
import { applyStyles, PageHeader, PageHeaderDescription, PageHeaderTitle, vis } from "@futrob/ui";
import { usePendingActivitiesQuery } from "@/modules/notifications/presentation/activity-queries.ts";
import { useOrganizationProfileQuery } from "@/modules/organizations/presentation/organization-queries.ts";
import { portalPath } from "@/modules/public-portal/presentation/public-portal-model.ts";
import { useCompetitionEncountersQuery } from "@/modules/results/presentation/encounter-queries.ts";
import { useCompetitionTeamManagementQuery } from "@/modules/teams/presentation/competition-team-queries.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { useCapabilities } from "@/shared/presentation/permissions/index.ts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { RetryAlert } from "@/shared/presentation/retry-alert.tsx";
import {
  useCompetitionDraftQuery,
  useCompetitionParticipantsQuery,
  useUpdateCompetitionExploreListingMutation,
} from "../competition-queries.ts";
import {
  CompetitionExploreListingCard,
  type ExploreListingControl,
} from "./competition-explore-listing-card.tsx";
import {
  CompetitionOverviewHeader,
  CompetitionProgressBanner,
} from "./competition-overview-header.tsx";
import {
  CompetitionOverviewKpis,
  type OverviewMetric,
  type OverviewPendingMetric,
  type OverviewRatioMetric,
} from "./competition-overview-kpis.tsx";
import {
  awaitingResultEncounters,
  competitionProgress,
  type PendingActivityPage,
  pendingTotal,
  countEntries,
  officializedEncounters,
  upcomingEncounters,
  type OverviewSlice,
} from "./competition-overview-model.ts";
import { UpcomingSection } from "./competition-overview-encounters-section.tsx";
import { PendingSection } from "./competition-overview-sections.tsx";
import {
  CompetitionOverviewSkeleton,
  OverviewProgressSkeleton,
} from "./competition-overview-skeleton.tsx";
import { TeamsSection } from "./competition-overview-teams-section.tsx";
import { overviewLayout } from "./competition-overview.styles.ts";

export interface CompetitionOverviewViewProps {
  readonly organizationId: string;
  readonly competitionId: string;
  readonly competition: OverviewSlice<CompetitionDto>;
  readonly encounters: OverviewSlice<ListCompetitionEncountersResponse>;
  readonly entries: OverviewSlice<readonly CompetitionEntryDto[]>;
  readonly teams: OverviewSlice<readonly CompetitionTeamManagementSummaryDto[]>;
  readonly activities: OverviewSlice<PendingActivityPage>;
  /** Fixed «now» for deterministic relative times; defaults to the current time. */
  readonly now?: Date;
  /** The organization's public slug, once read; the portal link needs it. */
  readonly organizationSlug?: string | null;
  /** Explore listing switch; absent while the competition loads or once it is archived. */
  readonly exploreListing?: ExploreListingControl | null;
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

function ratioMetricOf<T>(
  slice: OverviewSlice<T>,
  pick: (data: T) => { readonly done: number; readonly total: number },
): OverviewRatioMetric {
  return slice.status === "ready"
    ? pick(slice.data)
    : slice.status === "error"
      ? "unavailable"
      : "loading";
}

function pendingTotalMetric(
  entries: OverviewSlice<readonly CompetitionEntryDto[]>,
  encounters: OverviewSlice<ListCompetitionEncountersResponse>,
  activities: OverviewSlice<PendingActivityPage>,
): OverviewPendingMetric {
  if (entries.status === "error" || encounters.status === "error" || activities.status === "error")
    return "unavailable";
  if (entries.status !== "ready" || encounters.status !== "ready" || activities.status !== "ready")
    return "loading";
  return pendingTotal(
    countEntries(entries.data).pending,
    awaitingResultEncounters(encounters.data.encounters).length,
    activities.data,
  );
}

export function CompetitionOverviewView({
  activities,
  competition,
  competitionId,
  encounters,
  entries,
  exploreListing = null,
  now = new Date(),
  organizationId,
  organizationSlug = null,
  teams,
}: CompetitionOverviewViewProps) {
  const { t } = useI18n();
  const entryCounts = entries.status === "ready" ? countEntries(entries.data) : null;
  // Only a publicly visible competition has a portal; a draft would answer 404 to a spectator.
  const portalHref =
    competition.status === "ready" &&
    organizationSlug !== null &&
    isPubliclyVisibleStatus(competition.data.status)
      ? portalPath({ organizationSlug, competitionKey: competitionId })
      : null;
  const pageLoading =
    competition.status === "loading" &&
    encounters.status === "loading" &&
    entries.status === "loading" &&
    teams.status === "loading" &&
    activities.status === "loading";
  const loadingLabel = t("competition.overview.loading");

  const progress = competitionProgress(
    competition,
    mapSlice(encounters, (data) => data.encounters),
    entries,
  );
  const progressPending =
    progress === null && (encounters.status === "loading" || entries.status === "loading");

  return (
    <main
      aria-busy={pageLoading || undefined}
      aria-label={pageLoading ? loadingLabel : undefined}
      {...applyStyles(overviewLayout.main)}
    >
      {pageLoading ? (
        <span aria-label={loadingLabel} role="status" {...applyStyles(vis.srOnly)}>
          {loadingLabel}
        </span>
      ) : null}
      <CompetitionOverviewHeader
        approvedTeams={entryCounts?.approved ?? null}
        competition={competition}
        competitionId={competitionId}
        organizationId={organizationId}
        portalHref={portalHref}
      />

      {competition.status === "error" ? (
        <RetryAlert message={t("competition.overview.error")} retry={competition.retry} t={t} />
      ) : null}

      {progress ? (
        <CompetitionProgressBanner progress={progress} />
      ) : progressPending ? (
        <OverviewProgressSkeleton />
      ) : null}

      <CompetitionOverviewKpis
        officialized={ratioMetricOf(encounters, (data) => {
          const { official, total } = officializedEncounters(data.encounters);
          return { done: official, total };
        })}
        pending={pendingTotalMetric(entries, encounters, activities)}
        teams={metricOf(entries, (data) => countEntries(data).approved)}
        upcoming={metricOf(
          encounters,
          (data) => upcomingEncounters(data.encounters, Infinity).length,
        )}
      />

      <div {...applyStyles(overviewLayout.layout)}>
        <div {...applyStyles(overviewLayout.column)}>
          <TeamsSection
            competitionId={competitionId}
            organizationId={organizationId}
            teams={teams}
          />
          <UpcomingSection
            competitionId={competitionId}
            encounters={encounters}
            organizationId={organizationId}
          />
        </div>
        <div {...applyStyles(overviewLayout.column)}>
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
          <CompetitionExploreListingCard
            competitionId={competitionId}
            control={exploreListing}
            organizationId={organizationId}
            pending={competition.status === "loading"}
            portalHref={portalHref}
            timeZone={competition.status === "ready" ? competition.data.timeZone : null}
          />
        </div>
      </div>
    </main>
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
  const profile = useOrganizationProfileQuery(organizationId);
  const listing = useUpdateCompetitionExploreListingMutation(organizationId, competitionId);
  const competition = draft.data?.competition;
  // The sidebar queue reads the same key, so the overview adds no request of its own.
  const activities = usePendingActivitiesQuery(
    canReviewResults
      ? { kind: "organization", organizationId, competitionId }
      : { kind: "mine", competitionId },
  );

  return (
    <CompetitionOverviewView
      activities={sliceOf(activities, (data) => data)}
      competition={sliceOf(draft, (data) => data.competition)}
      competitionId={competitionId}
      encounters={sliceOf(encounters, (data) => data)}
      entries={sliceOf(participants, (data) => data.participants)}
      exploreListing={
        competition && competition.status !== "archived"
          ? {
              value: listing.isPending ? listing.variables : competition.exploreListing,
              saving: listing.isPending,
              failed: listing.isError,
              onChange: (next) => listing.mutate(next),
            }
          : null
      }
      organizationId={organizationId}
      organizationSlug={profile.data?.slug ?? null}
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
    return <CompetitionOverviewSkeleton />;
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
    <main {...applyStyles(overviewLayout.main)}>
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
    <main {...applyStyles(overviewLayout.main)}>
      <PageHeader>
        <PageHeaderTitle>{t("shell.nav.competition.overview")}</PageHeaderTitle>
        <PageHeaderDescription>{t("competition.overview.description")}</PageHeaderDescription>
      </PageHeader>
      <RetryAlert message={t("competition.overview.accessError")} retry={onRetry} t={t} />
    </main>
  );
}
