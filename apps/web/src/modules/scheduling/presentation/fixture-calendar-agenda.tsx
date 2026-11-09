import {
  applyStyles,
  Badge,
  Caption,
  Heading,
  MetaItem,
  MetaList,
  MetaTerm,
  MetaValue,
  SectionTitle,
  Text,
  typography,
} from "@futrob/ui";
import { dayOfMonth, formatDateKey, type DateKey } from "./fixture-calendar-dates.ts";
import type { FixtureCalendarDay } from "./fixture-calendar-model.ts";
import {
  FixtureEncounterRow,
  type FixtureCalendarFormat,
  type FixtureCalendarScope,
} from "./fixture-calendar-parts.tsx";
import { styles } from "./fixture-calendar.styles.ts";

/** Encounters by local day, next date marked. Every row opens its Encounter. */
export function FixtureCalendarAgenda({
  days,
  format,
  nextDate,
  timeZone,
  ...scope
}: FixtureCalendarScope & {
  readonly days: readonly FixtureCalendarDay[];
  readonly format: FixtureCalendarFormat;
  readonly nextDate: DateKey | null;
  readonly timeZone: string;
}) {
  const { t } = format;
  const encounterCount = days.reduce((total, day) => total + day.entries.length, 0);
  return (
    <div {...applyStyles(styles.agendaLayout)}>
      <ol aria-label={t("fixture.agenda.label")} {...applyStyles(styles.dayList)}>
        {days.map((day) => {
          const headingId = `fixture-day-${day.date}`;
          const isNext = day.date === nextDate;
          return (
            <li key={day.date}>
              <section aria-labelledby={headingId}>
                <div {...applyStyles(styles.dayHeading)}>
                  <span
                    aria-hidden="true"
                    {...applyStyles(styles.dateStamp, isNext && styles.dateStampNext)}
                  >
                    <Text weight="bold">{dayOfMonth(day.date)}</Text>
                    <Caption as="span" tone={isNext ? "default" : "muted"}>
                      {formatDateKey(day.date, format.locale, { month: "short" })}
                    </Caption>
                  </span>
                  <div {...applyStyles(styles.dayCopy)}>
                    <Heading as="h2" className={typography.title} id={headingId}>
                      {format.longDate(day.date)}
                    </Heading>
                    <Caption as="p">
                      {t("fixture.encounters", { count: day.entries.length })}
                    </Caption>
                  </div>
                  {isNext ? <Badge variant="primary">{t("fixture.agenda.nextDate")}</Badge> : null}
                </div>
                <ol {...applyStyles(styles.rows)}>
                  {day.entries.map((entry) => (
                    <li key={entry.encounter.id} {...applyStyles(styles.rowItem)}>
                      <FixtureEncounterRow entry={entry} format={format} {...scope} />
                    </li>
                  ))}
                </ol>
              </section>
            </li>
          );
        })}
      </ol>
      <aside aria-labelledby="fixture-agenda-overview" {...applyStyles(styles.aside)}>
        <SectionTitle as="h2" id="fixture-agenda-overview">
          {t("fixture.agenda.overview")}
        </SectionTitle>
        <MetaList>
          <MetaItem>
            <MetaTerm>{t("fixture.agenda.nextDate")}</MetaTerm>
            <MetaValue>
              {nextDate ? format.longDate(nextDate) : t("fixture.agenda.noNextDate")}
            </MetaValue>
          </MetaItem>
          <MetaItem>
            <MetaTerm>{t("fixture.agenda.encounters")}</MetaTerm>
            <MetaValue>{encounterCount}</MetaValue>
          </MetaItem>
          <MetaItem>
            <MetaTerm>{t("fixture.agenda.dates")}</MetaTerm>
            <MetaValue>{days.length}</MetaValue>
          </MetaItem>
          <MetaItem>
            <MetaTerm>{t("fixture.agenda.timeZone")}</MetaTerm>
            <MetaValue>{timeZone}</MetaValue>
          </MetaItem>
        </MetaList>
      </aside>
    </div>
  );
}
