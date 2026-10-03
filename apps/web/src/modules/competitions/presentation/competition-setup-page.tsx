"use client";

import { useEffect, useMemo, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import {
  Alert,
  AlertDescription,
  applyStyles,
  Badge,
  Button,
  Card,
  CardContent,
  PageHeaderDescription,
  PageHeaderTitle,
  Stepper,
  Subtitle,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
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
import { CompetitionProfileFields } from "./competition-profile-fields.tsx";
import {
  profileFieldsFromCompetition,
  toTeamsAndSchedule,
  validateCompetitionProfileFields,
  type CompetitionProfileFieldError,
  type CompetitionProfileFieldsValue,
} from "./competition-profile-fields-value.ts";
import {
  useAddCompetitionParticipantMutation,
  useCompetitionDraftQuery,
  useCompetitionParticipantsQuery,
  useOrganizationTeamsQuery,
  usePublishCompetitionMutation,
  useCompetitionRegistrationMutation,
  useUpdateCompetitionCoverMutation,
  useRemoveCompetitionParticipantMutation,
  useUpdateCompetitionDraftMutation,
} from "./competition-queries.ts";

const styles = stylex.create({
  loading: {
    color: colors.mutedForeground,
  },
  main: {
    width: "100%",
  },
  header: {
    marginBottom: "2rem",
    display: "grid",
    gap: "0.75rem",
    textAlign: "center",
  },
  stepper: {
    marginBottom: "2.5rem",
  },
  content: {
    display: "grid",
    gap: "1.5rem",
    paddingInline: {
      default: "1.25rem",
      [media.sm]: "2rem",
    },
    paddingTop: {
      default: "1.25rem",
      [media.sm]: "2rem",
    },
    paddingBottom: {
      default: "1.25rem",
      [media.sm]: "2rem",
    },
  },
  actions: {
    marginTop: "1.5rem",
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: "0.75rem",
  },
  actionGroup: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.75rem",
  },
});

const stepper = applyStyles(styles.stepper);

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
  const registration = useCompetitionRegistrationMutation(organizationId, competitionId);
  const coverUpdate = useUpdateCompetitionCoverMutation(organizationId, competitionId);
  const [profile, setProfile] = useState<CompetitionProfileFieldsValue | null>(null);
  const [profileError, setProfileError] = useState<CompetitionProfileFieldError | null>(null);
  const caps = useCapabilities({ organizationId, competitionId }, SETUP_CAPABILITIES);
  const [form, setForm] = useState<UpdateCompetitionDraftRequest | null>(null);
  const [newTeamName, setNewTeamName] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const draft = draftQuery.data ?? null;

  useEffect(() => {
    if (!draft) return;
    // Seed once: a cover change refreshes the draft and must not discard unsaved edits.
    setForm((current) => current ?? toUpdateInput(draft));
    setProfile((current) => current ?? profileFieldsFromCompetition(draft.competition));
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
  const status = draft?.competition.status;
  const registrationOpen = status === "registration";
  const readOnly = status !== "draft" || !canUpdate;
  const participantsLocked = status !== "draft" && status !== "registration";
  const busy =
    update.isPending ||
    add.isPending ||
    remove.isPending ||
    publish.isPending ||
    registration.isPending;
  const error =
    update.error ??
    add.error ??
    remove.error ??
    publish.error ??
    registration.error ??
    coverUpdate.error;

  async function save() {
    if (!form || !profile || readOnly) return;
    const invalid = validateCompetitionProfileFields(profile);
    if (invalid) {
      setProfileError(invalid);
      return;
    }
    await update.mutateAsync({ ...form, ...toTeamsAndSchedule(profile) });
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
        <Subtitle {...applyStyles(styles.loading)}>Cargando competición…</Subtitle>
      </main>
    );

  return (
    <main {...applyStyles(styles.main)}>
      <header {...applyStyles(styles.header)}>
        <div>
          <Badge variant={registrationOpen ? "info" : "neutral"}>{setupStatusLabel(status)}</Badge>
        </div>
        <PageHeaderTitle>Configurar {draft.competition.name}</PageHeaderTitle>
        <PageHeaderDescription>
          Guarda el avance y vuelve cuando quieras. La asociación EA es declarativa y no verifica
          propiedad.
        </PageHeaderDescription>
      </header>
      <Stepper
        aria-label="Configuración de competición"
        className={stepper.className}
        currentStepId={currentStep}
        steps={steps}
        style={stepper.style}
      />
      {registrationOpen ? (
        <Alert>
          <AlertDescription>
            Las inscripciones están abiertas. El formato y las reglas quedan bloqueados hasta que
            las cierres; puedes seguir gestionando participantes.
          </AlertDescription>
        </Alert>
      ) : null}
      {error ? (
        <PageAlert>
          No se pudo completar la operación. Revisa los datos e inténtalo de nuevo.
        </PageAlert>
      ) : null}
      <Card>
        <CardContent className={styles.content}>
          {currentStep === "information" ? (
            <InformationStep
              disabled={readOnly}
              form={form}
              onChange={(patch) => setForm({ ...form, ...patch })}
            >
              {profile ? (
                <CompetitionProfileFields
                  coverDisabled={!canUpdate || status === "archived" || coverUpdate.isPending}
                  disabled={readOnly}
                  fieldError={profileError}
                  onChange={(patch) => {
                    setProfile({ ...profile, ...patch });
                    if (patch.cover) coverUpdate.mutate(patch.cover);
                  }}
                  onClearFieldError={() => setProfileError(null)}
                  value={profile}
                />
              ) : null}
            </InformationStep>
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
              disabled={participantsLocked || busy || !canManageParticipants}
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
      <div {...applyStyles(styles.actions)}>
        <Button
          disabled={currentStep === "information" || busy}
          onClick={() => move(-1)}
          variant="outline"
        >
          Anterior
        </Button>
        <div {...applyStyles(styles.actionGroup)}>
          {!readOnly && currentStep !== "participants" && currentStep !== "review" ? (
            <Button disabled={busy} onClick={() => void save()} variant="outline">
              {update.isPending ? "Guardando…" : "Guardar"}
            </Button>
          ) : null}
          {currentStep !== "review" ? (
            <Button disabled={busy} onClick={() => void continueNext()}>
              Continuar
            </Button>
          ) : !participantsLocked && canPublish ? (
            <>
              <Button
                disabled={busy}
                onClick={() => void registration.mutateAsync(registrationOpen ? "close" : "open")}
                variant="outline"
              >
                {registrationLabel(registrationOpen, registration.isPending)}
              </Button>
              <Button
                disabled={busy || approvedParticipantCount < 2}
                onClick={() => void publish.mutateAsync()}
              >
                {publish.isPending ? "Publicando…" : "Publicar competición"}
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function setupStatusLabel(status: CompetitionDraftDto["competition"]["status"] | undefined) {
  if (status === "draft" || status === undefined) return "Borrador";
  if (status === "registration") return "Inscripciones abiertas";
  return "Publicada";
}

function registrationLabel(open: boolean, pending: boolean): string {
  if (open) return pending ? "Cerrando…" : "Cerrar inscripciones";
  return pending ? "Abriendo…" : "Abrir inscripciones";
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
