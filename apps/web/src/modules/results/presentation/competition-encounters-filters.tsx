"use client";

import type { RefObject } from "react";
import { ClockIcon } from "@phosphor-icons/react";
import {
  applyStyles,
  Button,
  Caption,
  ChoiceGroup,
  ChoiceGroupItem,
  Field,
  FieldLabel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@futrob/ui";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";

import { encounterRoundLabel } from "./competition-encounters-labels.ts";
import {
  hasEncounterFilters,
  roundsSpanStages,
  type CompetitionEncountersFilters,
  type EncounterRoundOption,
  type EncounterStatusCounts,
  type EncounterStatusFilter,
  type EncounterTeamOption,
} from "./competition-encounters-model.ts";
import { styles } from "./competition-encounters-page.styles.ts";

const ALL = "all";

export function EncounterFiltersToolbar({
  counts,
  filteredCount,
  filters,
  onFiltersChange,
  onReset,
  roundCount,
  rounds,
  statusGroupRef,
  t,
  teams,
  timeZone,
}: {
  readonly counts: EncounterStatusCounts;
  readonly filteredCount: number;
  readonly filters: CompetitionEncountersFilters;
  readonly onFiltersChange: (next: CompetitionEncountersFilters) => void;
  readonly onReset: () => void;
  readonly roundCount: number;
  readonly rounds: readonly EncounterRoundOption[];
  readonly statusGroupRef: RefObject<HTMLDivElement | null>;
  readonly t: Translator;
  readonly teams: readonly EncounterTeamOption[];
  readonly timeZone: string;
}) {
  const statusOptions: readonly {
    readonly value: EncounterStatusFilter;
    readonly label: string;
    readonly count: number;
  }[] = [
    { value: "all", label: t("encounters.list.filters.status.all"), count: counts.all },
    {
      value: "awaiting_result",
      label: t("encounters.list.filters.status.awaiting_result"),
      count: counts.awaiting_result,
    },
    {
      value: "official",
      label: t("encounters.list.filters.status.official"),
      count: counts.official,
    },
    {
      value: "scheduled",
      label: t("encounters.list.filters.status.scheduled"),
      count: counts.scheduled,
    },
  ];

  const showRoundSelect = rounds.length > 1;
  const showTeamSelect = teams.length > 2;
  const showFilterRow = showRoundSelect || showTeamSelect || hasEncounterFilters(filters);

  const roundItems = [
    { value: ALL, label: t("encounters.list.filters.allRounds") },
    ...rounds.map((round) => ({
      value: round.key,
      label: encounterRoundLabel(round, roundsSpanStages(rounds), t),
    })),
  ];

  const teamItems = [
    { value: ALL, label: t("encounters.list.filters.allTeams") },
    ...teams.map((team) => ({ value: team.teamId, label: team.name })),
  ];

  return (
    <div {...applyStyles(styles.controls)}>
      <div {...applyStyles(styles.toolbar)}>
        <div ref={statusGroupRef}>
          <ChoiceGroup<EncounterStatusFilter>
            aria-label={t("encounters.list.filters.status.label")}
            className={styles.statusGroup}
            onValueChange={(value) => {
              if (
                value === "all" ||
                value === "scheduled" ||
                value === "awaiting_result" ||
                value === "official"
              ) {
                onFiltersChange({ ...filters, status: value });
              }
            }}
            value={filters.status}
          >
            {statusOptions.map((option) => {
              const active = filters.status === option.value;
              return (
                <ChoiceGroupItem
                  appearance="pill"
                  className={styles.statusPill}
                  dense
                  key={option.value}
                  value={option.value}
                >
                  <span>{option.label}</span>
                  <span {...applyStyles(styles.statusCount, active && styles.statusCountActive)}>
                    {option.count}
                  </span>
                </ChoiceGroupItem>
              );
            })}
          </ChoiceGroup>
        </div>

        <Caption as="p" className={styles.zone}>
          <ClockIcon aria-hidden="true" {...applyStyles(styles.zoneIcon)} />
          {t("encounters.list.timeZone", { zone: timeZone })}
        </Caption>
      </div>

      {showFilterRow ? (
        <div
          aria-label={t("encounters.list.filters.label")}
          role="group"
          {...applyStyles(styles.filters)}
        >
          {showRoundSelect ? (
            <div {...applyStyles(styles.filterField)}>
              <Field>
                <FieldLabel htmlFor="encounters-round-filter">
                  {t("encounters.list.filters.round")}
                </FieldLabel>
                <Select
                  items={roundItems}
                  onValueChange={(value) =>
                    onFiltersChange({
                      ...filters,
                      roundKey: !value || value === ALL ? null : String(value),
                    })
                  }
                  value={filters.roundKey ?? ALL}
                >
                  <SelectTrigger className={styles.filterTrigger} id="encounters-round-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roundItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          ) : null}

          {showTeamSelect ? (
            <div {...applyStyles(styles.filterField)}>
              <Field>
                <FieldLabel htmlFor="encounters-team-filter">
                  {t("encounters.list.filters.team")}
                </FieldLabel>
                <Select
                  items={teamItems}
                  onValueChange={(value) =>
                    onFiltersChange({
                      ...filters,
                      teamId: !value || value === ALL ? null : String(value),
                    })
                  }
                  value={filters.teamId ?? ALL}
                >
                  <SelectTrigger className={styles.filterTrigger} id="encounters-team-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {teamItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          ) : null}

          {hasEncounterFilters(filters) ? (
            <Button onClick={onReset} variant="ghost">
              {t("encounters.list.filters.reset")}
            </Button>
          ) : null}

          <Caption as="p" className={styles.filterStatus} role="status">
            {t("encounters.list.summary", { count: filteredCount, rounds: roundCount })}
          </Caption>
        </div>
      ) : null}
    </div>
  );
}
