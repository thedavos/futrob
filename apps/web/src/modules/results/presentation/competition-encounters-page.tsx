"use client";

import { useId, type ComponentProps } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarBlankIcon, ClockIcon, SealCheckIcon } from "@phosphor-icons/react";
import type {
  CompetitionEncounterDto,
  CompetitionEncounterStatusDto,
  ListCompetitionEncountersResponse,
} from "@futrob/api-contracts";
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
import emptyFixturesUrl from "@/assets/illustration-pending-fixtures.png";
import accessUrl from "@/assets/illustration-permissions.png";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { PageScaffold, type ScaffoldPageId } from "@/shared/presentation/page-scaffold.tsx";
import { RetryAlert } from "./encounter-parts.tsx";
import { styles } from "./competition-encounters-page.styles.ts";
import { isRefusal, useCompetitionEncountersQuery } from "./encounter-queries.ts";

export type CompetitionEncountersState =
  | { readonly kind: "loading" }
  | { readonly kind: "not_found" }
  | { readonly kind: "error"; readonly retry: () => void }
  | { readonly kind: "ready"; readonly data: ListCompetitionEncountersResponse };

const STATUS = {
  scheduled: { variant: "neutral", icon: CalendarBlankIcon },
  awaiting_result: { variant: "warning", icon: ClockIcon },
  official: { variant: "approved", icon: SealCheckIcon },
} as const satisfies Record<
  CompetitionEncounterStatusDto,
  { readonly variant: ComponentProps<typeof Badge>["variant"]; readonly icon: Icon }
>;

type Scope = { readonly organizationId: string; readonly competitionId: string };

/**
 * Staff read every Encounter under «Enfrentamientos»; a Team member reads the same list
 * under «Partidos», where the server keeps only the Encounters they may open.
 */
type ListPage = {
  readonly page?: Extract<ScaffoldPageId, "competition.encounters" | "competitionPlayer.matches">;
};

export function CompetitionEncountersRoute({ page, ...scope }: Scope & ListPage) {
  const query = useCompetitionEncountersQuery(scope.organizationId, scope.competitionId);
  const state: CompetitionEncountersState = (() => {
    if (query.data) return { kind: "ready", data: query.data };
    if (query.isError) {
      return isRefusal(query.error)
        ? { kind: "not_found" }
        : { kind: "error", retry: () => void query.refetch() };
    }
    return { kind: "loading" };
  })();
  return <CompetitionEncountersPageView {...scope} page={page} state={state} />;
}

export function CompetitionEncountersPageView({
  competitionId,
  organizationId,
  page = "competition.encounters",
  state,
}: Scope & ListPage & { readonly state: CompetitionEncountersState }) {
  const { locale, t } = useI18n();
  return (
    <PageScaffold page={page}>
      {(() => {
        switch (state.kind) {
          case "loading":
            return (
              <div
                aria-busy="true"
                aria-label={t("encounters.list.loading")}
                role="status"
                {...applyStyles(styles.list)}
              >
                <Skeleton {...applyStyles(styles.skeleton)} />
                <Skeleton {...applyStyles(styles.skeleton)} />
              </div>
            );
          case "error":
            return <RetryAlert message={t("encounters.list.error")} retry={state.retry} t={t} />;
          case "not_found":
            return (
              <EmptyState>
                <EmptyStateIcon>
                  <img alt="" data-outline="none" src={accessUrl} />
                </EmptyStateIcon>
                <EmptyStateCopy>
                  <EmptyStateTitle>{t("encounters.list.notFound.title")}</EmptyStateTitle>
                  <EmptyStateDescription>
                    {t("encounters.list.notFound.description")}
                  </EmptyStateDescription>
                </EmptyStateCopy>
              </EmptyState>
            );
          case "ready":
            return state.data.encounters.length === 0 ? (
              <EmptyState>
                <EmptyStateIcon>
                  <img alt="" data-outline="none" src={emptyFixturesUrl} />
                </EmptyStateIcon>
                <EmptyStateCopy>
                  <EmptyStateTitle>{t("encounters.list.empty.title")}</EmptyStateTitle>
                  <EmptyStateDescription>
                    {t("encounters.list.empty.description")}
                  </EmptyStateDescription>
                </EmptyStateCopy>
              </EmptyState>
            ) : (
              <EncounterList
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

function EncounterList({
  competitionId,
  data,
  locale,
  organizationId,
  t,
}: Scope & {
  readonly data: ListCompetitionEncountersResponse;
  readonly locale: string;
  readonly t: Translator;
}) {
  const kickoff = new Intl.DateTimeFormat(locale, {
    timeZone: data.competition.timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <section aria-labelledby="competition-encounters" {...applyStyles(styles.section)}>
      <div {...applyStyles(styles.sectionHead)}>
        <h2 id="competition-encounters" {...applyStyles(vis.srOnly)}>
          {t("encounters.list.label")}
        </h2>
        <Caption as="p">
          {t("encounters.list.timeZone", { zone: data.competition.timeZone })}
        </Caption>
      </div>
      <ol {...applyStyles(styles.list)}>
        {data.encounters.map((encounter) => (
          <li key={encounter.encounterId}>
            <EncounterRow
              competitionId={competitionId}
              encounter={encounter}
              kickoff={kickoff}
              organizationId={organizationId}
              t={t}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}

function EncounterRow({
  competitionId,
  encounter,
  kickoff,
  organizationId,
  t,
}: Scope & {
  readonly encounter: CompetitionEncounterDto;
  readonly kickoff: Intl.DateTimeFormat;
  readonly t: Translator;
}) {
  const { variant, icon: StatusIcon } = STATUS[encounter.status];
  const detailsId = useId();
  const round = encounter.round.total
    ? t("encounter.roundOf", { number: encounter.round.number, total: encounter.round.total })
    : t("encounter.round", { number: encounter.round.number });
  return (
    <Link
      aria-describedby={`${detailsId}-status ${detailsId}-time`}
      aria-label={t("encounters.list.open", {
        home: encounter.home.name,
        away: encounter.away.name,
      })}
      params={{ orgId: organizationId, competitionId, encounterId: encounter.encounterId }}
      to="/orgs/$orgId/competitions/$competitionId/encounters/$encounterId"
      {...applyStyles(styles.row)}
    >
      <div id={`${detailsId}-status`} {...applyStyles(styles.rowMeta)}>
        <Caption as="span">{round}</Caption>
        <Badge variant={variant}>
          <StatusIcon aria-hidden="true" />
          {t(`encounters.list.status.${encounter.status}`)}
        </Badge>
      </div>
      <div {...applyStyles(styles.matchup)}>
        <Text tone="default" weight="semibold" className={styles.home}>
          {encounter.home.name}
        </Text>
        <span aria-hidden="true" {...applyStyles(styles.vs)}>
          {t("encounter.vs")}
        </span>
        <Text tone="default" weight="semibold" className={styles.away}>
          {encounter.away.name}
        </Text>
      </div>
      <div id={`${detailsId}-time`} {...applyStyles(styles.rowMeta)}>
        <Text tone="default" weight="medium">
          <time dateTime={encounter.scheduledStartAt}>
            {kickoff.format(new Date(encounter.scheduledStartAt))}
          </time>
        </Text>
        <Caption as="span">
          {t("encounters.list.slots", { count: encounter.officialMatchCount })}
        </Caption>
      </div>
    </Link>
  );
}
