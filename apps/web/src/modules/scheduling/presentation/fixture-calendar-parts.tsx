import { Link } from "@tanstack/react-router";
import { CaretRightIcon } from "@phosphor-icons/react";
import { applyStyles, Caption, Text } from "@futrob/ui";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import {
  fixtureRoundLabel,
  fixtureSideLabel,
  fixtureStageLabel,
} from "./competition-fixture-labels.ts";
import { formatDateKey } from "./fixture-calendar-dates.ts";
import type { FixtureCalendarEntry } from "./fixture-calendar-model.ts";
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
    showStage: stageCount > 1,
  };
}

/** «Grupos · Jornada 1 · Grupo A · 2 partidos», trimmed to what the fixture says. */
export function fixtureEntryMeta(
  entry: FixtureCalendarEntry,
  format: FixtureCalendarFormat,
): string {
  const { t } = format;
  return [
    format.showStage ? fixtureStageLabel(entry.stageKind, t) : null,
    fixtureRoundLabel(entry.roundName, t),
    entry.encounter.group ? t("fixture.group", { group: entry.encounter.group }) : null,
    t("fixture.slots", { count: entry.encounter.officialMatchCount }),
  ]
    .filter((part): part is string => part !== null)
    .join(" · ");
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
    label: t("fixture.openAt", {
      home,
      away,
      date: `${format.longDate(entry.date)}, ${time}`,
    }),
    params: { orgId: organizationId, competitionId, encounterId: entry.encounter.id },
  };
}

/** An Encounter row: time, sides and round. `compact` moves the time above the sides. */
export function FixtureEncounterRow({
  compact = false,
  ...props
}: LinkProps & { readonly compact?: boolean }) {
  const { home, away, time, label, params } = encounterLinkProps(props);
  const { t } = props.format;
  return (
    <Link
      aria-label={label}
      params={params}
      to="/orgs/$orgId/competitions/$competitionId/encounters/$encounterId"
      {...applyStyles(styles.row, compact && styles.rowCompact)}
    >
      {compact ? null : (
        <Text className={styles.rowTime} weight="semibold">
          <time dateTime={props.entry.encounter.scheduledStartAt}>{time}</time>
        </Text>
      )}
      <span {...applyStyles(styles.rowMain)}>
        {compact ? (
          <Caption as="span">
            <time dateTime={props.entry.encounter.scheduledStartAt}>{time}</time>
          </Caption>
        ) : null}
        <span {...applyStyles(styles.pair, compact && styles.pairStacked)}>
          <Text className={styles.side} weight="semibold">
            {home}
          </Text>
          <Caption as="span" className={compact ? styles.versusHidden : styles.versus}>
            {t("encounter.vs")}
          </Caption>
          <Text className={styles.side} weight="semibold">
            {away}
          </Text>
        </span>
        <Caption as="span">{fixtureEntryMeta(props.entry, props.format)}</Caption>
      </span>
      <CaretRightIcon aria-hidden="true" {...applyStyles(styles.chevron)} />
    </Link>
  );
}

/** An Encounter inside a round column: day and time first, then each side on its line. */
export function FixtureBoardMatch(props: LinkProps) {
  const { home, away, time, label, params } = encounterLinkProps(props);
  const { entry, format } = props;
  const { t } = format;
  return (
    <Link
      aria-label={label}
      params={params}
      to="/orgs/$orgId/competitions/$competitionId/encounters/$encounterId"
      {...applyStyles(styles.boardMatch)}
    >
      <span {...applyStyles(styles.boardMeta)}>
        <Caption as="span">{format.shortDate(entry.date)}</Caption>
        <Caption as="span">
          <time dateTime={entry.encounter.scheduledStartAt}>{time}</time>
        </Caption>
      </span>
      <Text className={styles.side} weight="semibold">
        {home}
      </Text>
      <Text className={styles.side} weight="semibold">
        {away}
      </Text>
      <Caption as="span">
        {[
          entry.encounter.group ? t("fixture.group", { group: entry.encounter.group }) : null,
          t("fixture.slots", { count: entry.encounter.officialMatchCount }),
        ]
          .filter((part): part is string => part !== null)
          .join(" · ")}
      </Caption>
    </Link>
  );
}
