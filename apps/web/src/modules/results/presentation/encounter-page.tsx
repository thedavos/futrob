"use client";

import { useReducer, useState } from "react";
import type { EncounterViewDto, ListEncounterCandidatesResponse } from "@futrob/api-contracts";
import {
  Alert,
  AlertDescription,
  applyStyles,
  Button,
  Card,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
  vis,
} from "@futrob/ui";
import { ArrowsClockwiseIcon, CalendarBlankIcon } from "@phosphor-icons/react";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { LoadingStatus } from "@/shared/presentation/loading-status.tsx";
import {
  ScheduleChangesSection,
  type ScheduleChangesState,
} from "@/modules/scheduling/presentation/schedule-changes-section.tsx";
import { DISPUTE_REVIEW_ANCHOR } from "./dispute-review-anchor.ts";
import { EMPTY_OPERATOR_DRAFT, operatorDraftReducer } from "./dispute-review-draft.ts";
import { DisputeReviewSection, type DisputeReviewState } from "./dispute-review-section.tsx";
import { encounterStatusOf, loadedSelectionOf } from "./encounter-approval.ts";
import { EncounterHero, EncounterUnavailable, listLink } from "./encounter-hero.tsx";
import type { EncounterListReturn } from "./encounter-list-return.ts";
import { EncounterOverviewTab } from "./encounter-overview.tsx";
import {
  EncounterBreadcrumb,
  EncounterPageSkeleton,
  type ListLink,
} from "./encounter-page-skeleton.tsx";
import { EncounterSelectionWorkspace } from "./encounter-selection-workspace.tsx";
import { assignmentsOf, previewApprovedEncounter, previewEncounter } from "./encounter-preview.ts";
import { styles } from "./encounter-page.styles.ts";
import { type Formats } from "./encounter-parts.tsx";
import { currentProposalOf } from "./selection-draft.ts";
import { EMPTY_TEAM_DRAFT, teamDraftReducer } from "./team-selection-draft.ts";
import type { TeamSelectionState } from "./team-selection-section.tsx";

export type EncounterState =
  | { readonly kind: "loading" }
  | { readonly kind: "not_found" }
  | { readonly kind: "forbidden" }
  | { readonly kind: "error"; readonly retry: () => void }
  | { readonly kind: "ready"; readonly view: EncounterViewDto; readonly refresh?: ViewRefresh };

type Refreshable = { readonly refreshing: boolean; readonly refresh: () => void };
type ViewRefresh = Refreshable & { readonly refreshFailed: boolean };

export type CandidatesState =
  | { readonly kind: "loading" }
  | { readonly kind: "forbidden" }
  | { readonly kind: "error"; readonly retry: () => void }
  | (Refreshable & {
      readonly kind: "ready";
      readonly data: ListEncounterCandidatesResponse;
      readonly updatedAt: number;
      readonly refreshFailed: boolean;
    });

type EncounterTab = "overview" | "selection" | "schedule" | "review";

export function EncounterPageView({
  candidates,
  competitionId,
  disputeReview,
  encounter,
  listReturn = null,
  organizationId,
  scheduleChanges,
  teamSelection,
}: {
  /** Organization review panel; only an actor who approves results gets one. */
  readonly disputeReview?: DisputeReviewState;
  readonly scheduleChanges?: ScheduleChangesState;
  readonly teamSelection?: TeamSelectionState;
  readonly candidates: CandidatesState;
  readonly competitionId: string;
  readonly encounter: EncounterState;
  /** The list the Match Center was opened from; null for a direct visit. */
  readonly listReturn?: EncounterListReturn | null;
  readonly organizationId: string;
}) {
  const { t } = useI18n();
  const encountersLink = listLink({ competitionId, listReturn, organizationId, t });

  return (
    <>
      <LoadingStatus message={encounter.kind === "loading" ? t("encounter.loading") : ""} />
      <EncounterContent
        candidates={candidates}
        disputeReview={disputeReview}
        encounter={encounter}
        encountersLink={encountersLink}
        scheduleChanges={scheduleChanges}
        t={t}
        teamSelection={teamSelection}
      />
    </>
  );
}

function EncounterContent({
  candidates,
  disputeReview,
  encounter,
  encountersLink,
  scheduleChanges,
  t,
  teamSelection,
}: {
  readonly candidates: CandidatesState;
  readonly disputeReview?: DisputeReviewState;
  readonly encounter: EncounterState;
  readonly encountersLink: ListLink;
  readonly scheduleChanges?: ScheduleChangesState;
  readonly t: Translator;
  readonly teamSelection?: TeamSelectionState;
}) {
  switch (encounter.kind) {
    case "not_found":
    case "forbidden":
      return <EncounterUnavailable kind={encounter.kind} link={encountersLink} t={t} />;
    case "loading":
      return <EncounterPageSkeleton link={encountersLink} t={t} />;
    case "error":
      return (
        <EncounterUnavailable kind="error" link={encountersLink} retry={encounter.retry} t={t} />
      );
    case "ready":
      return (
        <EncounterReady
          candidates={candidates}
          disputeReview={disputeReview}
          scheduleChanges={scheduleChanges}
          encountersLink={encountersLink}
          teamSelection={teamSelection}
          view={encounter.view}
          viewRefresh={encounter.refresh}
        />
      );
    default: {
      const exhaustive: never = encounter;
      return exhaustive;
    }
  }
}

