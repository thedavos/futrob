import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { applyStyles, Button, Caption, Heading, Text } from "@futrob/ui";
import {
  dayOfMonth,
  formatMonthKey,
  monthOf,
  monthWeeks,
  shiftMonth,
  weekdayNames,
  type DateKey,
  type MonthKey,
} from "./fixture-calendar-dates.ts";
import { adjacentFixtureMonth, type FixtureCalendarDay } from "./fixture-calendar-model.ts";
import {
  FixtureEncounterRow,
  type FixtureCalendarFormat,
  type FixtureCalendarScope,
} from "./fixture-calendar-parts.tsx";
import { fixtureSideLabel } from "./competition-fixture-labels.ts";
import { monthStyles } from "./fixture-calendar-month.styles.ts";
import { styles } from "./fixture-calendar.styles.ts";

/** Kickoffs a day cell can show before it summarizes the rest. */
const CELL_EVENTS = 2;

/**
 * A month grid with the selected day's Encounters beside it. Only days with Encounters
 * are buttons, so the keyboard visits dates that hold something.
 */
export function FixtureCalendarMonth({
  days,
  format,
  month,
  nextDate,
  onMonthChange,
  onSelectDay,
  selectedDay,
  timeZone,
  today,
  ...scope
}: FixtureCalendarScope & {
  readonly days: readonly FixtureCalendarDay[];
  readonly format: FixtureCalendarFormat;
  readonly month: MonthKey;
  readonly nextDate: DateKey | null;
  readonly onMonthChange: (month: MonthKey) => void;
  readonly onSelectDay: (day: DateKey) => void;
  readonly selectedDay: DateKey | null;
  readonly timeZone: string;
  readonly today: DateKey;
}) {
  const { locale, t } = format;
  const byDate = new Map(days.map((day) => [day.date, day]));
  const selected = selectedDay ? byDate.get(selectedDay) : undefined;
  const titleId = "fixture-month-title";
  const previous = adjacentFixtureMonth(days, month, "previous");
  const next = adjacentFixtureMonth(days, month, "next");
  const weekdays = weekdayNames(locale, "short");
  return (
    <section aria-labelledby={titleId}>
      <div {...applyStyles(monthStyles.monthToolbar)}>
        <Heading as="h2" className={monthStyles.monthTitle} id={titleId}>
          {formatMonthKey(month, locale)}
        </Heading>
        <Button
          aria-label={t("fixture.month.previous")}
          onClick={() => onMonthChange(shiftMonth(month, -1))}
          size="icon"
          variant="outline"
        >
          <CaretLeftIcon aria-hidden="true" />
        </Button>
        {nextDate ? (
          <Button
            onClick={() => {
              onMonthChange(monthOf(nextDate));
              onSelectDay(nextDate);
            }}
            variant="outline"
          >
            {t("fixture.month.goToNext")}
          </Button>
        ) : null}
        <Button
          aria-label={t("fixture.month.next")}
          onClick={() => onMonthChange(shiftMonth(month, 1))}
          size="icon"
          variant="outline"
        >
          <CaretRightIcon aria-hidden="true" />
        </Button>
      </div>
      <div {...applyStyles(monthStyles.monthLayout)}>
        <div>
          <div aria-hidden="true" {...applyStyles(monthStyles.weekdayRow)}>
            {weekdays.map((weekday) => (
              <Caption as="span" className={monthStyles.weekday} key={weekday}>
                {weekday}
              </Caption>
            ))}
          </div>
          <ol aria-label={t("fixture.month.label")} {...applyStyles(monthStyles.monthGrid)}>
            {monthWeeks(month).flatMap((week, weekIndex) =>
              week.map((date, dayIndex) => {
                const key = date ?? `outside-${weekIndex}-${dayIndex}`;
                if (!date) {
                  return (
                    <li
                      aria-hidden="true"
                      key={key}
                      {...applyStyles(monthStyles.cell, monthStyles.cellOutside)}
                    />
                  );
                }
                const day = byDate.get(date);
                const number = (
                  <span
                    {...applyStyles(
                      monthStyles.dayNumber,
                      date === today && monthStyles.dayNumberToday,
                    )}
                  >
                    {dayOfMonth(date)}
                  </span>
                );
                if (!day) {
                  return (
                    <li key={key} {...applyStyles(monthStyles.cell)}>
                      <Caption as="span" className={monthStyles.dayStatic}>
                        {number}
                      </Caption>
                    </li>
                  );
                }
                const hidden = day.entries.length - CELL_EVENTS;
                return (
                  <li key={key} {...applyStyles(monthStyles.cell)}>
                    <button
                      aria-label={t("fixture.month.day", {
                        date: format.longDate(date),
                        count: day.entries.length,
                      })}
                      aria-pressed={date === selectedDay}
                      onClick={() => onSelectDay(date)}
                      type="button"
                      {...applyStyles(
                        monthStyles.day,
                        date === selectedDay && monthStyles.daySelected,
                      )}
                    >
                      <Caption as="span" tone="default">
                        {number}
                      </Caption>
                      {day.entries.slice(0, CELL_EVENTS).map((entry) => (
                        <Caption
                          as="span"
                          className={monthStyles.event}
                          key={entry.encounter.id}
                          tone="default"
                        >
                          {format.time(entry.encounter.scheduledStartAt)}
                          <br />
                          {fixtureSideLabel(entry.encounter.home, t)} ·{" "}
                          {fixtureSideLabel(entry.encounter.away, t)}
                        </Caption>
                      ))}
                      {hidden > 0 ? (
                        <Caption as="span">{t("fixture.month.more", { count: hidden })}</Caption>
                      ) : null}
                    </button>
                  </li>
                );
              }),
            )}
          </ol>
          {days.some((day) => monthOf(day.date) === month) ? null : (
            <div {...applyStyles(monthStyles.emptyMonth)}>
              <Text tone="muted">{t("fixture.month.emptyMonth")}</Text>
              {[previous, next].map((target) =>
                target ? (
                  <Button key={target} onClick={() => onMonthChange(target)} variant="ghost">
                    {t("fixture.month.goTo", { month: formatMonthKey(target, locale) })}
                  </Button>
                ) : null,
              )}
            </div>
          )}
        </div>
        {selectedDay ? (
          <section aria-labelledby="fixture-selected-day" {...applyStyles(monthStyles.dayDetail)}>
            <Caption as="p">{t("fixture.month.selectedDay")}</Caption>
            <Heading as="h3" id="fixture-selected-day">
              {format.longDate(selectedDay)}
            </Heading>
            <Caption as="p">
              {t("fixture.encounters", { count: selected?.entries.length ?? 0 })} · {timeZone}
            </Caption>
            {selected ? (
              <ol {...applyStyles(styles.rows, monthStyles.dayDetailRows)}>
                {selected.entries.map((entry) => (
                  <li key={entry.encounter.id} {...applyStyles(styles.rowItem)}>
                    <FixtureEncounterRow compact entry={entry} format={format} {...scope} />
                  </li>
                ))}
              </ol>
            ) : (
              <Text tone="muted">{t("fixture.month.emptyDay")}</Text>
            )}
          </section>
        ) : null}
      </div>
    </section>
  );
}
