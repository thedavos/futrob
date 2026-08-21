"use client";

import { z } from "zod";
import { Field, FieldLabel, Input } from "@futrob/ui";
import type {
  CompetitionDraftDto,
  CompetitionFormatDto,
  CompetitionMatchRulesDto,
  UpdateCompetitionDraftRequest,
} from "@futrob/api-contracts";
import {
  competitionFormatSchema,
  competitionPlatformSchema,
  competitionRegionSchema,
} from "@futrob/api-contracts";
import {
  competitionFormats,
  competitionRegions,
  competitionTimeZones,
} from "./competition-draft-meta.ts";
import {
  NumberField,
  PageAlert,
  RuleToggle,
  SelectField,
  StepHeading,
} from "./competition-setup-fields.tsx";

export { ParticipantsStep } from "./competition-setup-participants.tsx";

const platforms = ["playstation", "xbox", "pc", "nintendo-switch-1", "nintendo-switch-2"] as const;
export function InformationStep({
  form,
  onChange,
  disabled,
}: {
  form: UpdateCompetitionDraftRequest;
  onChange: (patch: Partial<UpdateCompetitionDraftRequest>) => void;
  disabled: boolean;
}) {
  return (
    <section className="grid gap-6">
      <StepHeading title="Información" copy="Identidad operativa del torneo FC Clubs." />
      <Field>
        <FieldLabel htmlFor="competition-name">Nombre</FieldLabel>
        <Input
          disabled={disabled}
          id="competition-name"
          maxLength={120}
          onChange={(event) => onChange({ name: event.target.value })}
          value={form.name}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="competition-edition">Edición</FieldLabel>
        <Input
          disabled={disabled}
          id="competition-edition"
          maxLength={40}
          onChange={(event) => onChange({ gameEdition: event.target.value })}
          value={form.gameEdition}
        />
      </Field>
      <div className="grid gap-6 sm:grid-cols-2">
        <SelectField
          disabled={disabled}
          id="competition-platform"
          items={platforms.map((value) => ({ value, label: value }))}
          label="Plataforma"
          onChange={(value) => onChange({ platform: competitionPlatformSchema.parse(value) })}
          value={form.platform}
        />
        <SelectField
          disabled={disabled}
          id="competition-region"
          items={competitionRegions}
          label="Región"
          onChange={(value) => onChange({ region: competitionRegionSchema.parse(value) })}
          value={form.region}
        />
      </div>
      <SelectField
        disabled={disabled}
        id="competition-timezone"
        items={competitionTimeZones}
        label="Zona horaria"
        onChange={(value) => onChange({ timeZone: value })}
        value={form.timeZone}
      />
    </section>
  );
}

export function FormatStep({
  form,
  onChange,
  disabled,
}: {
  form: UpdateCompetitionDraftRequest;
  onChange: (format: CompetitionFormatDto) => void;
  disabled: boolean;
}) {
  return (
    <section className="grid gap-6">
      <StepHeading
        title="Formato"
        copy="La modalidad del MVP es FC Clubs. El formato define qué etapas requieren reglas."
      />
      <div className="rounded-lg bg-muted p-4">
        <p className="typo-label">Modalidad</p>
        <p className="mt-1">FC Clubs</p>
      </div>
      <SelectField
        disabled={disabled}
        id="competition-format"
        items={competitionFormats}
        label="Formato competitivo"
        onChange={(value) => onChange(competitionFormatSchema.parse(value))}
        value={form.format}
      />
    </section>
  );
}

export function RulesStep({
  form,
  onChange,
  disabled,
}: {
  form: UpdateCompetitionDraftRequest;
  onChange: (rules: UpdateCompetitionDraftRequest["rules"]) => void;
  disabled: boolean;
}) {
  return (
    <section className="grid gap-8">
      <StepHeading
        title="Reglas"
        copy="Configura partidos, puntos, roster y reprogramación. No existe una regla de verificación EA."
      />
      {form.rules.regularStage ? (
        <MatchRulesEditor
          disabled={disabled}
          label="Etapa regular"
          rules={form.rules.regularStage}
          onChange={(regularStage) => onChange({ ...form.rules, regularStage })}
        />
      ) : null}
      {form.rules.knockoutStage ? (
        <MatchRulesEditor
          disabled={disabled}
          label="Eliminación"
          rules={form.rules.knockoutStage}
          onChange={(knockoutStage) => onChange({ ...form.rules, knockoutStage })}
        />
      ) : null}
      <NumberField
        disabled={disabled}
        label="Máximo de jugadores (vacío usa 11)"
        min={1}
        value={form.rules.maxRosterSize}
        onChange={(maxRosterSize) => onChange({ ...form.rules, maxRosterSize })}
      />
    </section>
  );
}

