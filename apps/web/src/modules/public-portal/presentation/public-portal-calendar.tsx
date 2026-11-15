import { useId, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { PublicCalendarEntryDto, PublicEncounterStatusDto } from "@futrob/api-contracts";
import { applyStyles, Badge, Caption, Heading, Score, Text, TextLink } from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { ParameterlessMessageKey } from "@/shared/presentation/i18n/catalogs.ts";
import {
  calendarRounds,
  kickoffLabel,
  latestResults,
  scoreLabel,
  upcomingEntries,
  type PortalRef,
} from "./public-portal-model.ts";
import { PortalEmpty } from "./public-portal-states.tsx";
import { styles } from "./public-portal.styles.ts";

const COVER_LIMIT = 3;

const STATUS_LABELS = {
  scheduled: "portal.encounter.status.scheduled",
  awaiting_result: "portal.encounter.status.awaiting_result",
  official: "portal.encounter.status.official",
} as const satisfies Record<PublicEncounterStatusDto, ParameterlessMessageKey>;

export interface PortalCalendar {
  readonly timeZone: string;
  readonly entries: readonly PublicCalendarEntryDto[];
}

function EncounterRow({
  entry,
  timeZone,
}: {
  readonly entry: PublicCalendarEntryDto;
  readonly timeZone: string;
}) {
  const { locale, t } = useI18n();
  const score = entry.score ? scoreLabel(entry.score) : null;
  return (
    <li {...applyStyles(styles.listItem)}>
      <article
        aria-label={t("portal.encounter.label", {
          home: entry.homeTeamName,
          away: entry.awayTeamName,
        })}
        {...applyStyles(styles.encounter)}
      >
        <Caption className={styles.encounterWhen}>
          <time dateTime={entry.scheduledStartAt}>
            {kickoffLabel(entry.scheduledStartAt, timeZone, locale)}
          </time>
        </Caption>
        <p {...applyStyles(styles.encounterTeams)}>
          <Text weight="semibold">{entry.homeTeamName}</Text>
          <Caption as="span">{t("portal.encounter.versus")}</Caption>
          <Text weight="semibold">{entry.awayTeamName}</Text>
        </p>
        <div {...applyStyles(styles.encounterSide)}>
          {score ? (
            <Score aria-label={t("portal.encounter.score", { score })} as="span" size="table">
              {score}
            </Score>
          ) : null}
          <Badge variant={entry.status === "official" ? "approved" : "outline"}>
            {t(STATUS_LABELS[entry.status])}
          </Badge>
        </div>
      </article>
    </li>
  );
}

function EncounterList({
  entries,
  timeZone,
}: {
  readonly entries: readonly PublicCalendarEntryDto[];
  readonly timeZone: string;
}) {
  return (
    <ul {...applyStyles(styles.list)}>
      {entries.map((entry) => (
        <EncounterRow
          entry={entry}
          key={`${entry.roundNumber}:${entry.scheduledStartAt}:${entry.homeTeamName}:${entry.awayTeamName}`}
          timeZone={timeZone}
        />
      ))}
    </ul>
  );
}

export function PortalNoFixture() {
  const { t } = useI18n();
  return (
    <PortalEmpty
      description={t("portal.noFixture.description")}
      title={t("portal.noFixture.title")}
    />
  );
}

/** Calendar and results together: one list per round, official scores in place. */
export function PortalCalendarView({ calendar }: { readonly calendar: PortalCalendar }) {
  const { t } = useI18n();
  if (calendar.entries.length === 0) return <PortalNoFixture />;
  return (
    <div {...applyStyles(styles.rounds)}>
      {calendarRounds(calendar.entries).map((round) => (
        <RoundSection
          key={round.roundNumber}
          title={t("portal.calendar.round", { round: round.roundNumber })}
        >
          <EncounterList entries={round.entries} timeZone={calendar.timeZone} />
        </RoundSection>
      ))}
    </div>
  );
}

function RoundSection({
  children,
  title,
}: {
  readonly children: ReactNode;
  readonly title: string;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} {...applyStyles(styles.section)}>
      <Heading as="h2" id={headingId}>
        {title}
      </Heading>
      {children}
    </section>
  );
}

/** The cover's live block: what is next and what was just officialized. */
export function PortalCoverView({
  calendar,
  portalRef,
}: {
  readonly calendar: PortalCalendar;
  readonly portalRef: PortalRef;
}) {
  const { t } = useI18n();
  if (calendar.entries.length === 0) return <PortalNoFixture />;
  const upcoming = upcomingEntries(calendar.entries, COVER_LIMIT);
  const results = latestResults(calendar.entries, COVER_LIMIT);
  return (
    <>
      <div {...applyStyles(styles.columns)}>
        <RoundSection title={t("portal.cover.results")}>
          {results.length > 0 ? (
            <EncounterList entries={results} timeZone={calendar.timeZone} />
          ) : (
            <Caption as="p">{t("portal.cover.results.empty")}</Caption>
          )}
        </RoundSection>
        <RoundSection title={t("portal.cover.upcoming")}>
          {upcoming.length > 0 ? (
            <EncounterList entries={upcoming} timeZone={calendar.timeZone} />
          ) : (
            <Caption as="p">{t("portal.cover.upcoming.empty")}</Caption>
          )}
        </RoundSection>
      </div>
      <p>
        <TextLink
          render={<Link params={portalRef} to="/$organizationSlug/$competitionKey/calendar" />}
        >
          {t("portal.cover.calendarLink")}
        </TextLink>
      </p>
    </>
  );
}
