"use client";

import { useId } from "react";
import {
  applyStyles,
  PageHeader,
  PageHeaderActions,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  vis,
} from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { OverviewCard } from "./competition-overview-card.tsx";
import { CompetitionOverviewKpis } from "./competition-overview-kpis.tsx";
import { OVERVIEW_TEAMS_LIMIT, OVERVIEW_UPCOMING_LIMIT } from "./competition-overview-model.ts";
import { overviewSkeleton as bones } from "./competition-overview-skeleton.styles.ts";
import { overviewLayout } from "./competition-overview.styles.ts";

const TEAM_ROWS = Array.from({ length: OVERVIEW_TEAMS_LIMIT }, (_, index) => index);
const ENCOUNTER_ROWS = Array.from({ length: OVERVIEW_UPCOMING_LIMIT }, (_, index) => index);
const PENDING_ROWS = [0, 1, 2];
const PUBLISHING_META_ROWS = [0, 1, 2];

export function OverviewProgressSkeleton() {
  return (
    <section
      aria-hidden="true"
      data-slot="competition-overview-progress"
      {...applyStyles(overviewLayout.progressPanel)}
    >
      <div {...applyStyles(bones.progress)}>
        <Skeleton {...applyStyles(bones.progressLabel)} />
        <Skeleton {...applyStyles(bones.progressValue)} />
        <Skeleton {...applyStyles(bones.progressTrack)} />
      </div>
    </section>
  );
}

export function OverviewHeaderSkeleton() {
  return (
    <>
      <div aria-hidden="true" {...applyStyles(overviewLayout.identity)}>
        <div {...applyStyles(overviewLayout.coverFrame)}>
          <Skeleton {...applyStyles(bones.cover)} />
        </div>
        <div {...applyStyles(overviewLayout.identityCopy)}>
          <div {...applyStyles(overviewLayout.titleRow)}>
            <Skeleton {...applyStyles(bones.title)} />
            <Skeleton {...applyStyles(bones.badge)} />
          </div>
          <Skeleton {...applyStyles(bones.meta)} />
        </div>
      </div>
      <PageHeaderActions className={overviewLayout.headerActions}>
        <Skeleton aria-hidden="true" {...applyStyles(bones.portalButton)} />
      </PageHeaderActions>
    </>
  );
}