export function MatchRulesEditor({
  label,
  rules,
  onChange,
  disabled,
}: {
  label: string;
  rules: CompetitionMatchRulesDto;
  onChange: (rules: CompetitionMatchRulesDto) => void;
  disabled: boolean;
}) {
  return (
    <fieldset className="grid gap-5 border-0 p-0">
      <legend className="typo-label">{label}</legend>
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          disabled={disabled}
          id={`${label}-matches`}
          items={[
            { value: "1", label: "1 partido" },
            { value: "2", label: "2 partidos" },
          ]}
          label="Partidos por cruce"
          onChange={(value) => {
            const count = z.union([z.literal(1), z.literal(2)]).parse(Number(value));
            onChange({
              ...rules,
              officialMatchesPerEncounter: count,
              resolutionMode: count === 1 ? "independent_matches" : rules.resolutionMode,
            });
          }}
          value={String(rules.officialMatchesPerEncounter)}
        />
        <SelectField
          disabled={disabled || rules.officialMatchesPerEncounter === 1}
          id={`${label}-resolution`}
          items={[
            { value: "independent_matches", label: "Independiente" },
            { value: "aggregate_score", label: "Marcador agregado" },
          ]}
          label="Resolución"
          onChange={(value) =>
            onChange({
              ...rules,
              resolutionMode: z.enum(["independent_matches", "aggregate_score"]).parse(value),
            })
          }
          value={rules.resolutionMode}
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <NumberField
          disabled={disabled}
          label="Victoria"
          min={0}
          value={rules.winPoints}
          onChange={(winPoints) => onChange({ ...rules, winPoints: winPoints ?? 0 })}
        />
        <NumberField
          disabled={disabled}
          label="Empate"
          min={0}
          value={rules.drawPoints}
          onChange={(drawPoints) => onChange({ ...rules, drawPoints: drawPoints ?? 0 })}
        />
        <NumberField
          disabled={disabled}
          label="Derrota"
          min={0}
          value={rules.lossPoints}
          onChange={(lossPoints) => onChange({ ...rules, lossPoints: lossPoints ?? 0 })}
        />
      </div>
      <RuleToggle
        checked={rules.allowRescheduling}
        disabled={disabled}
        label="Permitir reprogramaciones"
        onChange={(allowRescheduling) => onChange({ ...rules, allowRescheduling })}
      />
      <NumberField
        disabled={disabled || !rules.allowRescheduling}
        label="Máximo de reprogramaciones"
        min={0}
        value={rules.maxReschedulesPerTeam}
        onChange={(maxReschedulesPerTeam) => onChange({ ...rules, maxReschedulesPerTeam })}
      />
      <NumberField
        disabled={disabled || !rules.allowRescheduling}
        label="Aviso mínimo (horas)"
        min={0}
        value={rules.minimumRescheduleNoticeHours}
        onChange={(minimumRescheduleNoticeHours) =>
          onChange({ ...rules, minimumRescheduleNoticeHours: minimumRescheduleNoticeHours ?? 0 })
        }
      />
      <RuleToggle
        checked={rules.rescheduleRequiresOpponentApproval}
        disabled={disabled || !rules.allowRescheduling}
        label="Requiere aprobación del rival"
        onChange={(rescheduleRequiresOpponentApproval) =>
          onChange({ ...rules, rescheduleRequiresOpponentApproval })
        }
      />
      <RuleToggle
        checked={rules.rescheduleRequiresOrganizerApproval}
        disabled={disabled || !rules.allowRescheduling}
        label="Requiere aprobación del organizador"
        onChange={(rescheduleRequiresOrganizerApproval) =>
          onChange({ ...rules, rescheduleRequiresOrganizerApproval })
        }
      />
    </fieldset>
  );
}

export function ReviewStep({
  draft,
  participantCount,
}: {
  draft: CompetitionDraftDto;
  participantCount: number;
}) {
  return (
    <section className="grid gap-6">
      <StepHeading
        title="Revisión"
        copy="Publicar bloquea identidad, formato, reglas y participantes."
      />
      <dl className="grid gap-4 sm:grid-cols-2">
        {[
          ["Nombre", draft.competition.name],
          ["Formato", draft.competition.format],
          ["Plataforma", draft.competition.platform],
          ["Participantes aprobados", String(participantCount)],
        ].map(([term, value]) => (
          <div className="rounded-lg bg-muted p-4" key={term}>
            <dt className="typo-caption text-muted-foreground">{term}</dt>
            <dd className="mt-1 font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      {participantCount < 2 ? (
        <PageAlert>Necesitas al menos dos participantes para publicar.</PageAlert>
      ) : null}
    </section>
  );
}
