"use client";

import type { ReactNode } from "react";
import { z } from "zod";
import * as stylex from "@stylexjs/stylex";
import { InfoIcon } from "@phosphor-icons/react";
import { applyStyles, Card, CardContent, Separator, typography } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import type {
  CompetitionMatchRulesDto,
  UpdateCompetitionDraftRequest,
} from "@futrob/api-contracts";
import { NumberField, RuleToggle, SelectField, StepHeading } from "./competition-setup-fields.tsx";

const TIEBREAKS = ["Puntos", "Diferencia de goles", "Goles a favor"] as const;

type StageKey = "regularStage" | "knockoutStage";

type Stage = {
  readonly key: StageKey;
  readonly label: string;
  readonly rules: CompetitionMatchRulesDto;
};

const styles = stylex.create({
  columns: {
    display: "grid",
    alignItems: "start",
    gap: "1rem",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.lg]: "minmax(0, 1.5fr) minmax(18rem, 0.85fr)",
    },
  },
  cardBody: {
    display: "grid",
    gap: "1.5rem",
    padding: {
      default: "1.25rem",
      [media.sm]: "2rem",
    },
  },
  subsection: {
    display: "grid",
    gap: "1.5rem",
  },
  stages: {
    display: "grid",
    gap: "1.5rem",
  },
  phaseTitle: {
    margin: 0,
    fontSize: "1rem",
    lineHeight: "1.5rem",
    fontWeight: 600,
  },
  pair: {
    display: "grid",
    gap: "1.25rem",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "repeat(2, minmax(0, 1fr))",
    },
  },
  triple: {
    display: "grid",
    gap: "1.25rem",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "repeat(3, minmax(0, 1fr))",
    },
  },
  tiebreaks: {
    display: "grid",
    gap: "0.75rem",
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  tiebreak: {
    display: "grid",
    gridTemplateColumns: "1.5rem minmax(0, 1fr)",
    alignItems: "baseline",
    gap: "0.75rem",
  },
  tiebreakIndex: {
    color: colors.mutedForeground,
    fontWeight: 600,
  },
  facts: {
    display: "grid",
    gap: "0.75rem",
    margin: 0,
  },
  fact: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: "1rem",
  },
  factLabel: {
    margin: 0,
    color: colors.mutedForeground,
  },
  factValue: {
    margin: 0,
    fontWeight: 600,
    textAlign: "end",
  },
  note: {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.75rem",
    margin: 0,
    borderRadius: "var(--corner-lg)",
    backgroundColor: colors.muted,
    padding: "0.75rem 1rem",
  },
});

