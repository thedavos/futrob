import { useState } from "react";
import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  Button,
  Field,
  FieldError,
  FieldLabel,
  Input,
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@futrob/ui";
import { CalendarBlankIcon } from "@phosphor-icons/react";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import {
  calendarRangeToInstantPeriod,
  parseCalendarDate,
  type PlayerStatisticsCalendarRange,
} from "./player-statistics-period.ts";

const styles = stylex.create({
  root: {
    marginInlineStart: "auto",
    flexShrink: 0,
  },
  trigger: {
    flexShrink: 0,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  fields: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
    gap: "0.75rem",
  },
});

export function PlayerProfilePeriodFilter({
  dateFormat,
  onApply,
  range,
  t,
}: {
  readonly dateFormat: Intl.DateTimeFormat;
  readonly onApply: (next: PlayerStatisticsCalendarRange) => void;
  readonly range: PlayerStatisticsCalendarRange;
  readonly t: Translator;
}) {
  const [draft, setDraft] = useState(range);
  const [open, setOpen] = useState(false);
  const invalid = calendarRangeToInstantPeriod(draft) === null;
  const summary = t("player.statistics.period.summary", {
    from: formatCalendarDate(range.from, dateFormat),
    to: formatCalendarDate(range.to, dateFormat),
  });

  return (
    <div {...applyStyles(styles.root)}>
      <Popover
        onOpenChange={(next) => {
          setOpen(next);
          if (next) setDraft(range);
        }}
        open={open}
      >
        <PopoverTrigger
          aria-label={t("player.statistics.period.label")}
          render={<Button dense variant="outline" {...applyStyles(styles.trigger)} />}
        >
          <CalendarBlankIcon aria-hidden data-icon="inline-start" size={16} weight="regular" />
          {summary}
        </PopoverTrigger>
        <PopoverContent align="end">
          <form
            {...applyStyles(styles.form)}
            onSubmit={(event) => {
              event.preventDefault();
              if (invalid) return;
              onApply(draft);
              setOpen(false);
            }}
          >
            <PopoverTitle>{t("player.statistics.period.label")}</PopoverTitle>
            <div {...applyStyles(styles.fields)}>
              <Field>
                <FieldLabel htmlFor="player-statistics-from">
                  {t("player.statistics.period.from")}
                </FieldLabel>
                <Input
                  dense
                  id="player-statistics-from"
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, from: event.target.value }))
                  }
                  type="date"
                  value={draft.from}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="player-statistics-to">
                  {t("player.statistics.period.to")}
                </FieldLabel>
                <Input
                  dense
                  id="player-statistics-to"
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, to: event.target.value }))
                  }
                  type="date"
                  value={draft.to}
                />
              </Field>
            </div>
            {invalid ? (
              <Field>
                <FieldError>{t("player.statistics.period.invalid")}</FieldError>
              </Field>
            ) : null}
            <Button disabled={invalid} type="submit">
              {t("player.statistics.period.apply")}
            </Button>
          </form>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function formatCalendarDate(value: string, dateFormat: Intl.DateTimeFormat): string {
  const parsed = parseCalendarDate(value);
  return parsed ? dateFormat.format(parsed) : value;
}
