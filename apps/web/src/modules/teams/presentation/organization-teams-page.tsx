"use client";

import { useId } from "react";
import { Link } from "@tanstack/react-router";
import { useQueries } from "@tanstack/react-query";
import { LockSimpleIcon, MagnifyingGlassIcon, UsersThreeIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import {
  Alert,
  AlertDescription,
  applyStyles,
  Button,
  Caption,
  Card,
  CardContent,
  CardHeader,
  EmptyState,
  EmptyStateActions,
  EmptyStateCopy,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  Field,
  Heading,
  InputWithIcon,
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
  Skeleton,
} from "@futrob/ui";
import { COMPETITION_PERMISSION } from "@futrob/competitions";
import { TEAM_PERMISSION } from "@futrob/teams";
import {
  CompetitionsClientError,
  listCompetitionParticipants,
} from "@/modules/competitions/presentation/competitions-browser-client.ts";
import {
  useOrganizationCompetitionsQuery,
  useOrganizationTeamsQuery,
} from "@/modules/competitions/presentation/competition-queries.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { useCapabilities } from "@/shared/presentation/permissions/index.ts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import {
  buildTeamParticipationIndex,
  type CompetitionParticipantsResult,
  filterTeamsByName,
} from "./organization-teams-model.ts";
import { OrganizationTeamsTable } from "./organization-teams-table.tsx";

const styles = stylex.create({
  main: {
    display: "flex",
    width: "100%",
    minWidth: 0,
    flexDirection: "column",
    gap: "1rem",
  },
  header: { marginBottom: 0 },
  cardHeader: { padding: "1.25rem", gap: "0.25rem" },
  heading: { fontSize: "var(--text-lg)", fontWeight: 600 },
  content: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
    gap: "1rem",
    paddingInline: "1.25rem",
    paddingBottom: "1.25rem",
  },
  rows: { display: "flex", flexDirection: "column", gap: "0.75rem" },
  row: { height: "2.75rem", width: "100%" },
  feedback: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "0.75rem" },
  noMatches: { display: "flex", justifyContent: "center", paddingBlock: "1.5rem" },
});

const CAPABILITIES = {
  readTeams: TEAM_PERMISSION.read,
  readRosters: TEAM_PERMISSION.rosterRead,
  readParticipants: COMPETITION_PERMISSION.participantsRead,
} as const;

function isForbidden(error: Error | null): boolean {
  return error instanceof CompetitionsClientError && error.status === 403;
}

/**
 * Read-only directory of the organization's teams (`teams.listByOrganization`, which returns
 * every team without pagination). Competitions come from the existing participant reads and
 * only add context: their absence never hides a team.
 */
