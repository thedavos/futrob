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
  Skeleton,
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

const styles = stylex.create({
  header: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "0.75rem 1rem",
    marginBottom: 0,
  },
  headerActions: {
    gridColumnStart: "auto",
    gridRowStart: "auto",
    gridRowEnd: "auto",
    justifyContent: "flex-start",
  },
  identity: {
    display: "flex",
    minWidth: 0,
    flexGrow: 1,
    alignItems: "center",
    gap: "0.875rem",
  },
  identityCopy: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
    gap: "0.25rem",
  },
  titleRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.5rem 0.625rem",
    minWidth: 0,
  },
  coverFrame: {
    display: "flex",
    width: "3rem",
    height: "3rem",
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "var(--corner-lg)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: "0.25rem",
  },
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
  titleSkeleton: {
    width: "16rem",
    maxWidth: "100%",
    height: "2.25rem",
  },
  progressPanel: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    borderRadius: "var(--corner-lg)",
    backgroundColor: colors.surface,
    paddingBlock: "0.875rem",
    paddingInline: "1.25rem",
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

  return (
    <PageHeader className={styles.header}>
      {competition.status === "ready" ? (
        <div {...applyStyles(styles.identity)}>
          <CompetitionCoverMark cover={competition.data.cover} />
          <div {...applyStyles(styles.identityCopy)}>
            <div {...applyStyles(styles.titleRow)}>
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
      ) : competition.status === "loading" ? (
        <div {...applyStyles(styles.identityCopy)}>
          <Skeleton {...applyStyles(styles.titleSkeleton)} />
          <PageHeaderDescription>{t("competition.overview.description")}</PageHeaderDescription>
        </div>
      ) : (
        <div {...applyStyles(styles.identityCopy)}>
          <PageHeaderTitle>{t("shell.nav.competition.overview")}</PageHeaderTitle>
          <PageHeaderDescription>{t("competition.overview.description")}</PageHeaderDescription>
        </div>
      )}
      {competition.status === "ready" && competition.data.status === "draft" ? (
        <PageHeaderActions className={styles.headerActions}>
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
        <PageHeaderActions className={styles.headerActions}>
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
    <div aria-hidden="true" {...applyStyles(styles.coverFrame)}>
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
    <section aria-label={label} {...applyStyles(styles.progressPanel)}>
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
