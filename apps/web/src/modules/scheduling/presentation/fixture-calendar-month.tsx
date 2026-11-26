import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { useRef } from "react";
import {
  applyStyles,
  Button,
  Caption,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Heading,
  Text,
} from "@futrob/ui";
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
import {
  adjacentFixtureMonth,
  fixtureDayUniformContext,
  type FixtureCalendarDay,
} from "./fixture-calendar-model.ts";
import {
  fixtureDayMeta,
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
 * A month grid whose days open their Encounters in a dialog. Only days with Encounters
 * are buttons, so the keyboard visits dates that hold something. The open day lives in
 * search (`day`), so Back from an Encounter reopens it.
 */
export function FixtureCalendarMonth({
  days,
  format,
  month,
  nextDate,
  onCloseDay,
  onMonthChange,
  onSelectDay,
  openDay,
  selectedDay,
  timeZone,
  today,
  ...scope
}: FixtureCalendarScope & {
  readonly days: readonly FixtureCalendarDay[];
  readonly format: FixtureCalendarFormat;
  readonly month: MonthKey;
  readonly nextDate: DateKey | null;
  readonly onCloseDay: () => void;
  readonly onMonthChange: (month: MonthKey) => void;
  readonly onSelectDay: (day: DateKey) => void;
  /** The day whose dialog is open, if any. */
  readonly openDay: DateKey | null;
  /** The highlighted day: the open one, or the month's next date. */
  readonly selectedDay: DateKey | null;
  readonly timeZone: string;
  readonly today: DateKey;
}) {
  const { locale, t } = format;
  const byDate = new Map(days.map((day) => [day.date, day]));
  const grid = useRef<HTMLOListElement>(null);
  const opened = openDay ? byDate.get(openDay) : undefined;
  const openedUniform = opened ? fixtureDayUniformContext(opened.entries) : undefined;
  const titleId = "fixture-month-title";
  const previous = adjacentFixtureMonth(days, month, "previous");
  const next = adjacentFixtureMonth(days, month, "next");
  const weekdays = weekdayNames(locale, "short");
  const weeks = monthWeeks(month);
  const activeDatesInMonth = days.filter((day) => monthOf(day.date) === month).length;

  return (
    <section aria-labelledby={titleId}>
      <div {...applyStyles(monthStyles.monthToolbar)}>
        <div {...applyStyles(monthStyles.monthHeading)}>
          <Heading as="h2" id={titleId}>
            {formatMonthKey(month, locale)}
          </Heading>
          {activeDatesInMonth > 0 ? (
            <Caption as="p">
              {t("fixture.month.activeDates", { count: activeDatesInMonth })}
            </Caption>
          ) : null}
        </div>
        <div {...applyStyles(monthStyles.monthActions)}>
          <Button
            aria-label={t("fixture.month.previous")}
            dense
            onClick={() => onMonthChange(shiftMonth(month, -1))}
            size="icon"
            variant="outline"
          >
            <CaretLeftIcon aria-hidden="true" />
          </Button>
          {nextDate ? (
            <Button dense onClick={() => onMonthChange(monthOf(nextDate))} variant="outline">
              {t("fixture.month.goToNext")}
            </Button>
          ) : null}
          <Button
            aria-label={t("fixture.month.next")}
            dense
            onClick={() => onMonthChange(shiftMonth(month, 1))}
            size="icon"
            variant="outline"
          >
            <CaretRightIcon aria-hidden="true" />
          </Button>
        </div>
      </div>
      <div {...applyStyles(monthStyles.calendarFrame)}>
        <div aria-hidden="true" {...applyStyles(monthStyles.weekdayRow)}>
          {weekdays.map((weekday) => (
            <Caption as="span" className={monthStyles.weekday} key={weekday}>
              {weekday}
            </Caption>
          ))}
        </div>
        <ol
          aria-label={t("fixture.month.label")}
          ref={grid}
          {...applyStyles(monthStyles.monthGrid)}
        >
          {weeks.flatMap((week, weekIndex) => {
            const isLastRow = weekIndex === weeks.length - 1;
            return week.map((date, dayIndex) => {
              const isLastCol = dayIndex === 6;
              const key = date ?? `outside-${weekIndex}-${dayIndex}`;
              const cellTokens = [
                monthStyles.cell,
                isLastCol && monthStyles.cellLastCol,
                isLastRow && monthStyles.cellLastRow,
              ];
              if (!date) {
                return (
                  <li
                    aria-hidden="true"
                    key={key}
                    {...applyStyles(...cellTokens, monthStyles.cellOutside)}
                  />
                );
              }
              const day = byDate.get(date);
              const isSelected = date === selectedDay;
              const isToday = date === today;
              const number = (
                <span
                  {...applyStyles(
                    monthStyles.dayNumber,
                    isToday && monthStyles.dayNumberToday,
                    !isToday && isSelected && monthStyles.dayNumberSelected,
                  )}
                >
                  {dayOfMonth(date)}
                </span>
              );
              if (!day) {
                return (
                  <li key={key} {...applyStyles(...cellTokens)}>
                    <Caption as="span" className={monthStyles.dayStatic}>
                      {number}
                    </Caption>
                  </li>
                );
              }
              const hidden = day.entries.length - CELL_EVENTS;
              return (
                <li key={key} {...applyStyles(...cellTokens)}>
                  <button
                    aria-label={t("fixture.month.day", {
                      date: format.longDate(date),
                      count: day.entries.length,
                    })}
                    aria-haspopup="dialog"
                    aria-pressed={isSelected}
                    data-fixture-day={date}
                    onClick={() => onSelectDay(date)}
                    type="button"
                    {...applyStyles(monthStyles.day, isSelected && monthStyles.daySelected)}
                  >
                    <span {...applyStyles(monthStyles.dayHeader)}>
                      <Caption as="span" tone="default">
                        {number}
                      </Caption>
                      <Caption
                        as="span"
                        className={isSelected ? monthStyles.dayCountSelected : monthStyles.dayCount}
                      >
                        {day.entries.length}
                      </Caption>
                    </span>
                    {day.entries.slice(0, CELL_EVENTS).map((entry) => (
                      <span
                        key={entry.encounter.id}
                        {...applyStyles(monthStyles.event, isSelected && monthStyles.eventSelected)}
                      >
                        <Caption as="span" className={monthStyles.eventTime}>
                          {format.time(entry.encounter.scheduledStartAt)}
                        </Caption>
                        <Caption as="span" className={monthStyles.eventTeams} tone="default">
                          {fixtureSideLabel(entry.encounter.home, t)} ·{" "}
                          {fixtureSideLabel(entry.encounter.away, t)}
                        </Caption>
                      </span>
                    ))}
                    {hidden > 0 ? (
                      <Caption
                        as="span"
                        className={isSelected ? monthStyles.moreSelected : undefined}
                      >
                        {t("fixture.month.more", { count: hidden })}
                      </Caption>
                    ) : null}
                  </button>
                </li>
              );
            });
          })}
        </ol>
      </div>
      {activeDatesInMonth > 0 ? null : (
        <div {...applyStyles(monthStyles.emptyMonth)}>
          <Text tone="muted">{t("fixture.month.emptyMonth")}</Text>
          {[previous, next].map((target) =>
            target ? (
              <Button dense key={target} onClick={() => onMonthChange(target)} variant="ghost">
                {t("fixture.month.goTo", { month: formatMonthKey(target, locale) })}
              </Button>
            ) : null,
          )}
        </div>
      )}
      <Dialog
        onOpenChange={(open) => {
          if (!open) onCloseDay();
        }}
        open={opened !== undefined}
      >
        {opened && openedUniform ? (
          <DialogContent
            className={monthStyles.dayDialog}
            closeLabel={t("common.close")}
            // A day reopened from search (a link, or Back from an Encounter) has no trigger
            // to return to, so closing focuses that day's button in the grid.
            finalFocus={() =>
              grid.current?.querySelector<HTMLElement>(`[data-fixture-day="${opened.date}"]`) ??
              true
            }
          >
            <DialogHeader>
              <DialogTitle>{format.longDate(opened.date)}</DialogTitle>
              <DialogDescription>
                {`${fixtureDayMeta(opened.entries.length, openedUniform, format)} · ${timeZone}`}
              </DialogDescription>
            </DialogHeader>
            <ol {...applyStyles(styles.rows, monthStyles.dayDialogRows)}>
              {opened.entries.map((entry) => (
                <li key={entry.encounter.id} {...applyStyles(styles.rowItem)}>
                  <FixtureEncounterRow
                    compact
                    entry={entry}
                    format={format}
                    uniform={openedUniform}
                    {...scope}
                  />
                </li>
              ))}
            </ol>
          </DialogContent>
        ) : null}
      </Dialog>
    </section>
  );
}
