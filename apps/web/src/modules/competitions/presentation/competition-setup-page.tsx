"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  Checkbox,
  Field,
  FieldLabel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Stepper,
} from "@futrob/ui";
import type {
  CompetitionDraftDto,
  CompetitionEntryDto,
  CompetitionFormatDto,
  CompetitionMatchRulesDto,
  CompetitionParticipantInput,
  CompetitionPlatformDto,
  CompetitionRegionDto,
  TeamDto,
  UpdateCompetitionDraftRequest,
} from "@futrob/api-contracts";
import { WarningCircle } from "@phosphor-icons/react";
import { useEffectivePermissions } from "@/shared/presentation/query/use-effective-permissions.ts";
import {
  competitionFormats,
  competitionRegions,
  competitionTimeZones,
} from "./competition-draft-meta.ts";
import {
  useAddCompetitionParticipantMutation,
  useCompetitionDraftQuery,
  useCompetitionParticipantsQuery,
  useOrganizationTeamsQuery,
  usePublishCompetitionMutation,
  useRemoveCompetitionParticipantMutation,
  useUpdateCompetitionDraftMutation,
} from "./competition-queries.ts";

export type CompetitionSetupStep = "information" | "format" | "rules" | "participants" | "review";
const steps = [
  { id: "information", label: "Información" },
  { id: "format", label: "Formato" },
  { id: "rules", label: "Reglas" },
  { id: "participants", label: "Participantes" },
  { id: "review", label: "Revisión" },
] as const;
const platforms = ["playstation", "xbox", "pc", "nintendo-switch-1", "nintendo-switch-2"] as const;

