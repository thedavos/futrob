"use client";

import { useId, type ComponentProps } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarBlankIcon, CaretRightIcon, ClockIcon, SealCheckIcon } from "@phosphor-icons/react";
import type { CompetitionEncounterDto, CompetitionEncounterStatusDto } from "@futrob/api-contracts";
import { applyStyles, Badge, Caption, Heading, Text, typography, vis, type Icon } from "@futrob/ui";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";

import { encounterRoundLabel } from "./competition-encounters-labels.ts";
import {
  encounterScoreView,
  type EncounterRoundGroup,
  type EncounterScoreView,
} from "./competition-encounters-model.ts";
import { styles } from "./competition-encounters-page.styles.ts";
import type { EncounterDetailSearch } from "./encounter-list-return.ts";

const STATUS = {
  scheduled: { variant: "neutral", icon: CalendarBlankIcon },
  awaiting_result: { variant: "warning", icon: ClockIcon },
  official: { variant: "approved", icon: SealCheckIcon },
} as const satisfies Record<
  CompetitionEncounterStatusDto,
  { readonly variant: ComponentProps<typeof Badge>["variant"]; readonly icon: Icon }
>;

type Scope = { readonly organizationId: string; readonly competitionId: string };

/** The Match Center search that brings the user back to this list as they left it. */
type ReturnSearch = { readonly returnSearch: EncounterDetailSearch };

