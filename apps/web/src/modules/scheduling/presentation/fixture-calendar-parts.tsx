import { Link } from "@tanstack/react-router";
import { CaretRightIcon } from "@phosphor-icons/react";
import { applyStyles, Badge, Caption, Text } from "@futrob/ui";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import {
  fixtureRoundLabel,
  fixtureSideLabel,
  fixtureStageLabel,
} from "./competition-fixture-labels.ts";
import type { FixtureSide } from "./competition-fixture-view.ts";
import { formatDateKey } from "./fixture-calendar-dates.ts";
import type { FixtureCalendarEntry, FixtureDayUniformContext } from "./fixture-calendar-model.ts";
import { roundStyles } from "./fixture-calendar-rounds.styles.ts";
import { styles } from "./fixture-calendar.styles.ts";

export type FixtureCalendarScope = {
  readonly organizationId: string;
  readonly competitionId: string;
};

/** Formatting shared by every view: one locale and the competition's time zone. */
export type FixtureCalendarFormat = {
  readonly locale: string;
  readonly t: Translator;
  readonly time: (iso: string) => string;
  readonly longDate: (date: string) => string;
  readonly shortDate: (date: string) => string;
  readonly compactDate: (date: string) => string;
  /** Stage names only help when the fixture has more than one stage. */
  readonly showStage: boolean;
};

export function fixtureCalendarFormat(
  locale: string,
  timeZone: string,
  t: Translator,
  stageCount: number,
): FixtureCalendarFormat {
  const time = new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  });
  return {
    locale,
    t,
    time: (iso) => time.format(new Date(iso)),
    longDate: (date) =>
      formatDateKey(date, locale, { weekday: "long", day: "numeric", month: "long" }),
    shortDate: (date) =>
      formatDateKey(date, locale, { weekday: "short", day: "numeric", month: "short" }),
    compactDate: (date) => formatDateKey(date, locale, { day: "numeric", month: "short" }),
    showStage: stageCount > 1,
  };
}

/** Shared day-level summary lifted to the day heading: «Liga · Jornada 1 · 3 enfrentamientos · 1 partido». */
export function fixtureDayMeta(
  count: number,
  uniform: FixtureDayUniformContext,
  format: FixtureCalendarFormat,
): string {
  const { t } = format;
  return [
    format.showStage && uniform.stageKind ? fixtureStageLabel(uniform.stageKind, t) : null,
    uniform.roundName ? fixtureRoundLabel(uniform.roundName, t) : null,
    t("fixture.encounters", { count }),
    uniform.officialMatchCount ? t("fixture.slots", { count: uniform.officialMatchCount }) : null,
  ]
    .filter((part): part is string => part !== null)
    .join(" · ");
}

/**
 * Row metadata trimmed to what is NOT already stated by the day heading (`uniform`).
 * Without `uniform`, returns the complete «Grupos · Jornada 1 · Grupo A · 2 partidos» string.
 */
export function fixtureEntryMeta(
  entry: FixtureCalendarEntry,
  format: FixtureCalendarFormat,
  uniform?: FixtureDayUniformContext,
): string {
  const { t } = format;
  const includeStage = format.showStage && (!uniform || uniform.stageKind === null);
  const includeRound = !uniform || uniform.roundName === null;
  const includeSlots = !uniform || uniform.officialMatchCount === null;
  return [
    includeStage ? fixtureStageLabel(entry.stageKind, t) : null,
    includeRound ? fixtureRoundLabel(entry.roundName, t) : null,
    entry.encounter.group ? t("fixture.group", { group: entry.encounter.group }) : null,
    includeSlots ? t("fixture.slots", { count: entry.encounter.officialMatchCount }) : null,
  ]
    .filter((part): part is string => part !== null)
    .join(" · ");
}

function isOpenSide(side: FixtureSide): boolean {
  return side.kind !== "team" || side.name === null;
}

type LinkProps = FixtureCalendarScope & {
  readonly entry: FixtureCalendarEntry;
  readonly format: FixtureCalendarFormat;
};

function encounterLinkProps({ competitionId, entry, format, organizationId }: LinkProps) {
  const { t } = format;
  const home = fixtureSideLabel(entry.encounter.home, t);
  const away = fixtureSideLabel(entry.encounter.away, t);
  const time = format.time(entry.encounter.scheduledStartAt);
  return {
    home,
    away,
    time,
    homeOpen: isOpenSide(entry.encounter.home),
    awayOpen: isOpenSide(entry.encounter.away),
    label: t("fixture.openAt", {
      home,
      away,
      date: `${format.longDate(entry.date)}, ${time}`,
    }),
    params: { orgId: organizationId, competitionId, encounterId: entry.encounter.id },
  };
}

/**
 * An Encounter row: kickoff time, aligned home vs away matchup, optional non-uniform
 * metadata and navigation chevron. `compact` is used in the month day-detail panel.
 */
