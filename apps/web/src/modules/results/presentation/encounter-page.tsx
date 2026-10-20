"use client";

import { useReducer, type ReactElement } from "react";
import { Link } from "@tanstack/react-router";
import type { EncounterViewDto, ListEncounterCandidatesResponse } from "@futrob/api-contracts";
import {
  applyStyles,
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  Caption,
  Card,
  PageHeader,
  PageHeaderActions,
  PageHeaderDescription,
  PageHeaderTitle,
  SectionTitle,
  Skeleton,
  Text,
  vis,
} from "@futrob/ui";
import { ClubCrestAvatar } from "@/shared/presentation/club-crest-avatar.tsx";
import { MatchPitchSurface } from "@/shared/presentation/match-pitch-surface.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import {
  ScheduleChangesSection,
  type ScheduleChangesState,
} from "@/modules/scheduling/presentation/schedule-changes-section.tsx";
import { DisputeReviewSection, type DisputeReviewState } from "./dispute-review-section.tsx";
import { CandidatesSection } from "./encounter-candidates.tsx";
import { previewEncounter } from "./encounter-preview.ts";
import { styles } from "./encounter-page.styles.ts";
import { RetryAlert, type Formats } from "./encounter-parts.tsx";
import { OfficialSlotRow, SeriesPreviewPanel } from "./encounter-slots.tsx";
import { EMPTY_TEAM_DRAFT, teamDraftReducer } from "./team-selection-draft.ts";
import { TeamSelectionSection, type TeamSelectionState } from "./team-selection-section.tsx";

export type EncounterState =
  | { readonly kind: "loading" }
  | { readonly kind: "not_found" }
  | { readonly kind: "forbidden" }
  | { readonly kind: "error"; readonly retry: () => void }
  | { readonly kind: "ready"; readonly view: EncounterViewDto };

export type CandidatesState =
  | { readonly kind: "loading" }
  | { readonly kind: "forbidden" }
  | { readonly kind: "error"; readonly retry: () => void }
  | {
      readonly kind: "ready";
      readonly data: ListEncounterCandidatesResponse;
      readonly updatedAt: number;
      readonly refreshing: boolean;
      readonly refreshFailed: boolean;
      readonly refresh: () => void;
    };

