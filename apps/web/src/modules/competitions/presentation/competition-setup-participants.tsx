"use client";

import { Badge, Button, Field, FieldLabel, Input } from "@futrob/ui";
import type {
  CompetitionEntryDto,
  CompetitionEntryStatusDto,
  CompetitionParticipantInput,
  TeamDto,
} from "@futrob/api-contracts";
import { SelectField, StepHeading } from "./competition-setup-fields.tsx";

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
    <section className="grid gap-7">
      <StepHeading
        title="Participantes"
        copy="Selecciona un Team existente o crea uno mínimo. El alta del operador queda aprobada."
      />
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <SelectField
          disabled={disabled || availableTeams.length === 0}
          id="existing-team"
          items={availableTeams.map((team) => ({ value: team.id, label: team.name }))}
          label="Team existente"
          onChange={onTeamChange}
          value={selectedTeamId}
        />
        <Button
          className="self-end"
          disabled={disabled || !selectedTeamId}
          onClick={() => void onAdd({ kind: "existing-team", teamId: selectedTeamId })}
        >
          Agregar
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
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
          className="self-end"
          disabled={disabled || !newTeamName.trim()}
          onClick={() =>
            void onAdd({ kind: "new-team", name: newTeamName, creationKey: crypto.randomUUID() })
          }
          variant="outline"
        >
          Crear y agregar
        </Button>
      </div>
      <div className="divide-y divide-border-subtle border-y border-border-subtle">
        {participants.length === 0 ? (
          <p className="py-5 typo-caption text-muted-foreground">Aún no hay participantes.</p>
        ) : (
          participants.map((entry) => {
            const team = teams.find((item) => item.id === entry.teamId);
            return (
              <div className="flex min-h-14 items-center gap-3 py-3" key={entry.id}>
                <span className="flex-1 font-semibold">{team?.name ?? entry.teamId}</span>
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
