"use client";

import { useId, useState } from "react";
import { CalendarDotsIcon } from "@phosphor-icons/react";
import { daysFromNow } from "@futrob/shared-kernel";
import {
  applyStyles,
  Button,
  Caption,
  Field,
  FieldError,
  FieldLabel,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Separator,
} from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import type { AuditFilters } from "./audit-filters.tsx";
import { styles } from "./audit.styles.ts";

function utcDayString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatDayShort(day: string, locale: string): string {
  const parsed = new Date(`${day}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return day;
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

function dateSummaryLabel(filters: AuditFilters, locale: string, t: Translator): string {
  const fromDay = filters.from?.slice(0, 10);
  const toDay = filters.to?.slice(0, 10);
  if (!fromDay && !toDay) return t("audit.filter.dates");
  const today = utcDayString(new Date());
  if (fromDay === today && toDay === today) return t("audit.filter.presetToday");
  if (fromDay === utcDayString(daysFromNow(-6)) && toDay === today) {
    return t("audit.filter.presetLast7");
  }
  if (fromDay === utcDayString(daysFromNow(-29)) && toDay === today) {
    return t("audit.filter.presetLast30");
  }
  if (fromDay && toDay) {
    return t("audit.filter.dateRangeSummary", {
      from: formatDayShort(fromDay, locale),
      to: formatDayShort(toDay, locale),
    });
  }
  if (fromDay) {
    return t("audit.filter.dateFromSummary", { from: formatDayShort(fromDay, locale) });
  }
  return t("audit.filter.dateToSummary", { to: formatDayShort(toDay!, locale) });
}

export function AuditDateFilter({
  filters,
  onApply,
}: {
  readonly filters: AuditFilters;
  readonly onApply: (filters: AuditFilters) => void;
}) {
  const { t, locale } = useI18n();
  const id = useId();
  const [dateOpen, setDateOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(filters.from?.slice(0, 10) ?? "");
  const [draftTo, setDraftTo] = useState(filters.to?.slice(0, 10) ?? "");
  const [rangeError, setRangeError] = useState(false);
  const hasDateFilter = Boolean(filters.from || filters.to);

  function applyPreset(daysBack: number) {
    const today = utcDayString(new Date());
    const fromDay = utcDayString(daysFromNow(-daysBack));
    setDraftFrom(fromDay);
    setDraftTo(today);
    setRangeError(false);
    setDateOpen(false);
    onApply({
      ...filters,
      from: `${fromDay}T00:00:00.000Z`,
      to: `${today}T23:59:59.999Z`,
    });
  }

  function applyDateRange() {
    if (draftFrom && draftTo && draftFrom > draftTo) {
      setRangeError(true);
      return;
    }
    setRangeError(false);
    setDateOpen(false);
    onApply({
      ...filters,
      from: draftFrom ? `${draftFrom}T00:00:00.000Z` : undefined,
      to: draftTo ? `${draftTo}T23:59:59.999Z` : undefined,
    });
  }

  function clearDates() {
    setDraftFrom("");
    setDraftTo("");
    setRangeError(false);
    setDateOpen(false);
    onApply({ ...filters, from: undefined, to: undefined });
  }

  return (
    <Popover
      open={dateOpen}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setDraftFrom(filters.from?.slice(0, 10) ?? "");
          setDraftTo(filters.to?.slice(0, 10) ?? "");
          setRangeError(false);
        }
        setDateOpen(nextOpen);
      }}
    >
      <PopoverTrigger
        render={
          <Button
            aria-label={t("audit.filter.dates")}
            className={hasDateFilter ? styles.dateTriggerActive : styles.dateTrigger}
            dense
            type="button"
            variant="outline"
          />
        }
      >
        <CalendarDotsIcon aria-hidden="true" size={16} />
        <span>{dateSummaryLabel(filters, locale, t)}</span>
      </PopoverTrigger>
      <PopoverContent align="start" className={styles.datePopover}>
        <div {...applyStyles(styles.presetRow)}>
          <Button dense onClick={() => applyPreset(0)} type="button" variant="secondary">
            {t("audit.filter.presetToday")}
          </Button>
          <Button dense onClick={() => applyPreset(6)} type="button" variant="secondary">
            {t("audit.filter.presetLast7")}
          </Button>
          <Button dense onClick={() => applyPreset(29)} type="button" variant="secondary">
            {t("audit.filter.presetLast30")}
          </Button>
        </div>
        <Separator />
        <div {...applyStyles(styles.dateFields)}>
          <Caption>{t("audit.filter.customRange")}</Caption>
          <Field>
            <FieldLabel htmlFor={`${id}-from`}>{t("audit.filter.from")}</FieldLabel>
            <Input
              dense
              id={`${id}-from`}
              name="from"
              onChange={(event) => {
                setDraftFrom(event.target.value);
                setRangeError(false);
              }}
              type="date"
              value={draftFrom}
            />
          </Field>
          <Field invalid={rangeError}>
            <FieldLabel htmlFor={`${id}-to`}>{t("audit.filter.to")}</FieldLabel>
            <Input
              aria-invalid={rangeError}
              dense
              id={`${id}-to`}
              name="to"
              onChange={(event) => {
                setDraftTo(event.target.value);
                setRangeError(false);
              }}
              type="date"
              value={draftTo}
            />
            {rangeError ? <FieldError match>{t("audit.filter.rangeError")}</FieldError> : null}
          </Field>
        </div>
        <div {...applyStyles(styles.datePopoverActions)}>
          <Button
            dense
            disabled={!draftFrom && !draftTo && !hasDateFilter}
            onClick={clearDates}
            type="button"
            variant="ghost"
          >
            {t("audit.filter.clearDates")}
          </Button>
          <Button dense onClick={applyDateRange} type="button" variant="secondary">
            {t("audit.filter.applyRange")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
