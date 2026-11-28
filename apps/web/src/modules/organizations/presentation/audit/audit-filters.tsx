"use client";

import { useState } from "react";
import { XIcon } from "@phosphor-icons/react";
import {
  AUDIT_ACTOR_ID_MAX_LENGTH,
  type ListOrganizationAuditQuery,
  type OrganizationAuditEntryDto,
} from "@futrob/api-contracts";
import {
  applyStyles,
  Button,
  Field,
  FieldError,
  Input,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { auditActionGroups, auditActionLabel } from "./audit-labels.ts";
import { AuditDateFilter } from "./audit-date-filter.tsx";
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
const CUSTOM_ACTOR_VALUE = "__custom_actor__";

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
  const { t } = useI18n();
  const [customActorOpen, setCustomActorOpen] = useState(false);
  const [draftActorId, setDraftActorId] = useState("");
  const [actorIdTooLong, setActorIdTooLong] = useState(false);

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
    { value: CUSTOM_ACTOR_VALUE, label: t("audit.filter.actorById") },
  ];
  const competitionSelectItems = [
    { value: ALL_VALUE, label: t("audit.filter.allCompetitions") },
    ...[...competitionMap].map(([value, label]) => ({ value, label })),
  ];

  const active = hasAuditFilters(filters, competitionId);

  function applyCustomActor() {
    const actorId = draftActorId.trim();
    if (!actorId) return;
    if (actorId.length > AUDIT_ACTOR_ID_MAX_LENGTH) {
      setActorIdTooLong(true);
      return;
    }
    setActorIdTooLong(false);
    setCustomActorOpen(false);
    setDraftActorId("");
    onApply({ ...filters, actorId });
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
            if (value === CUSTOM_ACTOR_VALUE) {
              setDraftActorId(filters.actorId ?? "");
              setActorIdTooLong(false);
              setCustomActorOpen(true);
              return;
            }
            setCustomActorOpen(false);
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

      {customActorOpen ? (
        <div {...applyStyles(styles.customActorField)}>
          <Field invalid={actorIdTooLong}>
            <Input
              aria-invalid={actorIdTooLong}
              aria-label={t("audit.filter.actorIdInput")}
              dense
              name="actorId"
              onChange={(event) => {
                setDraftActorId(event.target.value);
                setActorIdTooLong(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyCustomActor();
                }
                if (event.key === "Escape") setCustomActorOpen(false);
              }}
              placeholder={t("audit.filter.actorIdPlaceholder")}
              value={draftActorId}
            />
            {actorIdTooLong ? (
              <FieldError match>
                {t("audit.filter.actorIdTooLong", { max: AUDIT_ACTOR_ID_MAX_LENGTH })}
              </FieldError>
            ) : null}
          </Field>
          <Button
            dense
            disabled={!draftActorId.trim()}
            onClick={applyCustomActor}
            type="button"
            variant="secondary"
          >
            {t("audit.filter.applyActorId")}
          </Button>
        </div>
      ) : null}

      <AuditDateFilter filters={filters} onApply={onApply} />

      {active ? (
        <Button
          dense
          onClick={() => {
            setCustomActorOpen(false);
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
