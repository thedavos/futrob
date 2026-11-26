"use client";

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowSquareOutIcon, TrophyIcon } from "@phosphor-icons/react";
import type { CompetitionCoverDto, CompetitionDto } from "@futrob/api-contracts";
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
  Progress,
  ProgressIndicator,
  ProgressLabel,
  ProgressTrack,
  ProgressValue,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { organizationCompetitionStatusLabel } from "@/modules/organizations/presentation/organization-home-copy.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { competitionCoverSrc } from "../competition-cover-assets.ts";
import {
  competitionFormatLabel,
  competitionGameEditionLabel,
  competitionListBadgeVariant,
  competitionPlatformLabel,
  competitionScheduleLabel,
  competitionTeamsLabel,
} from "../competition-labels.ts";
import type { CompetitionProgressSummary, OverviewSlice } from "./competition-overview-model.ts";
import { OverviewHeaderSkeleton } from "./competition-overview-skeleton.tsx";
import { overviewLayout } from "./competition-overview.styles.ts";

const styles = stylex.create({
  coverImage: {
    display: "block",
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },
  coverFallback: {
    color: colors.primary,
  },
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.375rem",
    flexShrink: 0,
  },
  statusDot: {
    width: "0.375rem",
    height: "0.375rem",
    flexShrink: 0,
    borderRadius: "var(--corner-full)",
    backgroundColor: "currentColor",
  },
  progressValue: {
    color: colors.primary,
    fontWeight: 600,
  },
});

export function CompetitionOverviewHeader({
  approvedTeams,
  competition,
  competitionId,
  organizationId,
  portalHref,
}: {
  readonly approvedTeams: number | null;
  readonly competition: OverviewSlice<CompetitionDto>;
  readonly competitionId: string;
  readonly organizationId: string;
  readonly portalHref: string | null;
}) {
  const { locale, t } = useI18n();
  const summaryMeta =
    competition.status === "ready"
      ? [
          competitionFormatLabel(competition.data.format, t),
          competitionGameEditionLabel(competition.data.gameEdition),
          competitionPlatformLabel(competition.data.platform),
          approvedTeams === null
            ? null
            : competitionTeamsLabel(approvedTeams, competition.data.teams.max, t),
          competitionScheduleLabel(competition.data.schedule, locale, t),
        ]
          .filter((part): part is string => part !== null)
          .join(" · ")
      : null;

  let identity;
  switch (competition.status) {
    case "loading":
      identity = <OverviewHeaderSkeleton />;
      break;
    case "ready":
      identity = (
        <div {...applyStyles(overviewLayout.identity)}>
          <CompetitionCoverMark cover={competition.data.cover} />
          <div {...applyStyles(overviewLayout.identityCopy)}>
            <div {...applyStyles(overviewLayout.titleRow)}>
              <PageHeaderTitle truncate>{competition.data.name}</PageHeaderTitle>
              <Badge
                className={styles.statusBadge}
                variant={competitionListBadgeVariant(competition.data.status)}
              >
                <span aria-hidden="true" {...applyStyles(styles.statusDot)} />
                {organizationCompetitionStatusLabel(competition.data.status, t)}
              </Badge>
            </div>
            {summaryMeta ? <Caption as="p">{summaryMeta}</Caption> : null}
          </div>
        </div>
      );
      break;
    case "error":
      identity = (
        <div {...applyStyles(overviewLayout.identityCopy)}>
          <PageHeaderTitle>{t("shell.nav.competition.overview")}</PageHeaderTitle>
          <PageHeaderDescription>{t("competition.overview.description")}</PageHeaderDescription>
        </div>
      );
      break;
    default: {
      const _exhaustive: never = competition;
      return _exhaustive;
    }
  }

  return (
    <PageHeader className={overviewLayout.header}>
      {identity}
      {competition.status === "ready" && competition.data.status === "draft" ? (
        <PageHeaderActions className={overviewLayout.headerActions}>
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
      {portalHref ? (
        <PageHeaderActions className={overviewLayout.headerActions}>
          <Button
            render={<a href={portalHref} rel="noopener" target="_blank" />}
            role="link"
            variant="outline"
          >
            <ArrowSquareOutIcon aria-hidden="true" />
            {t("competition.overview.viewPortal")}
          </Button>
        </PageHeaderActions>
      ) : null}
    </PageHeader>
  );
}

function CompetitionCoverMark({ cover }: { readonly cover: CompetitionCoverDto }) {
  const [failed, setFailed] = useState(false);
  return (
    <div aria-hidden="true" {...applyStyles(overviewLayout.coverFrame)}>
      {failed ? (
        <TrophyIcon size={24} {...applyStyles(styles.coverFallback)} />
      ) : (
        <img
          alt=""
          data-outline="none"
          onError={() => setFailed(true)}
          src={competitionCoverSrc(cover)}
          {...applyStyles(styles.coverImage)}
        />
      )}
    </div>
  );
}

export function CompetitionProgressBanner({
  progress,
}: {
  readonly progress: CompetitionProgressSummary;
}) {
  const { t } = useI18n();
  const label =
    progress.kind === "encounters"
      ? t(
          progress.completed
            ? "competition.overview.progress.completed"
            : "competition.overview.progress.encounters",
          { official: progress.official, total: progress.total },
        )
      : t("competition.overview.progress.teams", {
          approved: progress.approved,
          max: progress.max,
        });

  return (
    <section
      aria-label={label}
      data-slot="competition-overview-progress"
      {...applyStyles(overviewLayout.progressPanel)}
    >
      <Progress max={100} value={progress.percent}>
        <ProgressLabel>{label}</ProgressLabel>
        <ProgressValue className={styles.progressValue}>
          {() => `${progress.percent}%`}
        </ProgressValue>
        <ProgressTrack>
          <ProgressIndicator />
        </ProgressTrack>
      </Progress>
    </section>
  );
}
