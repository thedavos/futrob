"use client";

import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  PageHeader,
  PageHeaderActions,
  PageHeaderDescription,
  PageHeaderTitle,
  Skeleton,
} from "@futrob/ui";
import { COMPETITION_PERMISSION } from "@futrob/competitions";
import {
  useOrganizationCompetitionsQuery,
  useOrganizationTeamsQuery,
} from "@/modules/competitions/presentation/competition-queries.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { useCan } from "@/shared/presentation/permissions/index.ts";
import { CreateCompetitionButton } from "./create-competition-button.tsx";
import { OrganizationHomeEmpty, OrganizationHomeLoadError } from "./organization-home-empty.tsx";
import { OrganizationHomeKpis, type OrganizationHomeMetric } from "./organization-home-kpis.tsx";
import { countActiveCompetitions, countDraftCompetitions } from "./organization-home-model.ts";
import { OrganizationHomeSections } from "./organization-home-sections.tsx";
import { useOrganizationProfileQuery } from "./organization-queries.ts";

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
});

export function OrganizationHomePage({ organizationId }: { readonly organizationId: string }) {
  const { t } = useI18n();
  const profileQuery = useOrganizationProfileQuery(organizationId);
  const competitionsQuery = useOrganizationCompetitionsQuery(organizationId);
  const teamsQuery = useOrganizationTeamsQuery(organizationId);
  const create = useCan({ organizationId }, COMPETITION_PERMISSION.update);

  const competitions = competitionsQuery.data?.competitions ?? [];
  const teams = teamsQuery.data?.teams ?? [];
  const hasCompetitions = competitionsQuery.isSuccess && competitions.length > 0;
  const showHeaderCta = hasCompetitions && create.allowed;

  const competitionMetric = (count: number): OrganizationHomeMetric => {
    if (competitionsQuery.isPending) return "loading";
    if (competitionsQuery.isError) return "unavailable";
    return count;
  };
  const teamsMetric: OrganizationHomeMetric = teamsQuery.isPending
    ? "loading"
    : teamsQuery.isError
      ? "unavailable"
      : teams.length;

  return (
    <main {...applyStyles(styles.main)}>
      <PageHeader className={styles.header}>
        {profileQuery.isPending ? (
          <Skeleton {...applyStyles(styles.titleSkeleton)} />
        ) : (
          <PageHeaderTitle truncate>
            {profileQuery.data?.name ?? t("shell.workspace.organizationFallback")}
          </PageHeaderTitle>
        )}
        <PageHeaderDescription>{t("org.home.description")}</PageHeaderDescription>
        {showHeaderCta ? (
          <PageHeaderActions>
            <CreateCompetitionButton organizationId={organizationId} />
          </PageHeaderActions>
        ) : null}
      </PageHeader>

      {profileQuery.isError ? (
        <OrganizationHomeLoadError
          message={t("org.home.error.profile")}
          onRetry={() => {
            void profileQuery.refetch();
          }}
        />
      ) : null}

      <OrganizationHomeKpis
        active={competitionMetric(countActiveCompetitions(competitions))}
        drafts={competitionMetric(countDraftCompetitions(competitions))}
        teams={teamsMetric}
      />

      {competitionsQuery.isError ? (
        <OrganizationHomeLoadError
          message={t("org.home.error.competitions")}
          onRetry={() => {
            void competitionsQuery.refetch();
          }}
        />
      ) : competitionsQuery.isPending ? null : competitions.length === 0 ? (
        <OrganizationHomeEmpty canCreate={create.allowed} organizationId={organizationId} />
      ) : (
        <OrganizationHomeSections
          competitions={competitions}
          organizationId={organizationId}
          teams={teamsQuery.isSuccess ? teams : []}
        />
      )}
    </main>
  );
}