function EncounterReady({
  candidates,
  disputeReview,
  encountersLink,
  scheduleChanges,
  teamSelection,
  view,
  viewRefresh,
}: {
  readonly candidates: CandidatesState;
  readonly disputeReview?: DisputeReviewState;
  readonly encountersLink: ListLink;
  readonly scheduleChanges?: ScheduleChangesState;
  readonly teamSelection?: TeamSelectionState;
  readonly view: EncounterViewDto;
  readonly viewRefresh?: ViewRefresh;
}) {
  const { locale, t } = useI18n();
  const [draft, dispatch] = useReducer(teamDraftReducer, EMPTY_TEAM_DRAFT);
  const [operatorDraft, operatorDispatch] = useReducer(operatorDraftReducer, EMPTY_OPERATOR_DRAFT);
  const [selectedTab, setSelectedTab] = useState<EncounterTab | null>(null);
  const { assignments } = draft.input;
  const formats: Formats = {
    kickoff: new Intl.DateTimeFormat(locale, {
      timeZone: view.competition.timeZone,
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }),
    clock: new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }),
  };

  const candidateList =
    candidates.kind === "ready" && candidates.data.status === "ready"
      ? candidates.data.candidates
      : [];

  const hasReviewTab = disputeReview?.kind === "visible";

  // Role hygiene: an organizer who passes org-wide capability checks but does not represent
  // a Team should not see a broken "Actúas por / No puedes ver" block alongside their dossier.
  const effectiveTeamSelection: TeamSelectionState | undefined =
    hasReviewTab &&
    disputeReview.read.kind !== "forbidden" &&
    teamSelection?.kind === "visible" &&
    teamSelection.read.kind === "forbidden"
      ? { kind: "hidden" }
      : teamSelection;

  const hasTeamPanel = effectiveTeamSelection?.kind === "visible";

  const loadedSelection = loadedSelectionOf(disputeReview, effectiveTeamSelection);
  const selectionView = loadedSelection?.view ?? null;

  const selectionStatus = encounterStatusOf(view, viewRefresh?.refreshFailed, loadedSelection);
  const isApproved = selectionStatus === "approved";
  const approvedProposal = isApproved && selectionView ? currentProposalOf(selectionView) : null;
  const approvedAssignments = approvedProposal ? assignmentsOf(approvedProposal.slots) : null;
  const approvedPreview = isApproved
    ? previewApprovedEncounter(view, candidateList, approvedAssignments)
    : null;

  const preview = previewEncounter(view, candidateList, assignments);
  const displayedPreview = isApproved && approvedPreview ? approvedPreview : preview;
  const title = t("encounter.title", { home: view.home.name, away: view.away.name });

  const openScheduleRequests =
    scheduleChanges?.kind === "ready"
      ? scheduleChanges.requests.filter(
          (request) => request.status === "open" || request.status === "escalated",
        ).length
      : 0;
  const totalScheduleRequests =
    scheduleChanges?.kind === "ready" ? scheduleChanges.requests.length : 0;

  const prefersReviewHash = globalThis.location?.hash === `#${DISPUTE_REVIEW_ANCHOR}`;
  const defaultTab: EncounterTab = (() => {
    if (prefersReviewHash && hasReviewTab) return "review";
    if (isApproved) return "overview";
    if (
      hasReviewTab &&
      (selectionStatus === "disputed" ||
        selectionStatus === "organizer_review" ||
        disputeReview.read.kind === "forbidden" ||
        disputeReview.read.kind === "error" ||
        !hasTeamPanel)
    ) {
      return "review";
    }
    return "selection";
  })();

  const activeTab: EncounterTab =
    selectedTab && (selectedTab !== "review" || hasReviewTab) ? selectedTab : defaultTab;

  const pinTab = (tab: EncounterTab) => {
    if (selectedTab === null) setSelectedTab(tab);
  };

  const refreshable = [
    viewRefresh ?? null,
    candidates.kind === "ready" ? candidates : null,
    scheduleChanges?.kind === "ready" ? scheduleChanges : null,
    effectiveTeamSelection?.kind === "visible" && effectiveTeamSelection.read.kind === "ready"
      ? effectiveTeamSelection.read
      : null,
    disputeReview?.kind === "visible" && disputeReview.read.kind === "ready"
      ? disputeReview.read
      : null,
  ].filter((entry) => entry !== null);
  const anyRefreshing = refreshable.some((entry) => entry.refreshing);
  const refreshAll = () => {
    for (const entry of refreshable) entry.refresh();
  };

  const reviewCount = selectionView ? selectionView.actions.length : null;
  const reviewAlert = selectionStatus === "disputed" || selectionStatus === "organizer_review";

  return (
    <main {...applyStyles(styles.main)}>
      <header {...applyStyles(styles.header)}>
        <h1 {...applyStyles(vis.srOnly)}>{title}</h1>
        <div {...applyStyles(styles.topBar)}>
          <EncounterBreadcrumb current={title} link={encountersLink} t={t} />
          {refreshable.length > 0 ? (
            <Button disabled={anyRefreshing} onClick={refreshAll} variant="ghost">
              <ArrowsClockwiseIcon aria-hidden="true" />
              {t("encounter.refresh")}
            </Button>
          ) : null}
        </div>
        <EncounterHero
          approvedPreview={approvedPreview}
          formats={formats}
          selectionView={selectionView}
          status={selectionStatus}
          t={t}
          view={view}
        />
        {viewRefresh?.refreshFailed ? (
          <Text role="status">{t("encounter.refreshFailed")}</Text>
        ) : null}
      </header>

      {openScheduleRequests > 0 && activeTab !== "schedule" && scheduleChanges ? (
        <Alert variant="warning">
          <AlertDescription>
            <div {...applyStyles(styles.alertRow)}>
              <span {...applyStyles(styles.status)}>
                <CalendarBlankIcon aria-hidden="true" />
                {t("encounter.overview.scheduleAlert", { count: openScheduleRequests })}
              </span>
              <Button onClick={() => setSelectedTab("schedule")} variant="outline">
                {t("encounter.overview.openSchedule")}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      <Tabs
        className={styles.tabsRoot}
        onValueChange={(value) => {
          if (
            value === "overview" ||
            value === "selection" ||
            value === "schedule" ||
            value === "review"
          ) {
            setSelectedTab(value);
          }
        }}
        value={activeTab}
        variant="pills"
      >
        <TabsList aria-label={t("encounter.tabs.label")}>
          <TabsTrigger value="overview">{t("encounter.tabs.overview")}</TabsTrigger>
          <TabsTrigger value="selection">
            {t("encounter.tabs.selection")}
            {candidates.kind === "ready" && candidates.data.status === "ready" ? (
              <span {...applyStyles(styles.tabCount)}>{candidateList.length}</span>
            ) : null}
          </TabsTrigger>
          {scheduleChanges ? (
            <TabsTrigger value="schedule">
              {t("encounter.tabs.schedule")}
              {scheduleChanges.kind === "ready" ? (
                <span
                  {...applyStyles(
                    styles.tabCount,
                    openScheduleRequests > 0 && styles.tabCountAlert,
                  )}
                >
                  {totalScheduleRequests}
                </span>
              ) : null}
            </TabsTrigger>
          ) : null}
          {hasReviewTab ? (
            <TabsTrigger value="review">
              {t("encounter.tabs.review")}
              {reviewCount !== null ? (
                <span {...applyStyles(styles.tabCount, reviewAlert && styles.tabCountAlert)}>
                  {reviewCount}
                </span>
              ) : null}
            </TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="overview">
          <div {...applyStyles(styles.tabPanel)}>
            <EncounterOverviewTab
              approvedPreview={approvedPreview}
              approvedProposal={approvedProposal}
              candidatesCount={candidateList.length}
              formats={formats}
              hasReviewTab={hasReviewTab}
              onNavigateTab={(tab) => setSelectedTab(tab)}
              requestsCount={totalScheduleRequests}
              selectionView={selectionView}
              t={t}
              view={view}
            />
          </div>
        </TabsContent>

        <TabsContent value="selection">
          <div {...applyStyles(styles.tabPanel)}>
            <EncounterSelectionWorkspace
              approvedAssignments={approvedAssignments}
              assignments={assignments}
              candidateList={candidateList}
              candidates={candidates}
              dispatch={dispatch}
              displayedPreview={displayedPreview}
              draft={draft}
              formats={formats}
              isApproved={isApproved}
              onInteract={() => pinTab("selection")}
              preview={preview}
              t={t}
              teamSelection={effectiveTeamSelection}
              view={view}
            />
          </div>
        </TabsContent>

        {scheduleChanges ? (
          <TabsContent value="schedule">
            <div {...applyStyles(styles.tabPanel)}>
              <Card className={styles.panelCard}>
                <ScheduleChangesSection state={scheduleChanges} view={view} />
              </Card>
            </div>
          </TabsContent>
        ) : null}

        {hasReviewTab && disputeReview ? (
          <TabsContent value="review">
            <div {...applyStyles(styles.tabPanel)}>
              <DisputeReviewSection
                candidates={candidateList}
                dispatch={operatorDispatch}
                draft={operatorDraft}
                encounter={view}
                onInteract={() => pinTab("review")}
                state={disputeReview}
              />
            </div>
          </TabsContent>
        ) : null}
      </Tabs>
    </main>
  );
}
