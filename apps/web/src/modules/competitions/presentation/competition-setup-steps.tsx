"use client";

import { z } from "zod";
import { applyStyles, typography } from "@futrob/ui";
import { styles } from "./competition-setup-steps.styles.ts";
import type {
  CompetitionDraftDto,
  CompetitionMatchRulesDto,
  UpdateCompetitionDraftRequest,
} from "@futrob/api-contracts";
import { competitionPlatformLabel } from "./competition-draft-meta.ts";
import {
  NumberField,
  PageAlert,
  RuleToggle,
  SelectField,
  StepHeading,
} from "./competition-setup-fields.tsx";

export { ParticipantsStep } from "./competition-setup-participants.tsx";

export { InformationStep } from "./competition-information-step.tsx";

export { FormatStep } from "./competition-format-step.tsx";

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
    <section {...applyStyles(styles.rules)}>
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
    <fieldset {...applyStyles(styles.fieldset)}>
      <legend {...applyStyles(typography.label)}>{label}</legend>
      <div {...applyStyles(styles.pairTight)}>
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
      <div {...applyStyles(styles.triple)}>
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
    <section {...applyStyles(styles.section)}>
      <StepHeading
        title="Revisión"
        copy="Publicar bloquea identidad, formato, reglas y participantes."
      />
      <dl {...applyStyles(styles.reviewGrid)}>
        {[
          ["Nombre", draft.competition.name],
          ["Formato", draft.competition.format],
          ["Plataforma", competitionPlatformLabel(draft.competition.platform)],
          ["Participantes aprobados", String(participantCount)],
        ].map(([term, value]) => (
          <div key={term} {...applyStyles(styles.mutedCard)}>
            <dt {...applyStyles(typography.caption, styles.reviewTerm)}>{term}</dt>
            <dd {...applyStyles(styles.reviewValue)}>{value}</dd>
          </div>
        ))}
      </dl>
      {participantCount < 2 ? (
        <PageAlert>Necesitas al menos dos participantes para publicar.</PageAlert>
      ) : null}
    </section>
  );
}
