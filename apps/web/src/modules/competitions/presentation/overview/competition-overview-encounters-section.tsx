"use client";

import { useId } from "react";
import { Link } from "@tanstack/react-router";
import type {
  CompetitionEncounterDto,
  ListCompetitionEncountersResponse,
} from "@futrob/api-contracts";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, Badge, Caption, Skeleton, Text, TextLink } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import {
  EncounterScorePill,
  formatEncounterScore,
} from "@/modules/results/presentation/encounter-score.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { RetryAlert } from "@/shared/presentation/retry-alert.tsx";
import { OverviewCard, OverviewEmpty, ViewAllChevron } from "./competition-overview-card.tsx";
import {
  recentOfficialEncounters,
  upcomingEncounters,
  type OverviewSlice,
} from "./competition-overview-model.ts";

const styles = stylex.create({
  list: {
    display: "flex",
    flexDirection: "column",
    margin: 0,
    padding: 0,
    listStyleType: "none",
  },
  rowItem: {
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: "color-mix(in oklab, var(--border) 60%, transparent)",
    ":last-child": {
      borderBottomWidth: 0,
    },
  },
  row: {
    display: "flex",
    minHeight: "2.75rem",
    minWidth: 0,
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
    paddingBlock: "0.5rem",
    color: colors.foreground,
    textDecorationLine: "none",
    borderRadius: "var(--corner-md)",
    outlineStyle: "none",
    boxShadow: {
      default: null,
      ":focus-visible": "0 0 0 2px color-mix(in oklab, var(--ring) 25%, transparent)",
    },
  },
  copy: {
    display: "flex",
    minWidth: 0,
    flexGrow: 1,
    flexDirection: "column",
    gap: "0.125rem",
  },
  truncate: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  meta: {
    flexShrink: 0,
    fontVariantNumeric: "tabular-nums",
  },
  officialEnd: {
    display: "flex",
    flexShrink: 0,
    alignItems: "center",
    gap: "0.5rem",
  },
  action: {
    display: "inline-flex",
    alignItems: "center",
    flexShrink: 0,
    gap: "0.25rem",
    textDecorationLine: "none",
    fontWeight: "var(--font-weight-medium)",
  },
  stack: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
    gap: "0.5rem",
  },
  skeleton: {
    height: "2.75rem",
    width: "100%",
  },
});

export function UpcomingSection({
  competitionId,
  encounters,
  organizationId,
}: {
  readonly competitionId: string;
  readonly encounters: OverviewSlice<ListCompetitionEncountersResponse>;
  readonly organizationId: string;
}) {
  const { locale, t } = useI18n();
  const titleId = useId();
  const upcoming =
    encounters.status === "ready" ? upcomingEncounters(encounters.data.encounters) : [];
  const recentOfficial =
    encounters.status === "ready" && upcoming.length === 0
      ? recentOfficialEncounters(encounters.data.encounters)
      : [];
  const showingOfficial = upcoming.length === 0 && recentOfficial.length > 0;

  return (
    <OverviewCard
      action={
        encounters.status === "ready" && encounters.data.encounters.length > 0 ? (
          <TextLink
            className={styles.action}
            render={
              <Link
                params={{ orgId: organizationId, competitionId }}
                to="/orgs/$orgId/competitions/$competitionId/encounters"
              />
            }
            text="caption"
          >
            {t("competition.overview.upcoming.viewAll")}
            <ViewAllChevron />
          </TextLink>
        ) : null
      }
      title={t(
        showingOfficial
          ? "competition.overview.official.title"
          : "competition.overview.upcoming.title",
      )}
      titleId={titleId}
    >
      {encounters.status === "loading" ? (
        <div
          aria-busy="true"
          aria-label={t("encounters.list.loading")}
          role="status"
          {...applyStyles(styles.stack)}
        >
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} {...applyStyles(styles.skeleton)} />
          ))}
        </div>
      ) : null}
      {encounters.status === "error" ? (
        <RetryAlert
          message={t("competition.overview.upcoming.error")}
          retry={encounters.retry}
          t={t}
        />
      ) : null}
      {encounters.status === "ready" && upcoming.length === 0 && recentOfficial.length === 0 ? (
        <OverviewEmpty
          description={t("competition.overview.upcoming.empty.description")}
          title={t("competition.overview.upcoming.empty.title")}
        />
      ) : null}
      {encounters.status === "ready" && upcoming.length > 0 ? (
        <>
          <ol aria-labelledby={titleId} {...applyStyles(styles.list)}>
            {upcoming.map((encounter) => (
              <li key={encounter.encounterId} {...applyStyles(styles.rowItem)}>
                <UpcomingRow
                  competitionId={competitionId}
                  encounter={encounter}
                  locale={locale}
                  organizationId={organizationId}
                  timeZone={encounters.data.competition.timeZone}
                />
              </li>
            ))}
          </ol>
          <Caption as="p">
            {t("encounters.list.timeZone", { zone: encounters.data.competition.timeZone })}
          </Caption>
        </>
      ) : null}
      {encounters.status === "ready" && showingOfficial ? (
        <ol aria-labelledby={titleId} {...applyStyles(styles.list)}>
          {recentOfficial.map((encounter) => (
            <li key={encounter.encounterId} {...applyStyles(styles.rowItem)}>
              <OfficialEncounterRow
                competitionId={competitionId}
                encounter={encounter}
                locale={locale}
                organizationId={organizationId}
                timeZone={encounters.data.competition.timeZone}
              />
            </li>
          ))}
        </ol>
      ) : null}
    </OverviewCard>
  );
}

