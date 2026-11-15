"use client";

import type { ListCompetitionSanctionsResponse } from "@futrob/api-contracts";
import { applyStyles, Caption, SectionTitle, Skeleton } from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { RetryAlert } from "@/shared/presentation/retry-alert.tsx";
import { sanctionRefusal, useTeamSanctionsQuery } from "./sanction-queries.ts";
import { SanctionTable } from "./sanction-table.tsx";
import { styles } from "./sanctions.styles.ts";

export type TeamSanctionsState =
  | { readonly kind: "loading" }
  | { readonly kind: "forbidden" }
  | { readonly kind: "error"; readonly retry: () => void }
  | { readonly kind: "ready"; readonly data: ListCompetitionSanctionsResponse };

type TeamScope = {
  readonly organizationId: string;
  readonly competitionId: string;
  readonly teamId: string;
};

/** The affected Team reads its own sanctions, revoked ones included (ADR-0028). */
export function TeamSanctionsSection(scope: TeamScope) {
  const query = useTeamSanctionsQuery(scope.organizationId, scope.competitionId, scope.teamId);
  const state: TeamSanctionsState = (() => {
    if (sanctionRefusal(query.error)) return { kind: "forbidden" };
    if (query.data) return { kind: "ready", data: query.data };
    if (query.isError) {
      return { kind: "error", retry: () => void query.refetch() };
    }
    return { kind: "loading" };
  })();
  return <TeamSanctionsSectionView state={state} />;
}

export function TeamSanctionsSectionView({ state }: { readonly state: TeamSanctionsState }) {
  const { t } = useI18n();
  return (
    <section aria-label={t("sanctions.team.label")} {...applyStyles(styles.section)}>
      <div {...applyStyles(styles.sectionHeader)}>
        <SectionTitle>{t("sanctions.team.title")}</SectionTitle>
      </div>
      {(() => {
        switch (state.kind) {
          case "loading":
            return (
              <div
                aria-busy="true"
                aria-label={t("sanctions.team.loading")}
                role="status"
                {...applyStyles(styles.loading)}
              >
                <Skeleton {...applyStyles(styles.skeleton)} />
              </div>
            );
          case "forbidden":
            return <Caption as="p">{t("sanctions.team.forbidden")}</Caption>;
          case "error":
            return <RetryAlert message={t("sanctions.team.error")} retry={state.retry} t={t} />;
          case "ready":
            return state.data.sanctions.length === 0 ? (
              <Caption as="p">{t("sanctions.team.empty")}</Caption>
            ) : (
              <SanctionTable label={t("sanctions.team.label")} sanctions={state.data.sanctions} />
            );
          default: {
            const exhaustive: never = state;
            return exhaustive;
          }
        }
      })()}
    </section>
  );
}