export function RoundGroupSection({
  competitionId,
  group,
  organizationId,
  rangeDateFormat,
  returnSearch,
  shortDateFormat,
  shortDateTimeFormat,
  t,
  timeFormat,
  withStage,
}: Scope &
  ReturnSearch & {
    readonly group: EncounterRoundGroup;
    readonly rangeDateFormat: Intl.DateTimeFormat;
    readonly shortDateFormat: Intl.DateTimeFormat;
    readonly shortDateTimeFormat: Intl.DateTimeFormat;
    readonly t: Translator;
    readonly timeFormat: Intl.DateTimeFormat;
    /** Rounds of several stages share numbers, so headings name the stage. */
    readonly withStage: boolean;
  }) {
  const headingId = useId();
  const roundLabel = encounterRoundLabel(group.round, withStage, t);

  const dateLabel = group.spansMultipleDays
    ? rangeDateFormat.formatRange(new Date(group.firstKickoffIso), new Date(group.lastKickoffIso))
    : shortDateFormat.format(new Date(group.firstKickoffIso));

  const total = group.encounters.length;
  const allOfficial = group.officialCount === total;
  const hasAwaiting = group.awaitingCount > 0;
  const progressLabel = allOfficial
    ? t("encounters.list.roundProgress.official", { official: group.officialCount, total })
    : hasAwaiting
      ? t("encounters.list.roundProgress.attention", {
          awaiting: group.awaitingCount,
          official: group.officialCount,
          total,
        })
      : group.officialCount > 0
        ? t("encounters.list.roundProgress.partial", { official: group.officialCount, total })
        : t("encounters.list.roundProgress.scheduled");

  return (
    <section aria-labelledby={headingId} {...applyStyles(styles.roundSection)}>
      <div {...applyStyles(styles.roundHeader)}>
        <div {...applyStyles(styles.roundHeadingGroup)}>
          <Heading as="h2" className={typography.title} id={headingId}>
            {roundLabel}
          </Heading>
          <Caption as="span" className={styles.roundDate}>
            {dateLabel}
          </Caption>
        </div>
        <Caption
          as="p"
          className={
            allOfficial
              ? styles.roundProgressDone
              : hasAwaiting
                ? styles.roundProgressAttention
                : styles.roundProgress
          }
        >
          {progressLabel}
        </Caption>
      </div>

      <div {...applyStyles(styles.roundCard)}>
        <ol aria-labelledby={headingId} {...applyStyles(styles.list)}>
          {group.encounters.map((encounter) => (
            <li key={encounter.encounterId} {...applyStyles(styles.listItem)}>
              <EncounterRow
                competitionId={competitionId}
                encounter={encounter}
                organizationId={organizationId}
                returnSearch={returnSearch}
                roundLabel={roundLabel}
                shortDateTimeFormat={shortDateTimeFormat}
                showDateInRow={group.spansMultipleDays}
                t={t}
                timeFormat={timeFormat}
              />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function EncounterRow({
  competitionId,
  encounter,
  organizationId,
  returnSearch,
  roundLabel,
  shortDateTimeFormat,
  showDateInRow,
  t,
  timeFormat,
}: Scope &
  ReturnSearch & {
    readonly encounter: CompetitionEncounterDto;
    readonly roundLabel: string;
    readonly shortDateTimeFormat: Intl.DateTimeFormat;
    readonly showDateInRow: boolean;
    readonly t: Translator;
    readonly timeFormat: Intl.DateTimeFormat;
  }) {
  const { variant, icon: StatusIcon } = STATUS[encounter.status];
  const detailsId = useId();
  const score = encounterScoreView(encounter);
  const kickoffDate = new Date(encounter.scheduledStartAt);
  const kickoffVisible = showDateInRow
    ? shortDateTimeFormat.format(kickoffDate)
    : timeFormat.format(kickoffDate);
  const kickoffFull = shortDateTimeFormat.format(kickoffDate);
  const homeTrailing =
    (score?.kind === "single" || score?.kind === "aggregate") && score.leader === "away";
  const awayTrailing =
    (score?.kind === "single" || score?.kind === "aggregate") && score.leader === "home";
  const slotsLabel = t("encounters.list.slots", { count: encounter.officialMatchCount });
  const scoreLabel = score ? scoreAccessibleLabel(score, t) : null;

  return (
    <Link
      aria-describedby={[
        `${detailsId}-meta`,
        scoreLabel ? `${detailsId}-score` : null,
        `${detailsId}-status`,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={t("encounters.list.open", {
        home: encounter.home.name,
        away: encounter.away.name,
      })}
      params={{ orgId: organizationId, competitionId, encounterId: encounter.encounterId }}
      search={returnSearch}
      to="/orgs/$orgId/competitions/$competitionId/encounters/$encounterId"
      {...applyStyles(styles.row)}
    >
      <div id={`${detailsId}-meta`} {...applyStyles(styles.timeCol)}>
        <span {...applyStyles(vis.srOnly)}>{roundLabel}</span>
        <Text className={styles.timePrimary} tone="muted" weight="semibold">
          <time dateTime={encounter.scheduledStartAt} title={kickoffFull}>
            {kickoffVisible}
          </time>
        </Text>
        {encounter.officialMatchCount > 1 ? (
          <Caption as="span" className={styles.slotsCaption}>
            {slotsLabel}
          </Caption>
        ) : (
          <span {...applyStyles(vis.srOnly)}>{slotsLabel}</span>
        )}
      </div>

      <div {...applyStyles(styles.matchup)}>
        <Text
          className={styles.home}
          tone={homeTrailing ? "muted" : "default"}
          weight={homeTrailing ? "medium" : "semibold"}
        >
          {encounter.home.name}
        </Text>
        <ScoreCenter encounterStatus={encounter.status} score={score} t={t} />
        {scoreLabel ? (
          <span id={`${detailsId}-score`} {...applyStyles(vis.srOnly)}>
            {scoreLabel}
          </span>
        ) : null}
        <Text
          className={styles.away}
          tone={awayTrailing ? "muted" : "default"}
          weight={awayTrailing ? "medium" : "semibold"}
        >
          {encounter.away.name}
        </Text>
      </div>

      <div id={`${detailsId}-status`} {...applyStyles(styles.statusWrap)}>
        <Badge variant={variant}>
          <StatusIcon aria-hidden="true" />
          {t(`encounters.list.status.${encounter.status}`)}
        </Badge>
      </div>

      <CaretRightIcon aria-hidden="true" {...applyStyles(styles.chevron)} />
    </Link>
  );
}

const legsText = (legs: readonly { homeGoals: number; awayGoals: number }[]) =>
  legs.map((leg) => `${leg.homeGoals}–${leg.awayGoals}`).join(" · ");

/** The official score as the row's description reads it, since the link name replaces its text. */
function scoreAccessibleLabel(score: EncounterScoreView, t: Translator): string {
  switch (score.kind) {
    case "single":
      return t("encounters.list.score.singleAria", {
        home: score.homeGoals,
        away: score.awayGoals,
      });
    case "aggregate":
      return t("encounters.list.score.aggregateAria", {
        home: score.aggregateHome,
        away: score.aggregateAway,
        legs: legsText(score.legs),
      });
    case "independent":
      return t("encounters.list.score.seriesAria", { legs: legsText(score.legs) });
    default: {
      const exhaustive: never = score;
      return exhaustive;
    }
  }
}

/** Visual score only: the row's description carries the spoken one. */
function ScoreCenter({
  encounterStatus,
  score,
  t,
}: {
  readonly encounterStatus: CompetitionEncounterStatusDto;
  readonly score: EncounterScoreView | null;
  readonly t: Translator;
}) {
  if (score?.kind === "single") {
    return (
      <div aria-hidden="true" {...applyStyles(styles.scoreCenter)}>
        <span {...applyStyles(styles.scorePill)}>
          <span {...applyStyles(score.leader === "home" && styles.scoreLeader)}>
            {score.homeGoals}
          </span>
          <span aria-hidden="true" {...applyStyles(styles.scoreSeparator)}>
            –
          </span>
          <span {...applyStyles(score.leader === "away" && styles.scoreLeader)}>
            {score.awayGoals}
          </span>
        </span>
      </div>
    );
  }

  if (score?.kind === "aggregate") {
    return (
      <div aria-hidden="true" {...applyStyles(styles.scoreCenter)}>
        <span {...applyStyles(styles.scorePill)}>
          <span {...applyStyles(score.leader === "home" && styles.scoreLeader)}>
            {score.aggregateHome}
          </span>
          <span aria-hidden="true" {...applyStyles(styles.scoreSeparator)}>
            –
          </span>
          <span {...applyStyles(score.leader === "away" && styles.scoreLeader)}>
            {score.aggregateAway}
          </span>
        </span>
        <Caption as="span" className={styles.scoreSubLabel}>
          {t("encounters.list.score.aggregateMeta", { legs: legsText(score.legs) })}
        </Caption>
      </div>
    );
  }

  if (score?.kind === "independent") {
    return (
      <div aria-hidden="true" {...applyStyles(styles.scoreCenter)}>
        <span {...applyStyles(styles.scorePill)}>
          {score.legs.map((leg, index) => {
            const legLeader =
              leg.homeGoals > leg.awayGoals
                ? "home"
                : leg.awayGoals > leg.homeGoals
                  ? "away"
                  : "draw";
            return (
              <span key={index}>
                {index > 0 ? (
                  <span aria-hidden="true" {...applyStyles(styles.scoreSeparator)}>
                    {" · "}
                  </span>
                ) : null}
                <span {...applyStyles(legLeader === "home" && styles.scoreLeader)}>
                  {leg.homeGoals}
                </span>
                <span aria-hidden="true" {...applyStyles(styles.scoreSeparator)}>
                  –
                </span>
                <span {...applyStyles(legLeader === "away" && styles.scoreLeader)}>
                  {leg.awayGoals}
                </span>
              </span>
            );
          })}
        </span>
      </div>
    );
  }

  if (encounterStatus === "awaiting_result") {
    return (
      <div {...applyStyles(styles.scoreCenter)}>
        <span aria-hidden="true" {...applyStyles(styles.scorePending)}>
          – : –
        </span>
      </div>
    );
  }

  return (
    <div {...applyStyles(styles.scoreCenter)}>
      <span aria-hidden="true" {...applyStyles(styles.vs)}>
        {t("encounter.vs")}
      </span>
    </div>
  );
}
