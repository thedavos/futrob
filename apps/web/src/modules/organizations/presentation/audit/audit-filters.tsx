"use client";

import { useId, useState } from "react";
import { CalendarDotsIcon, XIcon } from "@phosphor-icons/react";
import type { ListOrganizationAuditQuery, OrganizationAuditEntryDto } from "@futrob/api-contracts";
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  Separator,
} from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { auditActionGroups, auditActionLabel } from "./audit-labels.ts";
import { styles } from "./audit.styles.ts";

export type AuditFilters = Pick<
  ListOrganizationAuditQuery,
  "competitionId" | "actorId" | "action" | "from" | "to"
>;

export type AuditFilterOption = {
  readonly id: string;
  readonly label: string;
};

const ALL_VALUE = "__all__";

export function hasAuditFilters(filters: AuditFilters, competitionId?: string): boolean {
  return Boolean(
    (!competitionId && filters.competitionId) ||
    filters.actorId ||
    filters.action ||
    filters.from ||
    filters.to,
  );
}

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

export function AuditFilterForm({
  filters,
  competitionId,
  entries,
  actorOptions = [],
  competitionOptions = [],
  onApply,
}: {
  readonly filters: AuditFilters;
  readonly competitionId?: string;
  readonly entries: readonly OrganizationAuditEntryDto[];
  readonly actorOptions?: readonly AuditFilterOption[];
  readonly competitionOptions?: readonly AuditFilterOption[];
  readonly onApply: (filters: AuditFilters) => void;
}) {
  const { t, locale } = useI18n();
  const id = useId();
  const [dateOpen, setDateOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(filters.from?.slice(0, 10) ?? "");
  const [draftTo, setDraftTo] = useState(filters.to?.slice(0, 10) ?? "");
  const [rangeError, setRangeError] = useState(false);

  const actorMap = new Map<string, string>();
  for (const option of actorOptions) {
    actorMap.set(option.id, option.label);
  }
  for (const entry of entries) {
    if (entry.actorId && !actorMap.has(entry.actorId)) {
      actorMap.set(entry.actorId, entry.actorName ?? entry.actorId);
    }
  }
  if (filters.actorId && !actorMap.has(filters.actorId)) {
    actorMap.set(filters.actorId, filters.actorId);
  }

  const competitionMap = new Map<string, string>();
  for (const option of competitionOptions) {
    competitionMap.set(option.id, option.label);
  }
  for (const entry of entries) {
    if (entry.competitionId && !competitionMap.has(entry.competitionId)) {
      competitionMap.set(entry.competitionId, entry.competitionId);
    }
  }
  if (!competitionId && filters.competitionId && !competitionMap.has(filters.competitionId)) {
    competitionMap.set(filters.competitionId, filters.competitionId);
  }

  const extraActions = [
    ...entries.map((entry) => entry.action),
    ...(filters.action ? [filters.action] : []),
  ];
  const actionGroups = auditActionGroups(t, {
    competitionScoped: Boolean(competitionId),
    extraActions,
  });

  const actionSelectItems = [
    { value: ALL_VALUE, label: t("audit.filter.allActions") },
    ...actionGroups.flatMap((group) => group.items),
  ];
  const actorSelectItems = [
    { value: ALL_VALUE, label: t("audit.filter.allActors") },
    ...[...actorMap].map(([value, label]) => ({ value, label })),
  ];
  const competitionSelectItems = [
    { value: ALL_VALUE, label: t("audit.filter.allCompetitions") },
    ...[...competitionMap].map(([value, label]) => ({ value, label })),
  ];

  const active = hasAuditFilters(filters, competitionId);
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
    <form
      aria-label={t("audit.filter.label")}
      onSubmit={(event) => event.preventDefault()}
      {...applyStyles(styles.toolbar)}
    >
      {!competitionId ? (
        <div {...applyStyles(styles.selectField)}>
          <Select
            items={competitionSelectItems}
            onValueChange={(value) => {
              const nextCompetition = !value || value === ALL_VALUE ? undefined : value;
              onApply({ ...filters, competitionId: nextCompetition });
            }}
            value={filters.competitionId ?? ALL_VALUE}
          >
            <SelectTrigger aria-label={t("audit.filter.competition")} dense>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={styles.selectContent}>
              {competitionSelectItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div {...applyStyles(styles.selectField)}>
        <Select
          items={actionSelectItems}
          onValueChange={(value) => {
            const nextAction = !value || value === ALL_VALUE ? undefined : value;
            onApply({ ...filters, action: nextAction });
          }}
          value={filters.action ?? ALL_VALUE}
        >
          <SelectTrigger aria-label={t("audit.filter.action")} dense>
            <SelectValue>
              {filters.action ? auditActionLabel(filters.action, t) : t("audit.filter.allActions")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className={styles.selectContent}>
            <SelectItem value={ALL_VALUE}>{t("audit.filter.allActions")}</SelectItem>
            {actionGroups.map((group) => (
              <SelectGroup key={group.category}>
                <SelectSeparator />
                <SelectLabel>{group.label}</SelectLabel>
                {group.items.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div {...applyStyles(styles.selectField)}>
        <Select
          items={actorSelectItems}
          onValueChange={(value) => {
            const nextActor = !value || value === ALL_VALUE ? undefined : value;
            onApply({ ...filters, actorId: nextActor });
          }}
          value={filters.actorId ?? ALL_VALUE}
        >
          <SelectTrigger aria-label={t("audit.filter.actor")} dense>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={styles.selectContent}>
            {actorSelectItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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

      {active ? (
        <Button
          dense
          onClick={() => {
            setRangeError(false);
            setDateOpen(false);
            onApply({});
          }}
          type="button"
          variant="ghost"
        >
          <XIcon aria-hidden="true" size={14} />
          {t("audit.filter.clear")}
        </Button>
      ) : null}
    </form>
  );
}
