import { applyStyles, Badge, Caption, Heading, SectionTitle, Text, typography } from "@futrob/ui";
import { fixtureRoundLabel, fixtureStageLabel } from "./competition-fixture-labels.ts";
import { dayOfMonth, formatDateKey, type DateKey } from "./fixture-calendar-dates.ts";
import {
  fixtureAgendaIndex,
  fixtureDayUniformContext,
  type FixtureCalendarDay,
} from "./fixture-calendar-model.ts";
import {
  fixtureDayMeta,
  fixtureEntryMeta,
  FixtureEncounterRow,
  type FixtureCalendarFormat,
  type FixtureCalendarScope,
} from "./fixture-calendar-parts.tsx";
import { styles } from "./fixture-calendar.styles.ts";

/**
 * Encounters grouped by local day with shared round/slot metadata lifted to each day heading,
 * aligned home-vs-away rows, and an interactive quick-jump index beside the list on wide screens.
 */
export function FixtureCalendarAgenda({
  days,
  format,
  nextDate,
  ...scope
}: FixtureCalendarScope & {
  readonly days: readonly FixtureCalendarDay[];
  readonly format: FixtureCalendarFormat;
  readonly nextDate: DateKey | null;
}) {
  const { t } = format;
  const indexGroups = fixtureAgendaIndex(days);
  return (
    <div {...applyStyles(styles.agendaLayout)}>
      <ol aria-label={t("fixture.agenda.label")} {...applyStyles(styles.dayList)}>
        {days.map((day) => {
          const headingId = `fixture-day-${day.date}`;
          const isNext = day.date === nextDate;
          const uniform = fixtureDayUniformContext(day.entries);
          const hasRowMeta = day.entries.some(
            (entry) => fixtureEntryMeta(entry, format, uniform).length > 0,
          );
          return (
            <li key={day.date}>
              <section aria-labelledby={headingId} {...applyStyles(styles.daySection)}>
                <div {...applyStyles(styles.dayHeading)}>
                  <div {...applyStyles(styles.dayHeadingMain)}>
                    <span
                      aria-hidden="true"
                      {...applyStyles(styles.dateStamp, isNext && styles.dateStampNext)}
                    >
                      <Text weight="bold">{dayOfMonth(day.date)}</Text>
                      <Caption
                        as="span"
                        className={styles.dateStampMonth}
                        tone={isNext ? "default" : "muted"}
                      >
                        {formatDateKey(day.date, format.locale, { month: "short" })}
                      </Caption>
                    </span>
                    <div {...applyStyles(styles.dayCopy)}>
                      <Heading as="h2" className={typography.title} id={headingId}>
                        {format.longDate(day.date)}
                      </Heading>
                      <Caption as="p">
                        {fixtureDayMeta(day.entries.length, uniform, format)}
                      </Caption>
                    </div>
                  </div>
                  {isNext ? <Badge variant="primary">{t("fixture.agenda.nextDate")}</Badge> : null}
                </div>
                <ol {...applyStyles(styles.rows)}>
                  {day.entries.map((entry) => (
                    <li key={entry.encounter.id} {...applyStyles(styles.rowItem)}>
                      <FixtureEncounterRow
                        entry={entry}
                        format={format}
                        hasMetaColumn={hasRowMeta}
                        uniform={uniform}
                        {...scope}
                      />
                    </li>
                  ))}
                </ol>
              </section>
            </li>
          );
        })}
      </ol>
      <aside aria-labelledby="fixture-agenda-jump" {...applyStyles(styles.aside)}>
        <SectionTitle as="h2" id="fixture-agenda-jump">
          {t("fixture.agenda.jumpTo")}
        </SectionTitle>
        <nav aria-label={t("fixture.agenda.jumpLabel")}>
          {indexGroups.map((group) => (
            <div key={group.key} {...applyStyles(styles.indexGroup)}>
              {format.showStage && group.stageKind ? (
                <Caption as="p" className={styles.indexStage}>
                  {fixtureStageLabel(group.stageKind, t)}
                </Caption>
              ) : null}
              <ol {...applyStyles(styles.indexList)}>
                {group.items.map((item) => {
                  const isNext = item.date === nextDate;
                  const label = item.roundName
                    ? fixtureRoundLabel(item.roundName, t)
                    : format.shortDate(item.date);
                  const trailing = item.roundName
                    ? format.compactDate(item.date)
                    : String(item.count);
                  return (
                    <li key={item.date}>
                      <a
                        href={`#fixture-day-${item.date}`}
                        {...applyStyles(styles.indexLink, isNext && styles.indexLinkNext)}
                      >
                        <span>{label}</span>
                        <span {...applyStyles(styles.indexDate, isNext && styles.indexDateNext)}>
                          {trailing}
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </nav>
      </aside>
    </div>
  );
}
