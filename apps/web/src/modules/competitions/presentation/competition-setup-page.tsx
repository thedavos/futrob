"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, CardContent, Stepper } from "@futrob/ui";
import type {
  CompetitionDraftDto,
  CompetitionFormatDto,
  CompetitionMatchRulesDto,
  CompetitionParticipantInput,
  UpdateCompetitionDraftRequest,
} from "@futrob/api-contracts";
import { COMPETITION_PERMISSION } from "@futrob/competitions";
import { useCapabilities } from "@/shared/presentation/permissions/index.ts";
import {
  FormatStep,
  InformationStep,
  ParticipantsStep,
  ReviewStep,
  RulesStep,
} from "./competition-setup-steps.tsx";
import { PageAlert } from "./competition-setup-fields.tsx";
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
const SETUP_CAPABILITIES = {
  update: COMPETITION_PERMISSION.update,
  manageParticipants: COMPETITION_PERMISSION.participantsManage,
  publish: COMPETITION_PERMISSION.publish,
} as const;

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
  const caps = useCapabilities({ organizationId, competitionId }, SETUP_CAPABILITIES);
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
  const canUpdate = caps.update;
  const canManageParticipants = caps.manageParticipants;
  const canPublish = caps.publish;
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
      <main>
        <p className="typo-subtitle text-muted-foreground">Cargando competición…</p>
      </main>
    );

  return (
    <main className="w-full">
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
    </main>
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