export function OrganizationTeamsPage({
  organizationId,
  query,
  onQueryChange,
}: {
  readonly organizationId: string;
  readonly query: string;
  readonly onQueryChange: (query: string) => void;
}) {
  const { t } = useI18n();
  const headingId = useId();
  const caps = useCapabilities({ organizationId }, CAPABILITIES);
  const denied = !caps.loading && !caps.unavailable && !caps.readTeams;

  const teamsQuery = useOrganizationTeamsQuery(organizationId);
  const teams = teamsQuery.data?.teams ?? [];
  const competitionsQuery = useOrganizationCompetitionsQuery(organizationId);
  const competitions = competitionsQuery.data?.competitions ?? [];
  const showParticipation = teamsQuery.isSuccess && teams.length > 0;
  const participantQueries = useQueries({
    queries: competitions.map((competition) => ({
      queryKey: queryKeys.competitions.participants(organizationId, competition.id),
      queryFn: () => listCompetitionParticipants(organizationId, competition.id),
      enabled: showParticipation,
    })),
  });

  const participantResults: CompetitionParticipantsResult[] = participantQueries.map((result) =>
    result.isSuccess
      ? { kind: "data", participants: result.data.participants }
      : result.isError
        ? { kind: "error" }
        : { kind: "loading" },
  );
  const index = buildTeamParticipationIndex(competitions, participantResults);
  const participationLoading =
    competitionsQuery.isPending || participantResults.some((result) => result.kind === "loading");
  const participationFailed =
    competitionsQuery.isError || participantResults.some((result) => result.kind === "error");

  function retryParticipation() {
    if (competitionsQuery.isError) void competitionsQuery.refetch();
    for (const result of participantQueries) {
      if (result.isError) void result.refetch();
    }
  }

  const header = (
    <PageHeader className={styles.header}>
      <PageHeaderTitle>{t("pages.organization.teams.title")}</PageHeaderTitle>
      <PageHeaderDescription>{t("pages.organization.teams.subtitle")}</PageHeaderDescription>
    </PageHeader>
  );

  if (denied || isForbidden(teamsQuery.error)) {
    return (
      <main {...applyStyles(styles.main)}>
        {header}
        <EmptyState>
          <EmptyStateIcon>
            <LockSimpleIcon aria-hidden />
          </EmptyStateIcon>
          <EmptyStateCopy>
            <EmptyStateTitle>{t("org.teams.forbidden.title")}</EmptyStateTitle>
            <EmptyStateDescription>{t("org.teams.forbidden.description")}</EmptyStateDescription>
          </EmptyStateCopy>
          <EmptyStateActions>
            <Button
              render={<Link params={{ orgId: organizationId }} to="/orgs/$orgId" />}
              variant="outline"
            >
              {t("org.teams.forbidden.cta")}
            </Button>
          </EmptyStateActions>
        </EmptyState>
      </main>
    );
  }

  if (caps.loading || teamsQuery.isPending) {
    return (
      <main {...applyStyles(styles.main)}>
        {header}
        <Card aria-busy="true">
          <CardContent className={styles.content}>
            <Caption role="status">{t("org.teams.loading")}</Caption>
            <div aria-hidden="true" {...applyStyles(styles.rows)}>
              {[0, 1, 2, 3].map((row) => (
                <Skeleton key={row} {...applyStyles(styles.row)} />
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!teamsQuery.data) {
    return (
      <main {...applyStyles(styles.main)}>
        {header}
        <div {...applyStyles(styles.feedback)}>
          <Alert variant="destructive">
            <AlertDescription>{t("org.teams.error")}</AlertDescription>
          </Alert>
          <Button
            onClick={() => {
              void teamsQuery.refetch();
            }}
            type="button"
            variant="outline"
          >
            {t("common.retry")}
          </Button>
        </div>
      </main>
    );
  }

  if (teams.length === 0) {
    return (
      <main {...applyStyles(styles.main)}>
        {header}
        <EmptyState>
          <EmptyStateIcon>
            <UsersThreeIcon aria-hidden />
          </EmptyStateIcon>
          <EmptyStateCopy>
            <EmptyStateTitle>{t("org.teams.empty.title")}</EmptyStateTitle>
            <EmptyStateDescription>{t("org.teams.empty.description")}</EmptyStateDescription>
          </EmptyStateCopy>
          <EmptyStateActions>
            <Button
              render={<Link params={{ orgId: organizationId }} to="/orgs/$orgId/competitions" />}
              variant="outline"
            >
              {t("org.teams.empty.cta")}
            </Button>
          </EmptyStateActions>
        </EmptyState>
      </main>
    );
  }

  const visible = filterTeamsByName(teams, query);
  const filtering = query.trim().length > 0;

  return (
    <main {...applyStyles(styles.main)}>
      {header}
      {teamsQuery.isError ? (
        <Alert variant="warning">
          <AlertDescription>{t("org.teams.refreshFailed")}</AlertDescription>
        </Alert>
      ) : null}
      {participationFailed && !participationLoading ? (
        <div {...applyStyles(styles.feedback)}>
          <Alert variant="warning">
            <AlertDescription>{t("org.teams.partial")}</AlertDescription>
          </Alert>
          <Button onClick={retryParticipation} type="button" variant="outline">
            {t("common.retry")}
          </Button>
        </div>
      ) : null}
      <Card aria-labelledby={headingId}>
        <CardHeader className={styles.cardHeader}>
          <Heading className={styles.heading} id={headingId}>
            {t("org.teams.directory.title")}
          </Heading>
          <Caption aria-live="polite" role="status">
            {filtering
              ? t("org.teams.countFiltered", { shown: visible.length, total: teams.length })
              : t("org.teams.count", { count: teams.length })}
          </Caption>
        </CardHeader>
        <CardContent className={styles.content}>
          <div role="search">
            <Field name="teams-search">
              <InputWithIcon
                aria-label={t("org.teams.search")}
                autoComplete="off"
                dense
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder={t("org.teams.search")}
                startIcon={MagnifyingGlassIcon}
                type="search"
                value={query}
              />
            </Field>
          </div>
          {visible.length === 0 ? (
            <div {...applyStyles(styles.noMatches)}>
              <EmptyState>
                <EmptyStateCopy>
                  <EmptyStateTitle>{t("org.teams.noMatches.title")}</EmptyStateTitle>
                  <EmptyStateDescription>
                    {t("org.teams.noMatches.description", { query: query.trim() })}
                  </EmptyStateDescription>
                </EmptyStateCopy>
                <EmptyStateActions>
                  <Button onClick={() => onQueryChange("")} type="button" variant="outline">
                    {t("org.teams.noMatches.clear")}
                  </Button>
                </EmptyStateActions>
              </EmptyState>
            </div>
          ) : (
            <OrganizationTeamsTable
              labelledBy={headingId}
              organizationId={organizationId}
              participation={{
                index,
                loading: participationLoading,
                linksAllowed: caps.readRosters && caps.readParticipants,
              }}
              teams={visible}
            />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
