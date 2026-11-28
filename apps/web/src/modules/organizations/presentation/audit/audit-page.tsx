"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type {
  ListOrganizationAuditResponse,
  OrganizationAuditEntryDto,
} from "@futrob/api-contracts";
import { ORGANIZATION_PERMISSION } from "@futrob/organizations";
import {
  applyStyles,
  Button,
  Caption,
  EmptyState,
  EmptyStateActions,
  EmptyStateCopy,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  vis,
} from "@futrob/ui";
import accessUrl from "@/assets/illustration-permissions.png";
import rulesUrl from "@/assets/illustration-rules.png";
import { useOrganizationCompetitionsQuery } from "@/modules/competitions/presentation/competition-queries.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { PageScaffold } from "@/shared/presentation/page-scaffold.tsx";
import { useCan } from "@/shared/presentation/permissions/use-can.ts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { RetryAlert } from "@/shared/presentation/retry-alert.tsx";
import { useOrganizationMembersQuery } from "../organization-queries.ts";
import { AuditDetailSheet } from "./audit-detail-sheet.tsx";
import {
  AuditFilterForm,
  hasAuditFilters,
  type AuditFilterOption,
  type AuditFilters,
} from "./audit-filters.tsx";
import { AuditLoadingSkeleton } from "./audit-loading.tsx";
import { isAuditRefusal, useOrganizationAuditQuery } from "./audit-queries.ts";
import { AuditTable } from "./audit-table.tsx";
import { styles } from "./audit.styles.ts";

export type AuditPageState =
  | { readonly kind: "loading" }
  | { readonly kind: "denied" }
  | { readonly kind: "error"; readonly retry: () => void }
  | {
      readonly kind: "ready";
      readonly data: ListOrganizationAuditResponse;
      readonly refreshError?: () => void;
    };

type Scope = { readonly organizationId: string; readonly competitionId?: string };

export function AuditPageRoute(scope: Scope) {
  const [filters, setFilters] = useState<AuditFilters>({});
  const [cursors, setCursors] = useState<readonly string[]>([]);
  const queryClient = useQueryClient();
  const access = useCan(scope, ORGANIZATION_PERMISSION.auditTrailRead);
  const membershipsAccess = useCan(
    { organizationId: scope.organizationId },
    ORGANIZATION_PERMISSION.membershipsRead,
  );
  const query = useOrganizationAuditQuery(
    scope.organizationId,
    {
      ...filters,
      competitionId: scope.competitionId ?? filters.competitionId,
      cursor: cursors.at(-1),
      limit: 25,
    },
    access.allowed,
  );
  const membersQuery = useOrganizationMembersQuery(
    scope.organizationId,
    access.allowed && membershipsAccess.allowed,
  );
  const competitionsQuery = useOrganizationCompetitionsQuery(
    access.allowed && !scope.competitionId ? scope.organizationId : "",
  );

  const actorOptions: readonly AuditFilterOption[] =
    membersQuery.data?.kind === "data"
      ? membersQuery.data.members.map((member) => ({
          id: member.actorId,
          label: member.displayName ?? member.email ?? member.actorId,
        }))
      : [];

  const competitionOptions: readonly AuditFilterOption[] = competitionsQuery.data
    ? competitionsQuery.data.competitions.map((competition) => ({
        id: competition.id,
        label: competition.name,
      }))
    : [];

  const retryAccess = () =>
    void queryClient.invalidateQueries({ queryKey: queryKeys.authorization.all });
  const state: AuditPageState = access.loading
    ? { kind: "loading" }
    : access.unavailable
      ? { kind: "error", retry: retryAccess }
      : !access.allowed || isAuditRefusal(query.error)
        ? { kind: "denied" }
        : query.data
          ? {
              kind: "ready",
              data: query.data,
              refreshError: query.isError ? () => void query.refetch() : undefined,
            }
          : query.isError
            ? { kind: "error", retry: () => void query.refetch() }
            : { kind: "loading" };

  return (
    <AuditPageView
      {...scope}
      actorOptions={actorOptions}
      competitionOptions={competitionOptions}
      state={state}
      filters={filters}
      onFilter={(next) => {
        setFilters(next);
        setCursors([]);
      }}
      onNext={(cursor) => setCursors((current) => [...current, cursor])}
      onPrevious={() => setCursors((current) => current.slice(0, -1))}
      canPrevious={cursors.length > 0}
    />
  );
}

