"use client";

import { useId, useState } from "react";
import type { ListOrganizationAuditQuery, OrganizationAuditEntryDto } from "@futrob/api-contracts";
import {
  applyStyles,
  Button,
  Field,
  FieldError,
  FieldLabel,
  Input,
  readFormString,
} from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { auditActionLabel } from "./audit-labels.ts";
import { styles } from "./audit.styles.ts";

export type AuditFilters = Pick<
  ListOrganizationAuditQuery,
  "competitionId" | "actorId" | "action" | "from" | "to"
>;

export function hasAuditFilters(filters: AuditFilters, competitionId?: string): boolean {
  return Boolean(
    (!competitionId && filters.competitionId) ||
    filters.actorId ||
    filters.action ||
    filters.from ||
    filters.to,
  );
}

export function AuditFilterForm({
  filters,
  competitionId,
  entries,
  onApply,
}: {
  readonly filters: AuditFilters;
  readonly competitionId?: string;
  readonly entries: readonly OrganizationAuditEntryDto[];
  readonly onApply: (filters: AuditFilters) => void;
}) {
  const { t } = useI18n();
  const id = useId();
  const [error, setError] = useState(false);
  const actors = new Map(
    entries.flatMap((entry) =>
      entry.actorId ? [[entry.actorId, entry.actorName ?? entry.actorId] as const] : [],
    ),
  );
  const competitions = [
    ...new Set(entries.flatMap((entry) => (entry.competitionId ? [entry.competitionId] : []))),
  ];
  const actions = [...new Set(entries.map((entry) => entry.action))];
  return (
    <form
      aria-label={t("audit.filter.label")}
      {...applyStyles(styles.filters)}
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const value = (name: string) => readFormString(form.get(name)).trim();
        const from = value("from");
        const to = value("to");
        if (from && to && from > to) {
          setError(true);
          return;
        }
        setError(false);
        onApply({
          competitionId: competitionId ? undefined : value("competitionId") || undefined,
          actorId: value("actorId") || undefined,
          action: value("action") || undefined,
          from: from ? `${from}T00:00:00.000Z` : undefined,
          to: to ? `${to}T23:59:59.999Z` : undefined,
        });
      }}
    >
      {!competitionId ? (
        <Field>
          <FieldLabel htmlFor={`${id}-competition`}>{t("audit.filter.competition")}</FieldLabel>
          <Input
            id={`${id}-competition`}
            name="competitionId"
            defaultValue={filters.competitionId ?? ""}
            list={`${id}-competitions`}
            maxLength={200}
          />
          <datalist id={`${id}-competitions`}>
            {competitions.map((value) => (
              <option key={value} value={value} />
            ))}
          </datalist>
        </Field>
      ) : null}
      <Field>
        <FieldLabel htmlFor={`${id}-actor`}>{t("audit.filter.actor")}</FieldLabel>
        <Input
          id={`${id}-actor`}
          name="actorId"
          defaultValue={filters.actorId ?? ""}
          list={`${id}-actors`}
          maxLength={200}
        />
        <datalist id={`${id}-actors`}>
          {[...actors].map(([value, label]) => (
            <option key={value} value={value} label={label} />
          ))}
        </datalist>
      </Field>
      <Field>
        <FieldLabel htmlFor={`${id}-action`}>{t("audit.filter.action")}</FieldLabel>
        <Input
          id={`${id}-action`}
          name="action"
          defaultValue={filters.action ?? ""}
          list={`${id}-actions`}
          maxLength={100}
        />
        <datalist id={`${id}-actions`}>
          {actions.map((value) => (
            <option key={value} value={value} label={auditActionLabel(value, t)} />
          ))}
        </datalist>
      </Field>
      <Field>
        <FieldLabel htmlFor={`${id}-from`}>{t("audit.filter.from")}</FieldLabel>
        <Input
          id={`${id}-from`}
          name="from"
          type="date"
          defaultValue={filters.from?.slice(0, 10) ?? ""}
        />
      </Field>
      <Field invalid={error}>
        <FieldLabel htmlFor={`${id}-to`}>{t("audit.filter.to")}</FieldLabel>
        <Input
          id={`${id}-to`}
          name="to"
          type="date"
          defaultValue={filters.to?.slice(0, 10) ?? ""}
          aria-invalid={error}
        />
        {error ? <FieldError match>{t("audit.filter.rangeError")}</FieldError> : null}
      </Field>
      <div {...applyStyles(styles.filterActions)}>
        <Button type="submit">{t("audit.filter.apply")}</Button>
        <Button
          type="reset"
          variant="outline"
          onClick={() => {
            setError(false);
            onApply({});
          }}
        >
          {t("audit.filter.clear")}
        </Button>
      </div>
    </form>
  );
}