export function RulesStep({
  form,
  onChange,
  disabled,
}: {
  form: UpdateCompetitionDraftRequest;
  onChange: (rules: UpdateCompetitionDraftRequest["rules"]) => void;
  disabled: boolean;
}) {
  const knockoutLabel = form.format === "league-playoffs" ? "Playoffs" : "Eliminación";
  const stages: Stage[] = [];
  if (form.rules.regularStage) {
    stages.push({ key: "regularStage", label: "Etapa regular", rules: form.rules.regularStage });
  }
  if (form.rules.knockoutStage) {
    stages.push({ key: "knockoutStage", label: knockoutLabel, rules: form.rules.knockoutStage });
  }

  function updateStage(key: StageKey, next: CompetitionMatchRulesDto) {
    onChange({ ...form.rules, [key]: next });
  }

  return (
    <div {...applyStyles(styles.columns)}>
      <Card>
        <CardContent className={styles.cardBody}>
          <div {...applyStyles(styles.subsection)}>
            <StepHeading copy="Puntos de cada resultado." title="Puntuación" />
            <StageBands stages={stages}>
              {(stage) => (
                <div {...applyStyles(styles.triple)}>
                  <NumberField
                    disabled={disabled}
                    id={`${stage.key}-win`}
                    label="Victoria"
                    min={0}
                    value={stage.rules.winPoints}
                    onChange={(winPoints) =>
                      updateStage(stage.key, { ...stage.rules, winPoints: winPoints ?? 0 })
                    }
                  />
                  <NumberField
                    disabled={disabled}
                    id={`${stage.key}-draw`}
                    label="Empate"
                    min={0}
                    value={stage.rules.drawPoints}
                    onChange={(drawPoints) =>
                      updateStage(stage.key, { ...stage.rules, drawPoints: drawPoints ?? 0 })
                    }
                  />
                  <NumberField
                    disabled={disabled}
                    id={`${stage.key}-loss`}
                    label="Derrota"
                    min={0}
                    value={stage.rules.lossPoints}
                    onChange={(lossPoints) =>
                      updateStage(stage.key, { ...stage.rules, lossPoints: lossPoints ?? 0 })
                    }
                  />
                </div>
              )}
            </StageBands>
          </div>
          <Separator />
          <div {...applyStyles(styles.subsection)}>
            <StepHeading copy="Partidos del cruce y cómo se resuelve." title="Enfrentamiento" />
            <StageBands stages={stages}>
              {(stage) => (
                <div {...applyStyles(styles.pair)}>
                  <SelectField
                    disabled={disabled}
                    id={`${stage.key}-matches`}
                    items={[
                      { value: "1", label: "1 partido" },
                      { value: "2", label: "2 partidos" },
                    ]}
                    label="Partidos por cruce"
                    onChange={(value) => {
                      const count = z.union([z.literal(1), z.literal(2)]).parse(Number(value));
                      updateStage(stage.key, {
                        ...stage.rules,
                        officialMatchesPerEncounter: count,
                        resolutionMode:
                          count === 1 ? "independent_matches" : stage.rules.resolutionMode,
                      });
                    }}
                    value={String(stage.rules.officialMatchesPerEncounter)}
                  />
                  <SelectField
                    disabled={disabled || stage.rules.officialMatchesPerEncounter === 1}
                    id={`${stage.key}-resolution`}
                    items={[
                      { value: "independent_matches", label: "Independiente" },
                      { value: "aggregate_score", label: "Marcador agregado" },
                    ]}
                    label="Resolución"
                    onChange={(value) =>
                      updateStage(stage.key, {
                        ...stage.rules,
                        resolutionMode: z
                          .enum(["independent_matches", "aggregate_score"])
                          .parse(value),
                      })
                    }
                    value={stage.rules.resolutionMode}
                  />
                </div>
              )}
            </StageBands>
          </div>
          <Separator />
          <div {...applyStyles(styles.subsection)}>
            <StepHeading copy="Cuándo se puede mover un partido." title="Reprogramación" />
            <StageBands stages={stages}>
              {(stage) => (
                <>
                  <RuleToggle
                    checked={stage.rules.allowRescheduling}
                    disabled={disabled}
                    id={`${stage.key}-allow-reschedule`}
                    label="Permitir reprogramaciones"
                    onChange={(allowRescheduling) =>
                      updateStage(stage.key, { ...stage.rules, allowRescheduling })
                    }
                  />
                  <div {...applyStyles(styles.pair)}>
                    <NumberField
                      disabled={disabled || !stage.rules.allowRescheduling}
                      id={`${stage.key}-max-reschedules`}
                      label="Máximo de reprogramaciones"
                      min={0}
                      value={stage.rules.maxReschedulesPerTeam}
                      onChange={(maxReschedulesPerTeam) =>
                        updateStage(stage.key, { ...stage.rules, maxReschedulesPerTeam })
                      }
                    />
                    <NumberField
                      disabled={disabled || !stage.rules.allowRescheduling}
                      id={`${stage.key}-notice`}
                      label="Aviso mínimo (horas)"
                      min={0}
                      value={stage.rules.minimumRescheduleNoticeHours}
                      onChange={(minimumRescheduleNoticeHours) =>
                        updateStage(stage.key, {
                          ...stage.rules,
                          minimumRescheduleNoticeHours: minimumRescheduleNoticeHours ?? 0,
                        })
                      }
                    />
                  </div>
                  <RuleToggle
                    checked={stage.rules.rescheduleRequiresOpponentApproval}
                    disabled={disabled || !stage.rules.allowRescheduling}
                    id={`${stage.key}-opponent`}
                    label="Requiere aprobación del rival"
                    onChange={(rescheduleRequiresOpponentApproval) =>
                      updateStage(stage.key, { ...stage.rules, rescheduleRequiresOpponentApproval })
                    }
                  />
                  <RuleToggle
                    checked={stage.rules.rescheduleRequiresOrganizerApproval}
                    disabled={disabled || !stage.rules.allowRescheduling}
                    id={`${stage.key}-organizer`}
                    label="Requiere aprobación del organizador"
                    onChange={(rescheduleRequiresOrganizerApproval) =>
                      updateStage(stage.key, {
                        ...stage.rules,
                        rescheduleRequiresOrganizerApproval,
                      })
                    }
                  />
                </>
              )}
            </StageBands>
          </div>
          <Separator />
          <div {...applyStyles(styles.subsection)}>
            <StepHeading copy="Si lo dejas vacío, el tope es 11." title="Plantilla" />
            <div {...applyStyles(styles.pair)}>
              <NumberField
                disabled={disabled}
                label="Máximo de jugadores"
                min={1}
                value={form.rules.maxRosterSize}
                onChange={(maxRosterSize) => onChange({ ...form.rules, maxRosterSize })}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className={styles.cardBody}>
          <div {...applyStyles(styles.subsection)}>
            <StepHeading copy="Se aplicarán en este orden." title="Criterios de desempate" />
            <ol {...applyStyles(styles.tiebreaks)}>
              {TIEBREAKS.map((criterion, index) => (
                <li key={criterion} {...applyStyles(styles.tiebreak)}>
                  <span {...applyStyles(styles.tiebreakIndex)}>{index + 1}</span>
                  <span>{criterion}</span>
                </li>
              ))}
            </ol>
          </div>
          <Separator />
          <div {...applyStyles(styles.subsection)}>
            <StepHeading
              copy="El rival confirma el resultado dentro de este plazo."
              title="Validación de resultados"
            />
            <dl {...applyStyles(styles.facts)}>
              <div {...applyStyles(styles.fact)}>
                <dt {...applyStyles(typography.caption, styles.factLabel)}>Confirmación</dt>
                <dd {...applyStyles(styles.factValue)}>El rival</dd>
              </div>
              <div {...applyStyles(styles.fact)}>
                <dt {...applyStyles(typography.caption, styles.factLabel)}>Plazo para responder</dt>
                <dd {...applyStyles(styles.factValue)}>24 horas</dd>
              </div>
            </dl>
            <p {...applyStyles(typography.caption, styles.factLabel)}>
              Si no responde a tiempo, el resultado pasa a revisión del organizador.
            </p>
            <p {...applyStyles(styles.note)}>
              <InfoIcon
                aria-hidden
                size={20}
                style={{ color: "var(--muted-foreground)", flexShrink: 0 }}
              />
              Solo un resultado oficial aprobado entra en la clasificación y los rankings.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StageBands({
  stages,
  children,
}: {
  readonly stages: readonly Stage[];
  readonly children: (stage: Stage) => ReactNode;
}) {
  return (
    <div {...applyStyles(styles.stages)}>
      {stages.map((stage, index) => (
        <div key={stage.key} {...applyStyles(styles.subsection)}>
          {index > 0 ? <Separator /> : null}
          {stages.length > 1 ? <p {...applyStyles(styles.phaseTitle)}>{stage.label}</p> : null}
          {children(stage)}
        </div>
      ))}
    </div>
  );
}
