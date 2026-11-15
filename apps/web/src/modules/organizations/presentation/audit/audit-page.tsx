"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ListOrganizationAuditResponse } from "@futrob/api-contracts";
import { ORGANIZATION_PERMISSION } from "@futrob/organizations";
import {
  applyStyles,
  Button,
  Caption,
  EmptyState,
  EmptyStateCopy,
  EmptyStateDescription,
  EmptyStateTitle,
  Skeleton,
} from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { PageScaffold } from "@/shared/presentation/page-scaffold.tsx";
import { useCan } from "@/shared/presentation/permissions/use-can.ts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { RetryAlert } from "@/shared/presentation/retry-alert.tsx";
import { AuditFilterForm, hasAuditFilters, type AuditFilters } from "./audit-filters.tsx";
import { AuditTable } from "./audit-table.tsx";
import { CompetitionAuditTabs } from "./competition-audit-tabs.tsx";
import { isAuditRefusal, useOrganizationAuditQuery } from "./audit-queries.ts";
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
  onFilter,
  onNext,
  onPrevious,
  canPrevious,
}: Scope & {
  readonly state: AuditPageState;
  readonly filters: AuditFilters;
  readonly onFilter: (filters: AuditFilters) => void;
  readonly onNext: (cursor: string) => void;
  readonly onPrevious: () => void;
  readonly canPrevious: boolean;
}) {
  const { t } = useI18n();
  const filtered = hasAuditFilters(filters, competitionId);
  const entries = state.kind === "ready" ? state.data.entries : [];
  return (
    <PageScaffold page={competitionId ? "competition.audit" : "organization.audit"}>
      <div {...applyStyles(styles.body)}>
        {competitionId ? (
          <CompetitionAuditTabs
            organizationId={organizationId}
            competitionId={competitionId}
            active="audit"
          />
        ) : null}
        {state.kind !== "denied" ? (
          <AuditFilterForm
            key={JSON.stringify(filters)}
            filters={filters}
            competitionId={competitionId}
            entries={entries}
            onApply={onFilter}
          />
        ) : null}
        {state.kind === "loading" ? (
          <div aria-label={t("audit.loading")} aria-busy="true">
            {[0, 1, 2].map((item) => (
              <Skeleton key={item} {...applyStyles(styles.loading)} />
            ))}
          </div>
        ) : null}
        {state.kind === "error" ? (
          <RetryAlert message={t("audit.loadError")} retry={state.retry} t={t} />
        ) : null}
        {state.kind === "denied" ? (
          <EmptyState>
            <EmptyStateCopy>
              <EmptyStateTitle>{t("audit.denied.title")}</EmptyStateTitle>
              <EmptyStateDescription>{t("audit.denied.description")}</EmptyStateDescription>
            </EmptyStateCopy>
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
              <AuditTable entries={entries} />
            ) : (
              <EmptyState>
                <EmptyStateCopy>
                  <EmptyStateTitle>
                    {t(filtered ? "audit.filteredEmpty.title" : "audit.empty.title")}
                  </EmptyStateTitle>
                  <EmptyStateDescription>
                    {t(filtered ? "audit.filteredEmpty.description" : "audit.empty.description")}
                  </EmptyStateDescription>
                </EmptyStateCopy>
              </EmptyState>
            )}
            <div {...applyStyles(styles.pagination)}>
              <Caption>{t("audit.order")}</Caption>
              <div {...applyStyles(styles.paginationActions)}>
                <Button onClick={onPrevious} disabled={!canPrevious} variant="outline">
                  {t("audit.previous")}
                </Button>
                <Button
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
          </>
        ) : null}
      </div>
    </PageScaffold>
  );
}