export function CompetitionSetupPage({
  organizationId,
  competitionId,
  currentStep,
  onStepChange,
}: Readonly<{
  organizationId: string;
  competitionId: string;
  currentStep: CompetitionSetupStep;
  onStepChange: (step: CompetitionSetupStep) => void;
}>) {
  const draftQuery = useCompetitionDraftQuery(organizationId, competitionId);
  const participantsQuery = useCompetitionParticipantsQuery(organizationId, competitionId);
  const teamsQuery = useOrganizationTeamsQuery(organizationId);
  const update = useUpdateCompetitionDraftMutation(organizationId, competitionId);
  const add = useAddCompetitionParticipantMutation(organizationId, competitionId);
  const remove = useRemoveCompetitionParticipantMutation(organizationId, competitionId);
  const publish = usePublishCompetitionMutation(organizationId, competitionId);
  const permissions = useEffectivePermissions({ organizationId, competitionId }, [
    "competitions.update",
    "competitions.participants.manage",
    "competitions.publish",
  ]);
  const [form, setForm] = useState<UpdateCompetitionDraftRequest | null>(null);
  const [newTeamName, setNewTeamName] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const draft = draftQuery.data ?? null;

  useEffect(() => {
    if (draft) setForm(toUpdateInput(draft));
  }, [draft]);
  const participantTeamIds = useMemo(
    () => new Set((participantsQuery.data?.participants ?? []).map((entry) => entry.teamId)),
    [participantsQuery.data],
  );
  const availableTeams = (teamsQuery.data?.teams ?? []).filter(
    (team) => !participantTeamIds.has(team.id),
  );
  const approvedParticipantCount =
    participantsQuery.data?.participants.filter((entry) => entry.status === "approved").length ?? 0;
  const canUpdate = permissions.allowed.has("competitions.update");
  const canManageParticipants = permissions.allowed.has("competitions.participants.manage");
  const canPublish = permissions.allowed.has("competitions.publish");
  const readOnly = draft?.competition.status !== "draft" || !canUpdate;
  const busy = update.isPending || add.isPending || remove.isPending || publish.isPending;
  const error = update.error ?? add.error ?? remove.error ?? publish.error;

  async function save() {
    if (form && !readOnly) await update.mutateAsync(form);
  }
  async function continueNext() {
    if (!readOnly && ["information", "format", "rules"].includes(currentStep)) await save();
    move(1);
  }
  async function addParticipant(input: CompetitionParticipantInput) {
    await add.mutateAsync(input);
    setNewTeamName("");
    setSelectedTeamId("");
  }
  function move(delta: -1 | 1) {
    const index = steps.findIndex((step) => step.id === currentStep);
    const next = steps[index + delta];
    if (next) onStepChange(next.id);
  }

  if (draftQuery.isError)
    return <PageAlert> No se pudo cargar el borrador de la competición. </PageAlert>;
  if (!draft || !form)
    return (
      <main className="px-5 py-10">
        <p className="typo-subtitle text-muted-foreground">Cargando competición…</p>
      </main>
    );

  return (
    <main className="px-5 py-8 text-foreground sm:px-8 sm:py-10">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-8 grid gap-3 text-center">
          <div>
            <Badge variant="neutral">{readOnly ? "Publicada" : "Borrador"}</Badge>
          </div>
          <h1 className="typo-heading">Configurar {draft.competition.name}</h1>
          <p className="typo-subtitle text-muted-foreground">
            Guarda el avance y vuelve cuando quieras. La asociación EA es declarativa y no verifica
            propiedad.
          </p>
        </header>
        <Stepper
          aria-label="Configuración de competición"
          className="mb-10"
          currentStepId={currentStep}
          steps={steps}
        />
        {error ? (
          <PageAlert>
            No se pudo completar la operación. Revisa los datos e inténtalo de nuevo.
          </PageAlert>
        ) : null}
        <Card>
          <CardContent className="grid gap-6 p-5 sm:p-8">
            {currentStep === "information" ? (
              <InformationStep
                disabled={readOnly}
                form={form}
                onChange={(patch) => setForm({ ...form, ...patch })}
              />
            ) : null}
            {currentStep === "format" ? (
              <FormatStep
                disabled={readOnly}
                form={form}
                onChange={(next) => {
                  if (next === form.format) return;
                  if (
                    !globalThis.confirm(
                      "Cambiar el formato reemplazará las reglas incompatibles. ¿Continuar?",
                    )
                  )
                    return;
                  setForm({ ...form, format: next, rules: rulesForFormat(next) });
                }}
              />
            ) : null}
            {currentStep === "rules" ? (
              <RulesStep
                disabled={readOnly}
                form={form}
                onChange={(rules) => setForm({ ...form, rules })}
              />
            ) : null}
            {currentStep === "participants" ? (
              <ParticipantsStep
                availableTeams={availableTeams}
                disabled={readOnly || busy || !canManageParticipants}
                newTeamName={newTeamName}
                onAdd={addParticipant}
                onNameChange={setNewTeamName}
                onRemove={(id: string) => remove.mutateAsync(id)}
                onTeamChange={setSelectedTeamId}
                participants={participantsQuery.data?.participants ?? []}
                selectedTeamId={selectedTeamId}
                teams={teamsQuery.data?.teams ?? []}
              />
            ) : null}
            {currentStep === "review" ? (
              <ReviewStep draft={draft} participantCount={approvedParticipantCount} />
            ) : null}
          </CardContent>
        </Card>
        <div className="mt-6 flex flex-wrap justify-between gap-3">
          <Button
            disabled={currentStep === "information" || busy}
            onClick={() => move(-1)}
            variant="outline"
          >
            Anterior
          </Button>
          <div className="flex flex-wrap gap-3">
            {!readOnly && currentStep !== "participants" && currentStep !== "review" ? (
              <Button disabled={busy} onClick={() => void save()} variant="outline">
                {update.isPending ? "Guardando…" : "Guardar"}
              </Button>
            ) : null}
            {currentStep !== "review" ? (
              <Button disabled={busy} onClick={() => void continueNext()}>
                Continuar
              </Button>
            ) : !readOnly && canPublish ? (
              <Button
                disabled={busy || approvedParticipantCount < 2}
                onClick={() => void publish.mutateAsync()}
              >
                {publish.isPending ? "Publicando…" : "Publicar competición"}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}

function InformationStep({
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
          onChange={(value) => onChange({ platform: value as CompetitionPlatformDto })}
          value={form.platform}
        />
        <SelectField
          disabled={disabled}
          id="competition-region"
          items={competitionRegions}
          label="Región"
          onChange={(value) => onChange({ region: value as CompetitionRegionDto })}
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

function FormatStep({
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
        onChange={(value) => onChange(value as CompetitionFormatDto)}
        value={form.format}
      />
    </section>
  );
}

function RulesStep({
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

function MatchRulesEditor({
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
            const count = Number(value) as 1 | 2;
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
              resolutionMode: value as CompetitionMatchRulesDto["resolutionMode"],
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

function ParticipantsStep({
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
  onRemove: (id: string) => Promise<unknown>;
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
                <Badge variant="neutral">Aprobado</Badge>
                <Button disabled={disabled} onClick={() => void onRemove(entry.id)} variant="ghost">
                  Quitar
                </Button>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function ReviewStep({
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

function SelectField({
  id,
  label,
  value,
  items,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  items: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        items={items}
        onValueChange={(next) => {
          if (next) onChange(next);
        }}
        value={value}
      >
        <SelectTrigger disabled={disabled} id={id}>
          <SelectValue placeholder="Selecciona" />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
function NumberField({
  label,
  value,
  onChange,
  min,
  disabled,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  min: number;
  disabled: boolean;
}) {
  const id = `rule-${label.toLowerCase().replaceAll(" ", "-")}`;
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        disabled={disabled}
        id={id}
        min={min}
        onChange={(event) =>
          onChange(event.target.value === "" ? null : Number(event.target.value))
        }
        type="number"
        value={value ?? ""}
      />
    </Field>
  );
}
function RuleToggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled: boolean;
}) {
  const id = `rule-${label.toLowerCase().replaceAll(" ", "-")}`;
  return (
    <div className="flex min-h-11 items-center gap-3">
      <Checkbox checked={checked} disabled={disabled} id={id} onCheckedChange={onChange} />
      <label className="typo-label" htmlFor={id}>
        {label}
      </label>
    </div>
  );
}
function StepHeading({ title, copy }: { title: string; copy: string }) {
  return (
    <header className="grid gap-2">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="typo-caption text-muted-foreground">{copy}</p>
    </header>
  );
}
function PageAlert({ children }: { children: ReactNode }) {
  return (
    <Alert className="mb-5" variant="destructive">
      <WarningCircle aria-hidden="true" />
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}

function toUpdateInput(draft: CompetitionDraftDto): UpdateCompetitionDraftRequest {
  return {
    name: draft.competition.name,
    gameEdition: draft.competition.gameEdition,
    platform: draft.competition.platform,
    region: draft.competition.region,
    timeZone: draft.competition.timeZone,
    format: draft.competition.format,
    rules: {
      regularStage: draft.rules.regularStage,
      knockoutStage: draft.rules.knockoutStage,
      maxRosterSize: draft.rules.maxRosterSize,
    },
  };
}
function rulesForFormat(format: CompetitionFormatDto): UpdateCompetitionDraftRequest["rules"] {
  const regularStage = format === "knockout" ? null : defaultRules(1, "independent_matches");
  const knockoutStage = format === "league" ? null : defaultRules(2, "aggregate_score");
  return { regularStage, knockoutStage, maxRosterSize: null };
}
function defaultRules(
  officialMatchesPerEncounter: 1 | 2,
  resolutionMode: CompetitionMatchRulesDto["resolutionMode"],
): CompetitionMatchRulesDto {
  return {
    officialMatchesPerEncounter,
    resolutionMode,
    winPoints: 3,
    drawPoints: 1,
    lossPoints: 0,
    allowRescheduling: true,
    maxReschedulesPerTeam: 2,
    minimumRescheduleNoticeHours: 12,
    rescheduleRequiresOpponentApproval: true,
    rescheduleRequiresOrganizerApproval: false,
  };
}
