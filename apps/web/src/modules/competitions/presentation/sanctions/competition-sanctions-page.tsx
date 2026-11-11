"use client";

import type {
  CompetitionSanctionDto,
  ImposeSanctionRequest,
  ListCompetitionSanctionsResponse,
} from "@futrob/api-contracts";
import { COMPETITION_PERMISSION } from "@futrob/competitions";
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
import rulesUrl from "@/assets/illustration-rules.png";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { PageScaffold } from "@/shared/presentation/page-scaffold.tsx";
import { useCan } from "@/shared/presentation/permissions/use-can.ts";
import { RetryAlert } from "@/shared/presentation/retry-alert.tsx";
import { RevokeSanctionDialog } from "./revoke-sanction-dialog.tsx";
import { ImposeSanctionDialog } from "./impose-sanction-dialog.tsx";
import {
  sanctionRefusal,
  useCompetitionSanctionsQuery,
  useSanctionCommands,
} from "./sanction-queries.ts";
import { SanctionTable } from "./sanction-table.tsx";
import { sanctionPlayerName, sanctionTeamName, sanctionTypeLabel } from "./sanction-view.ts";
import { styles } from "./sanctions.styles.ts";

export type CompetitionSanctionsState =
  | { readonly kind: "loading" }
  | { readonly kind: "not_found" }
  | { readonly kind: "error"; readonly retry: () => void }
  | { readonly kind: "ready"; readonly data: ListCompetitionSanctionsResponse };

type Scope = { readonly organizationId: string; readonly competitionId: string };

/** Commands the operator view offers; absent when the actor can only read. */
export type SanctionCommands = {
  readonly impose: (input: ImposeSanctionRequest) => Promise<void>;
  readonly revoke: (sanctionId: string, reason: string) => Promise<void>;
};

/**
 * Organizer and staff page (ADR-0028). Reading needs `competitions.sanctions.read`;
 * the impose and revoke controls appear only with `competitions.sanctions.manage`, and
 * the API still refuses with 403 whoever lacks it.
 */
export function CompetitionSanctionsRoute(scope: Scope) {
  const query = useCompetitionSanctionsQuery(scope.organizationId, scope.competitionId);
  const manage = useCan(scope, COMPETITION_PERMISSION.sanctionsManage);
  const { impose, revoke } = useSanctionCommands(scope.organizationId, scope.competitionId);
  const state: CompetitionSanctionsState = (() => {
    if (sanctionRefusal(query.error)) return { kind: "not_found" };
    if (query.data) return { kind: "ready", data: query.data };
    if (query.isError) {
      return { kind: "error", retry: () => void query.refetch() };
    }
    return { kind: "loading" };
  })();
  const commands: SanctionCommands | null = manage.allowed
    ? {
        impose: async (input) => {
          await impose.mutateAsync(input);
        },
        revoke: async (sanctionId, reason) => {
          await revoke.mutateAsync({ sanctionId, reason });
        },
      }
    : null;
  return <CompetitionSanctionsPageView {...scope} commands={commands} state={state} />;
}

export function CompetitionSanctionsPageView({
  commands,
  competitionId,
  organizationId,
  state,
}: Scope & {
  readonly commands: SanctionCommands | null;
  readonly state: CompetitionSanctionsState;
}) {
  const { t } = useI18n();
  const canImpose = commands !== null && state.kind === "ready";
  return (
    <PageScaffold
      actions={
        canImpose ? (
          <ImposeSanctionDialog
            competitionId={competitionId}
            onImpose={commands.impose}
            organizationId={organizationId}
          />
        ) : null
      }
      page="competition.sanctions"
    >
      {(() => {
        switch (state.kind) {
          case "loading":
            return (
              <div
                aria-busy="true"
                aria-label={t("sanctions.list.loading")}
                role="status"
                {...applyStyles(styles.loading)}
              >
                <Skeleton {...applyStyles(styles.skeleton)} />
                <Skeleton {...applyStyles(styles.skeleton)} />
              </div>
            );
          case "error":
            return <RetryAlert message={t("sanctions.list.error")} retry={state.retry} t={t} />;
          case "not_found":
            return (
              <EmptyState>
                <EmptyStateIcon>
                  <img alt="" data-outline="none" src={accessUrl} />
                </EmptyStateIcon>
                <EmptyStateCopy>
                  <EmptyStateTitle>{t("sanctions.list.notFound.title")}</EmptyStateTitle>
                  <EmptyStateDescription>
                    {t("sanctions.list.notFound.description")}
                  </EmptyStateDescription>
                </EmptyStateCopy>
              </EmptyState>
            );
          case "ready":
            return state.data.sanctions.length === 0 ? (
              <EmptyState>
                <EmptyStateIcon>
                  <img alt="" data-outline="none" src={rulesUrl} />
                </EmptyStateIcon>
                <EmptyStateCopy>
                  <EmptyStateTitle>{t("sanctions.list.empty.title")}</EmptyStateTitle>
                  <EmptyStateDescription>
                    {t("sanctions.list.empty.description")}
                  </EmptyStateDescription>
                </EmptyStateCopy>
              </EmptyState>
            ) : (
              <section aria-label={t("sanctions.list.label")} {...applyStyles(styles.section)}>
                <SanctionTable
                  action={
                    commands
                      ? (sanction) =>
                          sanction.revocation ? null : (
                            <RevokeSanctionControl revoke={commands.revoke} sanction={sanction} />
                          )
                      : undefined
                  }
                  label={t("sanctions.list.label")}
                  sanctions={state.data.sanctions}
                />
              </section>
            );
          default: {
            const exhaustive: never = state;
            return exhaustive;
          }
        }
      })()}
    </PageScaffold>
  );
}

function RevokeSanctionControl({
  revoke,
  sanction,
}: {
  readonly revoke: SanctionCommands["revoke"];
  readonly sanction: CompetitionSanctionDto;
}) {
  const { t } = useI18n();
  const target =
    sanction.targetType === "player"
      ? sanctionPlayerName(sanction, t)
      : sanctionTeamName(sanction, t);
  return (
    <RevokeSanctionDialog
      description={t("sanctions.revoke.description", {
        type: sanctionTypeLabel(sanction.type, t),
        target,
      })}
      onRevoke={(reason) => revoke(sanction.id, reason)}
    />
  );
}
