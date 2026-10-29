"use client";

import { useQueryClient } from "@tanstack/react-query";
import type { GetOrganizationPlanResponse } from "@futrob/api-contracts";
import { BILLING_PERMISSION } from "@futrob/billing";
import {
  applyStyles,
  EmptyState,
  EmptyStateCopy,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  Skeleton,
} from "@futrob/ui";
import accessUrl from "@/assets/illustration-permissions.png";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { PageScaffold } from "@/shared/presentation/page-scaffold.tsx";
import { useCan } from "@/shared/presentation/permissions/index.ts";
import { invalidateEffectiveAccessQueries } from "@/shared/presentation/query/invalidate-effective-access.ts";
import { RetryAlert } from "@/shared/presentation/retry-alert.tsx";
import { useOrganizationPlanQuery } from "./billing-queries.ts";
import {
  PlanChangesCard,
  PlanFeaturesCard,
  PlanSummaryCard,
  PlanUsageCard,
} from "./organization-plan-sections.tsx";
import { styles } from "./organization-plan.styles.ts";

export type OrganizationPlanState =
  | { readonly kind: "loading" }
  | { readonly kind: "forbidden" }
  | { readonly kind: "error"; readonly cause: "access" | "load"; readonly retry: () => void }
  | {
      readonly kind: "ready";
      readonly plan: GetOrganizationPlanResponse;
      /** A background refresh failed; the last plan stays on screen. */
      readonly refreshRetry?: () => void;
    };

export function OrganizationPlanRoute({ organizationId }: { readonly organizationId: string }) {
  const queryClient = useQueryClient();
  const access = useCan({ organizationId }, BILLING_PERMISSION.read);
  const query = useOrganizationPlanQuery(organizationId, access.allowed);

  const state: OrganizationPlanState = (() => {
    // Access is decided first, so a revoked role never sees a cached plan.
    if (access.loading) return { kind: "loading" };
    if (access.unavailable) {
      return {
        kind: "error",
        cause: "access",
        retry: () => void invalidateEffectiveAccessQueries(queryClient),
      };
    }
    if (!access.allowed) return { kind: "forbidden" };
    const read = query.data;
    if (read?.outcome === "refused") {
      return read.status === 401
        ? { kind: "error", cause: "load", retry: () => void query.refetch() }
        : { kind: "forbidden" };
    }
    if (read) {
      return {
        kind: "ready",
        plan: read.value,
        refreshRetry: query.isRefetchError ? () => void query.refetch() : undefined,
      };
    }
    if (query.isError) return { kind: "error", cause: "load", retry: () => void query.refetch() };
    return { kind: "loading" };
  })();

  return <OrganizationPlanPageView state={state} />;
}

export function OrganizationPlanPageView({ state }: { readonly state: OrganizationPlanState }) {
  const { t } = useI18n();
  return (
    <PageScaffold page="organization.plan">
      {(() => {
        switch (state.kind) {
          case "loading":
            return (
              <div
                aria-busy="true"
                aria-label={t("billing.loading")}
                role="status"
                {...applyStyles(styles.skeletonStack)}
              >
                <Skeleton {...applyStyles(styles.skeletonRow)} />
                <Skeleton {...applyStyles(styles.skeletonRow)} />
              </div>
            );
          case "error":
            return (
              <RetryAlert
                message={t(state.cause === "access" ? "billing.accessError" : "billing.error")}
                retry={state.retry}
                t={t}
              />
            );
          case "forbidden":
            return (
              <EmptyState>
                <EmptyStateIcon>
                  <img alt="" data-outline="none" src={accessUrl} />
                </EmptyStateIcon>
                <EmptyStateCopy>
                  <EmptyStateTitle>{t("billing.forbidden.title")}</EmptyStateTitle>
                  <EmptyStateDescription>
                    {t("billing.forbidden.description")}
                  </EmptyStateDescription>
                </EmptyStateCopy>
              </EmptyState>
            );
          case "ready":
            return (
              <>
                {state.refreshRetry ? (
                  <RetryAlert
                    message={t("billing.error")}
                    retry={state.refreshRetry}
                    t={t}
                    variant="warning"
                  />
                ) : null}
                <div {...applyStyles(styles.grid)}>
                  <PlanUsageCard plan={state.plan} />
                  <PlanSummaryCard plan={state.plan} />
                  <PlanFeaturesCard plan={state.plan} />
                  <PlanChangesCard changes={state.plan.recentChanges} />
                </div>
              </>
            );
        }
      })()}
    </PageScaffold>
  );
}
