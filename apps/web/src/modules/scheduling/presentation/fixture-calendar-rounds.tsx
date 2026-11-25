import { applyStyles, Badge, Caption, Heading } from "@futrob/ui";
import { fixtureRoundLabel, fixtureStageLabel } from "./competition-fixture-labels.ts";
import { dateKeyInstant, formatDateKey } from "./fixture-calendar-dates.ts";
import type { FixtureRoundBoard, FixtureRoundColumn } from "./fixture-calendar-model.ts";
import {
  FixtureBoardMatch,
  type FixtureCalendarFormat,
  type FixtureCalendarScope,
} from "./fixture-calendar-parts.tsx";
import { roundStyles } from "./fixture-calendar-rounds.styles.ts";

/**
 * Rounds side by side in bounded flat columns, one board per stage. Wide screens scroll
 * the columns inside their own region; narrow screens stack them.
 */
export function FixtureCalendarRounds({
  boards,
  currentRoundId,
  format,
  ...scope
}: FixtureCalendarScope & {
  readonly boards: readonly FixtureRoundBoard[];
  readonly currentRoundId: string | null;
  readonly format: FixtureCalendarFormat;
}) {
  const { t } = format;
  return (
    <div {...applyStyles(roundStyles.board)}>
      {boards.map((board) => {
        const headingId = `fixture-board-${board.stageId}`;
        const stage = fixtureStageLabel(board.stageKind, t);
        return (
          <section
            aria-labelledby={headingId}
            key={board.stageId}
            {...applyStyles(roundStyles.stage)}
          >
            <div {...applyStyles(roundStyles.stageHead)}>
              <Heading as="h2" id={headingId}>
                {stage}
              </Heading>
              <Badge variant="neutral">
                {t("fixture.rounds.count", { count: board.columns.length })}
              </Badge>
            </div>
            {/* Scrollable on wide screens, so it must take keyboard focus to scroll. */}
            {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
            <div
              aria-label={t("fixture.rounds.scroll", { stage })}
              role="region"
              tabIndex={0}
              {...applyStyles(roundStyles.columnsScroller)}
            >
              <ol {...applyStyles(roundStyles.columns)}>
                {board.columns.map((column) => (
                  <RoundColumn
                    column={column}
                    current={column.id === currentRoundId}
                    format={format}
                    key={column.id}
                    {...scope}
                  />
                ))}
              </ol>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function RoundColumn({
  column,
  current,
  format,
  ...scope
}: FixtureCalendarScope & {
  readonly column: FixtureRoundColumn;
  readonly current: boolean;
  readonly format: FixtureCalendarFormat;
}) {
  const { t } = format;
  const singleDay = column.firstDate !== null && column.firstDate === column.lastDate;
  return (
    <li {...applyStyles(roundStyles.column)}>
      <div {...applyStyles(roundStyles.columnHead, current && roundStyles.columnHeadCurrent)}>
        <div {...applyStyles(roundStyles.columnCopy)}>
          <Heading as="h3">{fixtureRoundLabel(column.name, t)}</Heading>
          <Caption as="p">
            {[
              column.firstDate ? dateRange(column.firstDate, column.lastDate, format.locale) : null,
              t("fixture.encounters", { count: column.entries.length }),
            ]
              .filter((part): part is string => part !== null)
              .join(" · ")}
          </Caption>
        </div>
        {current ? <Badge variant="primary">{t("fixture.rounds.current")}</Badge> : null}
      </div>
      {column.entries.length > 0 ? (
        <ol {...applyStyles(roundStyles.columnRows)}>
          {column.entries.map((entry, index) => (
            <li
              key={entry.encounter.id}
              {...applyStyles(
                roundStyles.columnRowItem,
                index === column.entries.length - 1 && roundStyles.columnRowItemLast,
              )}
            >
              <FixtureBoardMatch entry={entry} format={format} singleDay={singleDay} {...scope} />
            </li>
          ))}
        </ol>
      ) : (
        <Caption as="p" className={roundStyles.emptyRound}>
          {t("fixture.rounds.emptyRound")}
        </Caption>
      )}
    </li>
  );
}

/** «12–19 oct» or «12 oct» when the round fits in one day. */
function dateRange(first: string, last: string | null, locale: string): string {
  if (!last || last === first) {
    return formatDateKey(first, locale, { day: "numeric", month: "short" });
  }
  const format = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  return format.formatRange(dateKeyInstant(first), dateKeyInstant(last));
}