export function EncounterPageView({
  candidates,
  competitionId,
  disputeReview,
  encounter,
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
  readonly organizationId: string;
}) {
  const { t } = useI18n();
  const encountersLink = (
    <Link
      params={{ orgId: organizationId, competitionId }}
      to="/orgs/$orgId/competitions/$competitionId/encounters"
    />
  );

  switch (encounter.kind) {
    case "not_found":
    case "forbidden":
      return (
        <main {...applyStyles(styles.main)}>
          <PageHeader>
            <PageHeaderTitle>
              {encounter.kind === "forbidden"
                ? t("encounter.forbidden.title")
                : t("encounter.notFound.title")}
            </PageHeaderTitle>
            <PageHeaderDescription>
              {encounter.kind === "forbidden"
                ? t("encounter.forbidden.description")
                : t("encounter.notFound.description")}
            </PageHeaderDescription>
            <PageHeaderActions>
              <Button render={encountersLink} role="link" variant="secondary">
                {t("encounter.backToEncounters")}
              </Button>
            </PageHeaderActions>
          </PageHeader>
        </main>
      );
    case "loading":
      return (
        <main aria-busy="true" {...applyStyles(styles.main)}>
          <h1 {...applyStyles(vis.srOnly)}>{t("encounter.loading")}</h1>
          <EncounterBreadcrumb link={encountersLink} t={t} />
          <Skeleton {...applyStyles(styles.skeletonHero)} />
          <Skeleton {...applyStyles(styles.skeletonRow)} />
        </main>
      );
    case "error":
      return (
        <main {...applyStyles(styles.main)}>
          <h1 {...applyStyles(vis.srOnly)}>{t("encounter.error")}</h1>
          <EncounterBreadcrumb link={encountersLink} t={t} />
          <RetryAlert message={t("encounter.error")} retry={encounter.retry} t={t} />
        </main>
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
}: {
  readonly candidates: CandidatesState;
  readonly disputeReview?: DisputeReviewState;
  readonly encountersLink: ReactElement;
  readonly scheduleChanges?: ScheduleChangesState;
  readonly teamSelection?: TeamSelectionState;
  readonly view: EncounterViewDto;
}) {
  const { locale, t } = useI18n();
  const [draft, dispatch] = useReducer(teamDraftReducer, EMPTY_TEAM_DRAFT);
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
  const preview = previewEncounter(view, candidateList, assignments);
  const title = t("encounter.title", { home: view.home.name, away: view.away.name });

  return (
    <main {...applyStyles(styles.main)}>
      <header {...applyStyles(styles.header)}>
        <h1 {...applyStyles(vis.srOnly)}>{title}</h1>
        <EncounterBreadcrumb current={title} link={encountersLink} t={t} />
        <EncounterHero formats={formats} t={t} view={view} />
      </header>
      {scheduleChanges ? <ScheduleChangesSection state={scheduleChanges} view={view} /> : null}
      {teamSelection ? (
        <TeamSelectionSection
          candidates={candidateList}
          dispatch={dispatch}
          draft={draft}
          encounter={view}
          preview={preview}
          state={teamSelection}
        />
      ) : null}
      {disputeReview ? (
        <DisputeReviewSection candidates={candidateList} encounter={view} state={disputeReview} />
      ) : null}
      <section aria-labelledby="encounter-slots" {...applyStyles(styles.section)}>
        <div {...applyStyles(styles.sectionCopy)}>
          <SectionTitle id="encounter-slots">{t("encounter.slots.title")}</SectionTitle>
          <Caption>{t("encounter.slots.description")}</Caption>
        </div>
        <ol {...applyStyles(styles.list)}>
          {preview.slots.map((slot) => (
            <OfficialSlotRow
              formats={formats}
              key={slot.slot}
              onClear={() => dispatch({ type: "clear_slot", slot: slot.slot })}
              preview={slot}
              t={t}
              view={view}
            />
          ))}
        </ol>
        <SeriesPreviewPanel series={preview.series} t={t} view={view} />
      </section>
      <CandidatesSection
        assignments={assignments}
        formats={formats}
        onAssign={(slot, key) => dispatch({ type: "assign", slot, key })}
        state={candidates}
        t={t}
        view={view}
      />
    </main>
  );
}

function EncounterBreadcrumb({
  current,
  link,
  t,
}: {
  readonly current?: string;
  readonly link: ReactElement;
  readonly t: Translator;
}) {
  return (
    <Breadcrumb aria-label={t("encounter.breadcrumb")}>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink render={link}>{t("pages.competition.encounters.title")}</BreadcrumbLink>
        </BreadcrumbItem>
        {current ? (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{current}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        ) : null}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function EncounterHero({
  formats,
  t,
  view,
}: {
  readonly formats: Formats;
  readonly t: Translator;
  readonly view: EncounterViewDto;
}) {
  const crest = (side: EncounterViewDto["home"]) => ({
    imageUrl: side.externalClub?.imageUrl ?? null,
    name: side.name,
  });
  return (
    <Card {...applyStyles(styles.hero)}>
      <MatchPitchSurface away={crest(view.away)} home={crest(view.home)}>
        <div {...applyStyles(styles.heroBody)}>
          <div {...applyStyles(styles.matchup, styles.scrim)}>
            <TeamIdentity label={t("encounter.side.home")} side={view.home} />
            <span aria-hidden="true" {...applyStyles(styles.vs)}>
              {t("encounter.vs")}
            </span>
            <TeamIdentity label={t("encounter.side.away")} side={view.away} />
          </div>
          <div {...applyStyles(styles.heroMeta, styles.scrim)}>
            <Badge className={styles.roundBadge} variant="neutral">
              {view.round
                ? `${view.competition.name} · ${
                    view.round.total
                      ? t("encounter.roundOf", {
                          number: view.round.number,
                          total: view.round.total,
                        })
                      : t("encounter.round", { number: view.round.number })
                  }`
                : view.competition.name}
            </Badge>
            <Text tone="default" weight="medium">
              <time dateTime={view.scheduledStartAt}>
                {formats.kickoff.format(new Date(view.scheduledStartAt))}
              </time>
            </Text>
            <Caption as="span">
              {t("encounter.timeZone", { zone: view.competition.timeZone })}
            </Caption>
          </div>
        </div>
      </MatchPitchSurface>
    </Card>
  );
}

function TeamIdentity({
  label,
  side,
}: {
  readonly label: string;
  readonly side: EncounterViewDto["home"];
}) {
  return (
    <div {...applyStyles(styles.team)}>
      <ClubCrestAvatar
        className={styles.crest}
        imageUrl={side.externalClub?.imageUrl ?? null}
        name={side.name}
      />
      <Text tone="default" weight="semibold" className={styles.teamName}>
        {side.name}
      </Text>
      <Caption as="span">{label}</Caption>
    </div>
  );
}