export function AuditPageView({
  organizationId,
  competitionId,
  state,
  filters,
  actorOptions = [],
  competitionOptions = [],
  onFilter,
  onNext,
  onPrevious,
  canPrevious,
}: Scope & {
  readonly state: AuditPageState;
  readonly filters: AuditFilters;
  readonly actorOptions?: readonly AuditFilterOption[];
  readonly competitionOptions?: readonly AuditFilterOption[];
  readonly onFilter: (filters: AuditFilters) => void;
  readonly onNext: (cursor: string) => void;
  readonly onPrevious: () => void;
  readonly canPrevious: boolean;
}) {
  const { t } = useI18n();
  const [selectedEntry, setSelectedEntry] = useState<OrganizationAuditEntryDto | null>(null);
  const filtered = hasAuditFilters(filters, competitionId);
  const entries = state.kind === "ready" ? state.data.entries : [];
  const loading = state.kind === "loading";
  const backHref = competitionId
    ? `/orgs/${encodeURIComponent(organizationId)}/competitions/${encodeURIComponent(competitionId)}`
    : `/orgs/${encodeURIComponent(organizationId)}`;
  const activeDetail =
    selectedEntry && entries.some((entry) => entry.id === selectedEntry.id) ? selectedEntry : null;

  return (
    <PageScaffold page={competitionId ? "competition.audit" : "organization.audit"}>
      <div {...applyStyles(styles.body)}>
        <span
          aria-label={loading ? t("audit.loading") : undefined}
          role="status"
          {...applyStyles(vis.srOnly)}
        >
          {loading ? t("audit.loading") : ""}
        </span>
        {state.kind !== "denied" ? (
          <AuditFilterForm
            actorOptions={actorOptions}
            competitionId={competitionId}
            competitionOptions={competitionOptions}
            entries={entries}
            filters={filters}
            onApply={onFilter}
          />
        ) : null}
        {loading ? <AuditLoadingSkeleton /> : null}
        {state.kind === "error" ? (
          <RetryAlert message={t("audit.loadError")} retry={state.retry} t={t} />
        ) : null}
        {state.kind === "denied" ? (
          <EmptyState>
            <EmptyStateIcon>
              <img alt="" data-outline="none" src={accessUrl} />
            </EmptyStateIcon>
            <EmptyStateCopy>
              <EmptyStateTitle>{t("audit.denied.title")}</EmptyStateTitle>
              <EmptyStateDescription>{t("audit.denied.description")}</EmptyStateDescription>
            </EmptyStateCopy>
            <EmptyStateActions>
              <Button
                nativeButton={false}
                render={<a href={backHref} />}
                role="link"
                variant="outline"
              >
                {t(
                  competitionId
                    ? "audit.denied.backToCompetition"
                    : "audit.denied.backToOrganization",
                )}
              </Button>
            </EmptyStateActions>
          </EmptyState>
        ) : null}
        {state.kind === "ready" ? (
          <>
            {state.refreshError ? (
              <RetryAlert
                message={t("audit.refreshError")}
                retry={state.refreshError}
                t={t}
                variant="warning"
              />
            ) : null}
            {entries.length ? (
              <AuditTable
                entries={entries}
                onSelect={setSelectedEntry}
                selectedId={activeDetail?.id}
              />
            ) : (
              <EmptyState>
                <EmptyStateIcon>
                  <img alt="" data-outline="none" src={rulesUrl} />
                </EmptyStateIcon>
                <EmptyStateCopy>
                  <EmptyStateTitle>
                    {t(filtered ? "audit.filteredEmpty.title" : "audit.empty.title")}
                  </EmptyStateTitle>
                  <EmptyStateDescription>
                    {t(filtered ? "audit.filteredEmpty.description" : "audit.empty.description")}
                  </EmptyStateDescription>
                </EmptyStateCopy>
                {filtered ? (
                  <EmptyStateActions>
                    <Button onClick={() => onFilter({})} type="button" variant="outline">
                      {t("audit.filter.clear")}
                    </Button>
                  </EmptyStateActions>
                ) : null}
              </EmptyState>
            )}
            <div {...applyStyles(styles.pagination)}>
              <Caption>{t("audit.order")}</Caption>
              <div {...applyStyles(styles.paginationActions)}>
                <Button dense onClick={onPrevious} disabled={!canPrevious} variant="outline">
                  {t("audit.previous")}
                </Button>
                <Button
                  dense
                  onClick={() => {
                    if (state.data.nextCursor) onNext(state.data.nextCursor);
                  }}
                  disabled={!state.data.nextCursor}
                  variant="outline"
                >
                  {t("audit.next")}
                </Button>
              </div>
            </div>
            <AuditDetailSheet
              activeActorFilter={filters.actorId}
              entry={activeDetail}
              onClose={() => setSelectedEntry(null)}
              onFilterByActor={(actorId) => onFilter({ ...filters, actorId })}
            />
          </>
        ) : null}
      </div>
    </PageScaffold>
  );
}