function UpcomingRow({
  competitionId,
  encounter,
  locale,
  organizationId,
  timeZone,
}: {
  readonly competitionId: string;
  readonly encounter: CompetitionEncounterDto;
  readonly locale: string;
  readonly organizationId: string;
  readonly timeZone: string;
}) {
  const { t } = useI18n();
  const kickoff = new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const round = encounter.round.total
    ? t("encounter.roundOf", { number: encounter.round.number, total: encounter.round.total })
    : t("encounter.round", { number: encounter.round.number });
  return (
    <Link
      aria-label={t("encounters.list.open", {
        home: encounter.home.name,
        away: encounter.away.name,
      })}
      params={{ orgId: organizationId, competitionId, encounterId: encounter.encounterId }}
      to="/orgs/$orgId/competitions/$competitionId/encounters/$encounterId"
      {...applyStyles(styles.row)}
    >
      <span {...applyStyles(styles.copy)}>
        <Text className={styles.truncate} tone="default" weight="semibold">
          {`${encounter.home.name} ${t("encounter.vs")} ${encounter.away.name}`}
        </Text>
        <Caption as="span">{round}</Caption>
      </span>
      <Caption as="span" className={styles.meta}>
        <time dateTime={encounter.scheduledStartAt}>
          {kickoff.format(new Date(encounter.scheduledStartAt))}
        </time>
      </Caption>
    </Link>
  );
}

function OfficialEncounterRow({
  competitionId,
  encounter,
  locale,
  organizationId,
  timeZone,
}: {
  readonly competitionId: string;
  readonly encounter: CompetitionEncounterDto;
  readonly locale: string;
  readonly organizationId: string;
  readonly timeZone: string;
}) {
  const { t } = useI18n();
  const dateLabel = new Intl.DateTimeFormat(locale, {
    timeZone,
    day: "numeric",
    month: "short",
  }).format(new Date(encounter.scheduledStartAt));
  const detailsId = useId();
  const round = encounter.round.total
    ? t("encounter.roundOf", { number: encounter.round.number, total: encounter.round.total })
    : t("encounter.round", { number: encounter.round.number });
  return (
    <Link
      aria-describedby={
        encounter.score ? `${detailsId}-meta ${detailsId}-score` : `${detailsId}-meta`
      }
      aria-label={t("encounters.list.open", {
        home: encounter.home.name,
        away: encounter.away.name,
      })}
      params={{ orgId: organizationId, competitionId, encounterId: encounter.encounterId }}
      to="/orgs/$orgId/competitions/$competitionId/encounters/$encounterId"
      {...applyStyles(styles.row)}
    >
      <span {...applyStyles(styles.copy)}>
        <Text className={styles.truncate} tone="default" weight="semibold">
          {`${encounter.home.name} ${t("encounter.vs")} ${encounter.away.name}`}
        </Text>
        <Caption as="span" id={`${detailsId}-meta`}>{`${round} · ${dateLabel}`}</Caption>
      </span>
      <span {...applyStyles(styles.officialEnd)}>
        {encounter.score ? (
          <EncounterScorePill
            id={`${detailsId}-score`}
            label={t("portal.encounter.score", { score: formatEncounterScore(encounter.score) })}
            score={encounter.score}
          />
        ) : null}
        <Badge variant="approved">{t("competition.overview.official.badge")}</Badge>
      </span>
    </Link>
  );
}
