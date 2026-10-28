"use client";

import { useId, type ComponentProps } from "react";
import { Link } from "@tanstack/react-router";
import { ClockIcon, ScalesIcon } from "@phosphor-icons/react";
import type { CompetitionDisputeDto, ListCompetitionDisputesResponse } from "@futrob/api-contracts";
import {
  applyStyles,
  Badge,
  Caption,
  EmptyState,
  EmptyStateCopy,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  Skeleton,
  Text,
  vis,
  type Icon,
} from "@futrob/ui";
import disputeUrl from "@/assets/illustration-dispute.png";
import accessUrl from "@/assets/illustration-permissions.png";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { PageScaffold } from "@/shared/presentation/page-scaffold.tsx";
import { RetryAlert } from "@/shared/presentation/retry-alert.tsx";

import { styles } from "./competition-encounters-page.styles.ts";
import { isRefusal, useCompetitionDisputesQuery } from "./encounter-queries.ts";

export type CompetitionDisputesState =
  | { readonly kind: "loading" }
  | { readonly kind: "not_found" }
  | { readonly kind: "error"; readonly retry: () => void }
  | { readonly kind: "ready"; readonly data: ListCompetitionDisputesResponse };

const STATUS = {
  disputed: { variant: "destructive", icon: ScalesIcon },
  organizer_review: { variant: "warning", icon: ClockIcon },
} as const satisfies Record<
  CompetitionDisputeDto["status"],
  { readonly variant: ComponentProps<typeof Badge>["variant"]; readonly icon: Icon }
>;

type Scope = { readonly organizationId: string; readonly competitionId: string };

/** Operator queue. Each row opens the Encounter's existing review section. */
export function CompetitionDisputesRoute(scope: Scope) {
  const query = useCompetitionDisputesQuery(scope.organizationId, scope.competitionId);
  const state: CompetitionDisputesState = (() => {
    if (query.data) return { kind: "ready", data: query.data };
    if (query.isError) {
      return isRefusal(query.error)
        ? { kind: "not_found" }
        : { kind: "error", retry: () => void query.refetch() };
    }
    return { kind: "loading" };
  })();
  return <CompetitionDisputesPageView {...scope} state={state} />;
}

export function CompetitionDisputesPageView({
  competitionId,
  organizationId,
  state,
}: Scope & { readonly state: CompetitionDisputesState }) {
  const { locale, t } = useI18n();
  return (
    <PageScaffold page="competition.disputes">
      {(() => {
        switch (state.kind) {
          case "loading":
            return (
              <div
                aria-busy="true"
                aria-label={t("disputes.list.loading")}
                role="status"
                {...applyStyles(styles.list)}
              >
                <Skeleton {...applyStyles(styles.skeleton)} />
                <Skeleton {...applyStyles(styles.skeleton)} />
              </div>
            );
          case "error":
            return <RetryAlert message={t("disputes.list.error")} retry={state.retry} t={t} />;
          case "not_found":
            return (
              <EmptyState>
                <EmptyStateIcon>
                  <img alt="" data-outline="none" src={accessUrl} />
                </EmptyStateIcon>
                <EmptyStateCopy>
                  <EmptyStateTitle>{t("disputes.list.notFound.title")}</EmptyStateTitle>
                  <EmptyStateDescription>
                    {t("disputes.list.notFound.description")}
                  </EmptyStateDescription>
                </EmptyStateCopy>
              </EmptyState>
            );
          case "ready":
            return state.data.disputes.length === 0 ? (
              <EmptyState>
                <EmptyStateIcon>
                  <img alt="" data-outline="none" src={disputeUrl} />
                </EmptyStateIcon>
                <EmptyStateCopy>
                  <EmptyStateTitle>{t("disputes.list.empty.title")}</EmptyStateTitle>
                  <EmptyStateDescription>
                    {t("disputes.list.empty.description")}
                  </EmptyStateDescription>
                </EmptyStateCopy>
              </EmptyState>
            ) : (
              <DisputeList
                competitionId={competitionId}
                data={state.data}
                locale={locale}
                organizationId={organizationId}
                t={t}
              />
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

function DisputeList({
  competitionId,
  data,
  locale,
  organizationId,
  t,
}: Scope & {
  readonly data: ListCompetitionDisputesResponse;
  readonly locale: string;
  readonly t: Translator;
}) {
  const when = new Intl.DateTimeFormat(locale, {
    timeZone: data.competition.timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <section aria-labelledby="competition-disputes" {...applyStyles(styles.section)}>
      <div {...applyStyles(styles.sectionHead)}>
        <h2 id="competition-disputes" {...applyStyles(vis.srOnly)}>
          {t("disputes.list.label")}
        </h2>
        <Caption as="p">{t("disputes.list.timeZone", { zone: data.competition.timeZone })}</Caption>
      </div>
      <ol {...applyStyles(styles.list)}>
        {data.disputes.map((dispute) => (
          <li key={dispute.encounterId}>
            <DisputeRow
              competitionId={competitionId}
              dispute={dispute}
              organizationId={organizationId}
              t={t}
              when={when}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}

function teamName(name: string | null, t: Translator) {
  return name ?? t("disputes.list.team.unnamed");
}

function DisputeRow({
  competitionId,
  dispute,
  organizationId,
  t,
  when,
}: Scope & {
  readonly dispute: CompetitionDisputeDto;
  readonly t: Translator;
  readonly when: Intl.DateTimeFormat;
}) {
  const { variant, icon: StatusIcon } = STATUS[dispute.status];
  const detailsId = useId();
  const home = teamName(dispute.home.name, t);
  const away = teamName(dispute.away.name, t);
  return (
    <Link
      aria-describedby={`${detailsId}-status ${detailsId}-when`}
      aria-label={t("disputes.list.open", { home, away })}
      hash="encounter-review"
      params={{ orgId: organizationId, competitionId, encounterId: dispute.encounterId }}
      to="/orgs/$orgId/competitions/$competitionId/encounters/$encounterId"
      {...applyStyles(styles.row)}
    >
      <div id={`${detailsId}-status`} {...applyStyles(styles.rowMeta)}>
        <Badge variant={variant}>
          <StatusIcon aria-hidden="true" />
          {t(`disputes.list.status.${dispute.status}`)}
        </Badge>
        <Caption as="span">
          {t("disputes.list.waiting", { since: when.format(new Date(dispute.since)) })}
        </Caption>
      </div>
      <div {...applyStyles(styles.matchup)}>
        <Text tone="default" weight="semibold" className={styles.home}>
          {home}
        </Text>
        <span aria-hidden="true" {...applyStyles(styles.vs)}>
          {t("encounter.vs")}
        </span>
        <Text tone="default" weight="semibold" className={styles.away}>
          {away}
        </Text>
      </div>
      <div id={`${detailsId}-when`} {...applyStyles(styles.rowMeta)}>
        <Text tone="default" weight="medium">
          <time dateTime={dispute.scheduledStartAt}>
            {t("disputes.list.kickoff", { when: when.format(new Date(dispute.scheduledStartAt)) })}
          </time>
        </Text>
      </div>
    </Link>
  );
}