export function OverviewTeamsBodySkeleton() {
  const { t } = useI18n();
  const bodyCell = applyStyles(bones.tableCell);
  return (
    <Table containerTabIndex={-1} dense>
      <TableHeader>
        <TableRow>
          <TableHead>{t("competition.overview.teams.column.team")}</TableHead>
          <TableHead>{t("competition.overview.teams.column.eaClub")}</TableHead>
          <TableHead align="end">{t("competition.overview.teams.column.roster")}</TableHead>
          <TableHead align="end">{t("competition.overview.teams.column.status")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {TEAM_ROWS.map((index) => (
          <TableRow key={index}>
            <TableCell className={bodyCell.className} style={bodyCell.style}>
              <Skeleton {...applyStyles(bones.teamName)} />
            </TableCell>
            <TableCell className={bodyCell.className} style={bodyCell.style}>
              <Skeleton {...applyStyles(bones.eaClub)} />
            </TableCell>
            <TableCell align="end" className={bodyCell.className} style={bodyCell.style}>
              <Skeleton {...applyStyles(bones.roster)} />
            </TableCell>
            <TableCell align="end" className={bodyCell.className} style={bodyCell.style}>
              <Skeleton {...applyStyles(bones.status)} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function OverviewEncounterRowsSkeleton() {
  return (
    <ul aria-hidden="true" {...applyStyles(bones.list)}>
      {ENCOUNTER_ROWS.map((index) => (
        <li key={index} {...applyStyles(bones.rowItem)}>
          <div {...applyStyles(bones.encounterRow)}>
            <span {...applyStyles(bones.copy)}>
              <Skeleton {...applyStyles(bones.encounterTitle)} />
              <Skeleton {...applyStyles(bones.encounterSubtitle)} />
            </span>
            <span {...applyStyles(bones.officialEnd)}>
              <Skeleton {...applyStyles(bones.score)} />
              <Skeleton {...applyStyles(bones.badge)} />
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function OverviewPendingBodySkeleton() {
  return (
    <ul aria-hidden="true" {...applyStyles(bones.list)}>
      {PENDING_ROWS.map((index) => (
        <li key={index} {...applyStyles(bones.rowItem)}>
          <div {...applyStyles(bones.pendingRow)}>
            <Skeleton {...applyStyles(bones.pendingIcon)} />
            <span {...applyStyles(bones.copy)}>
              <Skeleton {...applyStyles(bones.pendingTitle)} />
              <Skeleton {...applyStyles(bones.pendingSubtitle)} />
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function OverviewPublishingBodySkeleton() {
  return (
    <>
      <div aria-hidden="true" {...applyStyles(bones.switchBlock)}>
        <div {...applyStyles(bones.switchRow)}>
          <Skeleton {...applyStyles(bones.switchLabel)} />
          <Skeleton {...applyStyles(bones.switchControl)} />
        </div>
        <Skeleton {...applyStyles(bones.description)} />
      </div>
      <div aria-hidden="true" {...applyStyles(bones.divider)} />
      <div aria-hidden="true" {...applyStyles(bones.metaList)}>
        {PUBLISHING_META_ROWS.map((index) => (
          <div key={index} {...applyStyles(bones.metaRow)}>
            <Skeleton {...applyStyles(bones.metaTerm)} />
            <Skeleton {...applyStyles(bones.metaValue)} />
          </div>
        ))}
      </div>
    </>
  );
}

export function OverviewViewAllSkeleton() {
  return <Skeleton aria-hidden="true" {...applyStyles(bones.viewAll)} />;
}

/**
 * Full-page loading layout for the organizer competition summary. Mirrors the
 * data-state grid so the page does not jump when the first reads resolve.
 */
export function CompetitionOverviewSkeleton() {
  const { t } = useI18n();
  const teamsTitleId = useId();
  const officialTitleId = useId();
  const pendingTitleId = useId();
  const publishingTitleId = useId();
  const label = t("competition.overview.loading");

  return (
    <main aria-busy="true" aria-label={label} {...applyStyles(overviewLayout.main)}>
      <span aria-label={label} role="status" {...applyStyles(vis.srOnly)}>
        {label}
      </span>
      <PageHeader className={overviewLayout.header}>
        <OverviewHeaderSkeleton />
      </PageHeader>

      <OverviewProgressSkeleton />

      <CompetitionOverviewKpis
        officialized="loading"
        pending="loading"
        teams="loading"
        upcoming="loading"
      />

      <div {...applyStyles(overviewLayout.layout)}>
        <div {...applyStyles(overviewLayout.column)}>
          <OverviewCard
            action={<OverviewViewAllSkeleton />}
            flush
            title={t("competition.overview.teams.title")}
            titleId={teamsTitleId}
          >
            <OverviewTeamsBodySkeleton />
          </OverviewCard>
          <OverviewCard
            action={<OverviewViewAllSkeleton />}
            title={t("competition.overview.upcoming.title")}
            titleId={officialTitleId}
          >
            <OverviewEncounterRowsSkeleton />
          </OverviewCard>
        </div>
        <div {...applyStyles(overviewLayout.column)}>
          <OverviewCard title={t("competition.overview.pending.title")} titleId={pendingTitleId}>
            <OverviewPendingBodySkeleton />
          </OverviewCard>
          <OverviewCard
            title={t("competition.overview.publishing.title")}
            titleId={publishingTitleId}
          >
            <OverviewPublishingBodySkeleton />
          </OverviewCard>
        </div>
      </div>
    </main>
  );
}
