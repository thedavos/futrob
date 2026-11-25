"use client";

import { useId, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import {
  Alert,
  AlertDescription,
  applyStyles,
  Button,
  Caption,
  Card,
  CardContent,
  CardHeader,
  ChoiceGroup,
  ChoiceGroupItem,
  Field,
  Heading,
  InputWithIcon,
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  typography,
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
  filterOrganizationTeams,
  getParticipationFilterReadiness,
  summarizeOrganizationTeams,
  type CompetitionParticipantsResult,
  type CompetitionsListState,
  type OrganizationTeamsFilter,
  type TeamStatusFilter,
} from "./organization-teams-model.ts";
import { OrganizationTeamsKpis, type OrganizationTeamsMetric } from "./organization-teams-kpis.tsx";
import {
  OrganizationTeamsEmpty,
  OrganizationTeamsError,
  OrganizationTeamsFilterLoading,
  OrganizationTeamsFilterUnavailable,
  OrganizationTeamsForbidden,
  OrganizationTeamsLoading,
  OrganizationTeamsNoMatches,
} from "./organization-teams-states.tsx";
import { OrganizationTeamsTable } from "./organization-teams-table.tsx";
import { pageStyles as styles } from "./organization-teams.styles.ts";

const CAPABILITIES = {
  readTeams: TEAM_PERMISSION.read,
  createCompetition: COMPETITION_PERMISSION.update,
} as const;

const STATUS_OPTIONS: readonly TeamStatusFilter[] = ["all", "pending", "none"];

function isForbidden(error: Error | null): boolean {
  return error instanceof CompetitionsClientError && error.status === 403;
}

/**
 * Operational directory of the organization's teams (`teams.listByOrganization`, which returns
 * every team without pagination). Competitions come from the existing participant reads and
 * only add context: their absence never hides a team.
 */
export function OrganizationTeamsPage({
  organizationId,
  query,
  status: controlledStatus,
  competitionId: controlledCompetitionId,
  onFiltersChange,
}: {
  readonly organizationId: string;
  readonly query: string;
  readonly status?: TeamStatusFilter;
  readonly competitionId?: string;
  readonly onFiltersChange: (next: OrganizationTeamsFilter) => void;
}) {
  const { t } = useI18n();
  const headingId = useId();
  const [uncontrolledStatus, setUncontrolledStatus] = useState<TeamStatusFilter>("all");
  const [uncontrolledCompetitionId, setUncontrolledCompetitionId] = useState<string>("all");

  const statusFilter = controlledStatus ?? uncontrolledStatus;
  const competitionFilter = controlledCompetitionId ?? uncontrolledCompetitionId;

  function applyFilters(next: OrganizationTeamsFilter) {
    if (controlledStatus === undefined) setUncontrolledStatus(next.status);
    if (controlledCompetitionId === undefined) setUncontrolledCompetitionId(next.competitionId);
    onFiltersChange(next);
  }

  const caps = useCapabilities({ organizationId }, CAPABILITIES);
  const denied = !caps.loading && !caps.unavailable && !caps.readTeams;
  const canCreateCompetition = !caps.loading && !caps.unavailable && caps.createCompetition;

  const teamsQuery = useOrganizationTeamsQuery(organizationId);
  const teams = teamsQuery.data?.teams ?? [];
  const competitionsQuery = useOrganizationCompetitionsQuery(organizationId);
  // A 403 is authoritative: cached competitions from before the refusal must not be shown.
  const competitionsForbidden = isForbidden(competitionsQuery.error);
  const competitions = competitionsForbidden ? [] : (competitionsQuery.data?.competitions ?? []);
  const competitionsKnown = !competitionsForbidden && competitionsQuery.data !== undefined;
  const competitionsState: CompetitionsListState = competitionsForbidden
    ? "forbidden"
    : competitionsQuery.isPending
      ? "loading"
      : competitionsQuery.isError
        ? "error"
        : "ready";

  const showParticipation = teamsQuery.isSuccess && teams.length > 0;
  const participantQueries = useQueries({
    queries: competitions.map((competition) => ({
      queryKey: queryKeys.competitions.participants(organizationId, competition.id),
      queryFn: () => listCompetitionParticipants(organizationId, competition.id),
      enabled: showParticipation,
    })),
  });

  const participantResults: CompetitionParticipantsResult[] = participantQueries.map((result) =>
    isForbidden(result.error)
      ? { kind: "forbidden" }
      : result.isSuccess
        ? { kind: "data", participants: result.data.participants }
        : result.isError
          ? { kind: "error" }
          : { kind: "loading" },
  );
  const index = buildTeamParticipationIndex(competitions, participantResults, competitionsKnown);
  const participationLoading =
    competitionsState === "loading" ||
    participantResults.some((result) => result.kind === "loading");
  const participationRefused =
    competitionsForbidden || participantResults.some((result) => result.kind === "forbidden");
  const participationFailed =
    competitionsState === "error" || participantResults.some((result) => result.kind === "error");

  function retryParticipation() {
    if (competitionsQuery.isError) void competitionsQuery.refetch();
    for (const result of participantQueries) {
      if (result.isError) void result.refetch();
    }
  }

  function clearAllFilters() {
    applyFilters({ query: "", status: "all", competitionId: "all" });
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
        <OrganizationTeamsForbidden organizationId={organizationId} />
      </main>
    );
  }

  if (caps.loading || teamsQuery.isPending) {
    return (
      <main {...applyStyles(styles.main)}>
        {header}
        <OrganizationTeamsLoading />
      </main>
    );
  }

  if (!teamsQuery.data) {
    return (
      <main {...applyStyles(styles.main)}>
        {header}
        <OrganizationTeamsError
          onRetry={() => {
            void teamsQuery.refetch();
          }}
        />
      </main>
    );
  }

  if (teams.length === 0) {
    return (
      <main {...applyStyles(styles.main)}>
        {header}
        <OrganizationTeamsEmpty
          organizationId={organizationId}
          showCreateCompetition={
            competitionsKnown && competitions.length === 0 && canCreateCompetition
          }
        />
      </main>
    );
  }

  // Keep a deep-linked competition ID intact until the competitions list is known.
  const effectiveCompetition = !competitionsKnown
    ? competitionFilter
    : competitionFilter === "all" ||
        competitions.some((competition) => competition.id === competitionFilter)
      ? competitionFilter
      : "all";
  const activeFilter: OrganizationTeamsFilter = {
    query,
    status: statusFilter,
    competitionId: effectiveCompetition,
  };
  const filterReadiness = getParticipationFilterReadiness(
    activeFilter,
    competitions,
    participantResults,
    competitionsState,
  );
  const summary = summarizeOrganizationTeams(teams, index);
  const activeMetric: OrganizationTeamsMetric = participationLoading
    ? "loading"
    : summary.activeTeams === null
      ? "unavailable"
      : summary.activeTeams;
  const pendingMetric: OrganizationTeamsMetric = participationLoading
    ? "loading"
    : summary.pendingEntries === null
      ? "unavailable"
      : summary.pendingEntries;

  const visible = filterOrganizationTeams(teams, activeFilter, index);
  const hasSearch = query.trim().length > 0;
  const hasFacetFilter = statusFilter !== "all" || effectiveCompetition !== "all";
  const filtering = hasSearch || hasFacetFilter;

  const countLabel =
    filterReadiness === "loading"
      ? t("org.teams.filterLoadingCount")
      : filterReadiness !== "ready"
        ? t("org.teams.filterUnavailableCount")
        : filtering
          ? t("org.teams.countFiltered", { shown: visible.length, total: teams.length })
          : t("org.teams.count", { count: teams.length });

  const competitionItems = [
    { value: "all", label: t("org.teams.filter.allCompetitions") },
    ...competitions.map((competition) => ({
      value: competition.id,
      label: competition.name,
    })),
  ];

  const showFilterUnavailable =
    visible.length === 0 && (filterReadiness === "error" || filterReadiness === "forbidden");

  return (
    <main {...applyStyles(styles.main)}>
      {header}
      <OrganizationTeamsKpis
        active={activeMetric}
        pending={pendingMetric}
        total={summary.totalTeams}
      />
      {teamsQuery.isError ? (
        <Alert variant="warning">
          <AlertDescription>{t("org.teams.refreshFailed")}</AlertDescription>
        </Alert>
      ) : null}
      {participationRefused &&
      !participationFailed &&
      !participationLoading &&
      !showFilterUnavailable ? (
        <Alert variant="warning">
          <AlertDescription>{t("org.teams.partialForbidden")}</AlertDescription>
        </Alert>
      ) : null}
      {participationFailed && !participationLoading && !showFilterUnavailable ? (
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
          <div {...applyStyles(styles.cardHeading)}>
            <Heading className={typography.title} id={headingId}>
              {t("org.teams.directory.title")}
            </Heading>
            <Caption aria-live="polite" role="status">
              {countLabel}
            </Caption>
          </div>
          {competitions.length > 0 ? (
            <ChoiceGroup
              aria-label={t("org.teams.filter.statusLabel")}
              className={styles.statusGroup}
              onValueChange={(value) => {
                if (value === "all" || value === "pending" || value === "none") {
                  applyFilters({ ...activeFilter, status: value });
                }
              }}
              value={statusFilter}
            >
              {STATUS_OPTIONS.map((option) => (
                <ChoiceGroupItem
                  appearance="pill"
                  dense
                  disabled={option === "none" && !index.complete}
                  key={option}
                  value={option}
                >
                  {option === "pending" && (summary.pendingEntries ?? 0) > 0 ? (
                    <span aria-hidden="true" {...applyStyles(styles.statusDot)} />
                  ) : null}
                  {t(`org.teams.filter.${option}`)}
                </ChoiceGroupItem>
              ))}
            </ChoiceGroup>
          ) : null}
        </CardHeader>
        <CardContent className={styles.content}>
          <div
            role="search"
            {...applyStyles(competitions.length > 0 ? styles.toolbar : styles.toolbarSingle)}
          >
            <Field name="teams-search">
              <InputWithIcon
                aria-label={t("org.teams.search")}
                autoComplete="off"
                dense
                onChange={(event) => applyFilters({ ...activeFilter, query: event.target.value })}
                placeholder={t("org.teams.search")}
                startIcon={MagnifyingGlassIcon}
                type="search"
                value={query}
              />
            </Field>
            {competitions.length > 0 ? (
              <Field name="teams-competition-filter">
                <Select
                  items={competitionItems}
                  onValueChange={(value) => {
                    if (value !== null) applyFilters({ ...activeFilter, competitionId: value });
                  }}
                  value={effectiveCompetition}
                >
                  <SelectTrigger aria-label={t("org.teams.filter.competitionLabel")} dense>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {competitionItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : null}
          </div>
          {visible.length === 0 && filterReadiness === "loading" ? (
            <OrganizationTeamsFilterLoading />
          ) : showFilterUnavailable ? (
            <OrganizationTeamsFilterUnavailable
              kind={filterReadiness}
              onClear={clearAllFilters}
              onRetry={filterReadiness === "error" ? retryParticipation : undefined}
            />
          ) : visible.length === 0 ? (
            <OrganizationTeamsNoMatches
              hasFacetFilter={hasFacetFilter}
              onClear={clearAllFilters}
              query={query}
            />
          ) : (
            <OrganizationTeamsTable
              labelledBy={headingId}
              organizationId={organizationId}
              participation={{ index, loading: participationLoading }}
              teams={visible}
            />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
