"use client";

import { useEffect, useMemo, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import {
  Alert,
  AlertDescription,
  applyStyles,
  Badge,
  Card,
  CardContent,
  PageHeader,
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
import { CompetitionSetupActionBarRegistration } from "./competition-setup-action-bar.tsx";
import { PageAlert } from "./competition-setup-fields.tsx";
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
  titleRow: {
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    gap: "0.5rem",
  },
  title: {
    width: "fit-content",
    minWidth: 0,
    maxWidth: "100%",
    flexShrink: 1,
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
});

const stepper = applyStyles(styles.stepper);
const setupTitle = applyStyles(styles.title);

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
      <PageHeader>
        <div {...applyStyles(styles.titleRow)}>
          <PageHeaderTitle className={setupTitle.className} style={setupTitle.style} truncate>
            Configurar competición
          </PageHeaderTitle>
          <Badge variant={registrationOpen ? "info" : "neutral"}>{setupStatusLabel(status)}</Badge>
        </div>
        <PageHeaderDescription>
          Define los datos de tu competición. Puedes guardar y continuar después.
        </PageHeaderDescription>
      </PageHeader>
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
      {currentStep === "information" ? (
        <InformationStep
          disabled={readOnly}
          form={form}
          onChange={(patch) => setForm({ ...form, ...patch })}
          profile={
            profile
              ? {
                  coverDisabled: !canUpdate || status === "archived" || coverUpdate.isPending,
                  fieldError: profileError,
                  onChange: (patch) => {
                    setProfile({ ...profile, ...patch });
                    if (patch.cover) coverUpdate.mutate(patch.cover);
                  },
                  onClearFieldError: () => setProfileError(null),
                  value: profile,
                }
              : null
          }
        />
      ) : null}
      {currentStep === "format" ? (
        <FormatStep
          disabled={readOnly}
          form={form}
          onFormatChange={(next) => {
            if (next === form.format) return;
            if (
              !globalThis.confirm(
                "Cambiar el formato reemplazará las reglas incompatibles. ¿Continuar?",
              )
            )
              return;
            setForm({ ...form, format: next, rules: rulesForFormat(next) });
          }}
          onRulesChange={(rules) => setForm({ ...form, rules })}
        />
      ) : null}
      {currentStep === "rules" || currentStep === "participants" || currentStep === "review" ? (
        <Card>
          <CardContent className={styles.content}>
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
      ) : null}
      <CompetitionSetupActionBarRegistration
        busy={busy}
        canContinue={currentStep !== "review"}
        canGoBack={currentStep !== "information"}
        canSave={!readOnly}
        onBack={() => move(-1)}
        onContinue={() => void continueNext()}
        onSave={() => void save()}
        review={
          currentStep === "review" && !participantsLocked && canPublish
            ? {
                onPublish: () => void publish.mutateAsync(),
                onRegistration: () =>
                  void registration.mutateAsync(registrationOpen ? "close" : "open"),
                publishDisabled: approvedParticipantCount < 2,
                publishLabel: publish.isPending ? "Publicando…" : "Publicar competición",
                registrationLabel: registrationLabel(registrationOpen, registration.isPending),
              }
            : undefined
        }
        saving={update.isPending}
        step={steps.findIndex((step) => step.id === currentStep) + 1}
        total={steps.length}
      />
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
