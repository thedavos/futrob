"use client";

import * as stylex from "@stylexjs/stylex";
import { applyStyles, Badge, Button, Field, FieldLabel, Input, typography } from "@futrob/ui";
import { colors, media } from "@futrob/ui/styles/public.stylex";
import type {
  CompetitionEntryDto,
  CompetitionEntryStatusDto,
  CompetitionParticipantInput,
  TeamDto,
} from "@futrob/api-contracts";
import { SelectField, StepHeading } from "./competition-setup-fields.tsx";

const styles = stylex.create({
  section: {
    display: "grid",
    gap: "1.75rem",
  },
  row: {
    display: "grid",
    gap: "0.75rem",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "minmax(0, 1fr) auto",
    },
  },
  selfEnd: {
    alignSelf: "end",
  },
  list: {
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.borderSubtle,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.borderSubtle,
  },
  empty: {
    paddingBlock: "1.25rem",
    color: colors.mutedForeground,
  },
  entry: {
    display: "flex",
    minHeight: "3.5rem",
    alignItems: "center",
    gap: "0.75rem",
    paddingBlock: "0.75rem",
    borderTopWidth: {
      default: 1,
      ":first-child": 0,
    },
    borderTopStyle: "solid",
    borderTopColor: colors.borderSubtle,
  },
  name: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "0%",
    fontWeight: 600,
  },
});

const selfEnd = applyStyles(styles.selfEnd);

export function ParticipantsStep({
  availableTeams,
  teams,
  participants,
  selectedTeamId,
  newTeamName,
  onTeamChange,
  onNameChange,
  onAdd,
  onRemove,
  disabled,
}: {
  availableTeams: readonly TeamDto[];
  teams: readonly TeamDto[];
  participants: readonly CompetitionEntryDto[];
  selectedTeamId: string;
  newTeamName: string;
  onTeamChange: (id: string) => void;
  onNameChange: (name: string) => void;
  onAdd: (input: CompetitionParticipantInput) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  disabled: boolean;
}) {
  return (
    <section {...applyStyles(styles.section)}>
      <StepHeading
        title="Participantes"
        copy="Selecciona un Team existente o crea uno mínimo. El alta del operador queda aprobada."
      />
      <div {...applyStyles(styles.row)}>
        <SelectField
          disabled={disabled || availableTeams.length === 0}
          id="existing-team"
          items={availableTeams.map((team) => ({ value: team.id, label: team.name }))}
          label="Team existente"
          onChange={onTeamChange}
          value={selectedTeamId}
        />
        <Button
          className={selfEnd.className}
          disabled={disabled || !selectedTeamId}
          onClick={() => void onAdd({ kind: "existing-team", teamId: selectedTeamId })}
          style={selfEnd.style}
        >
          Agregar
        </Button>
      </div>
      <div {...applyStyles(styles.row)}>
        <Field>
          <FieldLabel htmlFor="new-team-name">Crear Team mínimo</FieldLabel>
          <Input
            disabled={disabled}
            id="new-team-name"
            maxLength={120}
            onChange={(event) => onNameChange(event.target.value)}
            value={newTeamName}
          />
        </Field>
        <Button
          className={selfEnd.className}
          disabled={disabled || !newTeamName.trim()}
          onClick={() =>
            void onAdd({ kind: "new-team", name: newTeamName, creationKey: crypto.randomUUID() })
          }
          style={selfEnd.style}
          variant="outline"
        >
          Crear y agregar
        </Button>
      </div>
      <div {...applyStyles(styles.list)}>
        {participants.length === 0 ? (
          <p {...applyStyles(typography.caption, styles.empty)}>Aún no hay participantes.</p>
        ) : (
          participants.map((entry) => {
            const team = teams.find((item) => item.id === entry.teamId);
            return (
              <div key={entry.id} {...applyStyles(styles.entry)}>
                <span {...applyStyles(styles.name)}>{team?.name ?? entry.teamId}</span>
                <EntryStatusBadge status={entry.status} />
                {entry.status === "approved" ? (
                  <Button
                    disabled={disabled}
                    onClick={() => void onRemove(entry.id)}
                    variant="ghost"
                  >
                    Quitar
                  </Button>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

const ENTRY_STATUS_BADGES = {
  approved: { label: "Aprobado", variant: "neutral" },
  pending: { label: "Pendiente", variant: "warning" },
  rejected: { label: "Rechazada", variant: "destructive" },
} as const;

function EntryStatusBadge({ status }: { readonly status: CompetitionEntryStatusDto }) {
  const badge = ENTRY_STATUS_BADGES[status];
  return (
    <Badge data-entry-status={status} variant={badge.variant}>
      {badge.label}
    </Badge>
  );
}