export function FixtureEncounterRow({
  compact = false,
  hasMetaColumn = false,
  uniform,
  ...props
}: LinkProps & {
  readonly compact?: boolean;
  readonly hasMetaColumn?: boolean;
  readonly uniform?: FixtureDayUniformContext;
}) {
  const { away, awayOpen, home, homeOpen, label, params, time } = encounterLinkProps(props);
  const { t } = props.format;
  const meta = fixtureEntryMeta(props.entry, props.format, uniform);
  const showMetaColumn = !compact && hasMetaColumn;

  if (compact) {
    return (
      <Link
        aria-label={label}
        params={params}
        to="/orgs/$orgId/competitions/$competitionId/encounters/$encounterId"
        {...applyStyles(styles.row, styles.rowCompact)}
      >
        <span {...applyStyles(styles.rowMain)}>
          <span {...applyStyles(styles.compactMeta)}>
            <Caption as="span" tone="default">
              <time dateTime={props.entry.encounter.scheduledStartAt}>{time}</time>
            </Caption>
            {meta ? <Caption as="span">· {meta}</Caption> : null}
          </span>
          <span {...applyStyles(styles.matchupCompact)}>
            <Text
              className={styles.side}
              tone={homeOpen ? "muted" : "default"}
              weight={homeOpen ? "medium" : "semibold"}
            >
              {home}
            </Text>
            <Caption as="span" className={styles.versusInline}>
              {t("encounter.vs")}
            </Caption>
            <Text
              className={styles.side}
              tone={awayOpen ? "muted" : "default"}
              weight={awayOpen ? "medium" : "semibold"}
            >
              {away}
            </Text>
          </span>
        </span>
        <CaretRightIcon aria-hidden="true" {...applyStyles(styles.chevron)} />
      </Link>
    );
  }

  return (
    <Link
      aria-label={label}
      params={params}
      to="/orgs/$orgId/competitions/$competitionId/encounters/$encounterId"
      {...applyStyles(styles.row, showMetaColumn && styles.rowWithMeta)}
    >
      <Text className={styles.rowTime} weight="semibold">
        <time dateTime={props.entry.encounter.scheduledStartAt}>{time}</time>
      </Text>
      <span {...applyStyles(styles.rowMain)}>
        <span {...applyStyles(styles.matchup)}>
          <Text
            className={styles.sideHome}
            tone={homeOpen ? "muted" : "default"}
            weight={homeOpen ? "medium" : "semibold"}
          >
            {home}
          </Text>
          <span aria-hidden="true" {...applyStyles(styles.versusPill)}>
            {t("encounter.vs")}
          </span>
          <Text
            className={styles.sideAway}
            tone={awayOpen ? "muted" : "default"}
            weight={awayOpen ? "medium" : "semibold"}
          >
            {away}
          </Text>
        </span>
        {meta ? (
          <Caption as="span" className={styles.rowMetaMobile}>
            {meta}
          </Caption>
        ) : null}
      </span>
      {showMetaColumn ? (
        <span {...applyStyles(styles.rowMetaDesktop)}>
          {meta ? <Badge variant="neutral">{meta}</Badge> : null}
        </span>
      ) : null}
      <CaretRightIcon aria-hidden="true" {...applyStyles(styles.chevron)} />
    </Link>
  );
}

/**
 * An Encounter inside a round column: omits the repeated day when the entire round falls on
 * one date (`singleDay`), and carries a right chevron so navigation is immediately legible.
 */
export function FixtureBoardMatch({
  singleDay = false,
  ...props
}: LinkProps & { readonly singleDay?: boolean }) {
  const { away, awayOpen, home, homeOpen, label, params, time } = encounterLinkProps(props);
  const { entry, format } = props;
  const { t } = format;
  const detail = [
    entry.encounter.group ? t("fixture.group", { group: entry.encounter.group }) : null,
    t("fixture.slots", { count: entry.encounter.officialMatchCount }),
  ]
    .filter((part): part is string => part !== null)
    .join(" · ");

  return (
    <Link
      aria-label={label}
      params={params}
      to="/orgs/$orgId/competitions/$competitionId/encounters/$encounterId"
      {...applyStyles(roundStyles.boardMatch)}
    >
      <span {...applyStyles(roundStyles.boardMatchMain)}>
        <span {...applyStyles(roundStyles.boardMeta)}>
          <Caption as="span">
            {singleDay ? (
              <time dateTime={entry.encounter.scheduledStartAt}>{time}</time>
            ) : (
              <>
                {format.shortDate(entry.date)} ·{" "}
                <time dateTime={entry.encounter.scheduledStartAt}>{time}</time>
              </>
            )}
          </Caption>
          <Caption as="span">{detail}</Caption>
        </span>
        <span {...applyStyles(roundStyles.boardSides)}>
          <Text
            className={styles.side}
            tone={homeOpen ? "muted" : "default"}
            weight={homeOpen ? "medium" : "semibold"}
          >
            {home}
          </Text>
          <Text
            className={styles.side}
            tone={awayOpen ? "muted" : "default"}
            weight={awayOpen ? "medium" : "semibold"}
          >
            {away}
          </Text>
        </span>
      </span>
      <CaretRightIcon aria-hidden="true" {...applyStyles(styles.chevron)} />
    </Link>
  );
}
