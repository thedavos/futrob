"use client";

import { useState } from "react";
import * as stylex from "@stylexjs/stylex";
import {
  Alert,
  AlertDescription,
  applyStyles,
  Badge,
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
  Stepper,
  Subtitle,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import type {
  CompetitionDraftDto,
  CompetitionFormatDto,
  CompetitionMatchRulesDto,
  UpdateCompetitionDraftRequest,
} from "@futrob/api-contracts";
import { COMPETITION_PERMISSION } from "@futrob/competitions";
import { useCapabilities } from "@/shared/presentation/permissions/index.ts";
import { useCompetitionTeamClubNamesQuery } from "@/modules/teams/presentation/competition-team-queries.ts";
import {
  FormatStep,
  InformationStep,
  ParticipantsStep,
  ReviewStep,
  RulesStep,
} from "./competition-setup-steps.tsx";
import { CompetitionSetupActionBarRegistration } from "./competition-setup-action-bar.tsx";
import { competitionPlatformLabel } from "./competition-draft-meta.ts";
import { PageAlert } from "./competition-setup-fields.tsx";
import { useCompetitionEntryInvitations } from "./entry-invitations/use-competition-entry-invitations.tsx";
import {
  profileFieldsFromCompetition,
  toTeamsAndSchedule,
  validateCompetitionProfileFields,
  type CompetitionProfileFieldError,
  type CompetitionProfileFieldsValue,
} from "./competition-profile-fields-value.ts";
import {
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
  body: {
    display: "grid",
    gap: "1rem",
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
/**
 * How "Continuar" leaves each step. Every save sends the whole form, so a failed background save
 * is repaired by the next one; rules wait for the server because it rejects rules the form allows.
 */
const continueSave = {
  information: "background",
  format: "background",
  rules: "confirmed",
  participants: "none",
  review: "none",
} as const satisfies Record<CompetitionSetupStep, "background" | "confirmed" | "none">;
const SETUP_CAPABILITIES = {
  update: COMPETITION_PERMISSION.update,
  manageParticipants: COMPETITION_PERMISSION.participantsManage,
  publish: COMPETITION_PERMISSION.publish,
  inviteTeams: COMPETITION_PERMISSION.invitationsManage,
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
  const clubNames = useCompetitionTeamClubNamesQuery(organizationId, competitionId);
  const update = useUpdateCompetitionDraftMutation(organizationId, competitionId);
  const remove = useRemoveCompetitionParticipantMutation(organizationId, competitionId);
  const publish = usePublishCompetitionMutation(organizationId, competitionId);
  const registration = useCompetitionRegistrationMutation(organizationId, competitionId);
  const coverUpdate = useUpdateCompetitionCoverMutation(organizationId, competitionId);
  const [profile, setProfile] = useState<CompetitionProfileFieldsValue | null>(null);
  const [profileError, setProfileError] = useState<CompetitionProfileFieldError | null>(null);
  const caps = useCapabilities({ organizationId, competitionId }, SETUP_CAPABILITIES);
  const [form, setForm] = useState<UpdateCompetitionDraftRequest | null>(null);
  const [continueInput, setContinueInput] = useState<UpdateCompetitionDraftRequest | null>(null);
  const draft = draftQuery.data ?? null;

  if (draft && form === null) {
    setForm(toUpdateInput(draft));
  }
  if (draft && profile === null) {
    setProfile(profileFieldsFromCompetition(draft.competition));
  }
  const clubs = clubNames.data ?? {};
  const approvedParticipantCount =
    participantsQuery.data?.participants.filter((entry) => entry.status === "approved").length ?? 0;
  const canUpdate = caps.update;
  const canManageParticipants = caps.manageParticipants;
  const canPublish = caps.publish;
  const status = draft?.competition.status;
  const registrationOpen = status === "registration";
  const readOnly = status !== "draft" || !canUpdate;
  const participantsLocked = status !== "draft" && status !== "registration";
  const confirmingContinue = update.isPending && update.variables === continueInput;
  const busy =
    confirmingContinue || remove.isPending || publish.isPending || registration.isPending;
  const error =
    update.error ?? remove.error ?? publish.error ?? registration.error ?? coverUpdate.error;
  const invitations = useCompetitionEntryInvitations({
    organizationId,
    competitionId,
    competition: draft?.competition ?? { name: "", gameEdition: "", platform: "pc" },
    canInvite: caps.inviteTeams && draft !== null,
    participantsLocked,
  });

  function savedInput(): UpdateCompetitionDraftRequest | null {
    if (!form || !profile) return null;
    const invalid = validateCompetitionProfileFields(profile);
    if (invalid) {
      setProfileError(invalid);
      return null;
    }
    return { ...form, ...toTeamsAndSchedule(profile) };
  }
  function save() {
    const input = readOnly ? null : savedInput();
    if (input) update.mutate(input);
  }
  function continueNext() {
    const mode = readOnly ? "none" : continueSave[currentStep];
    if (mode === "none") return move(1);
    const input = savedInput();
    if (!input) return;
    if (mode === "confirmed") {
      setContinueInput(input);
      return update.mutate(input, { onSuccess: () => move(1) });
    }
    update.mutate(input);
    move(1);
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
      <div {...applyStyles(styles.body)}>
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
                      if (patch.cover)
                        coverUpdate.mutate(patch.cover, {
                          onError: () =>
                            setProfile((current) =>
                              current ? { ...current, cover: draft.competition.cover } : current,
                            ),
                        });
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
        {currentStep === "rules" ? (
          <RulesStep
            disabled={readOnly}
            form={form}
            onChange={(rules) => setForm({ ...form, rules })}
          />
        ) : null}
        {currentStep === "participants" ? (
          <ParticipantsStep
            capacity={draft.competition.teams}
            clubs={clubs}
            clubsPending={clubNames.isPending}
            disabled={participantsLocked || busy || !canManageParticipants}
            gameEdition={draft.competition.gameEdition}
            invite={invitations.invite}
            onRemove={(id: string) => remove.mutateAsync(id)}
            participants={participantsQuery.data?.participants ?? []}
            platformLabel={competitionPlatformLabel(draft.competition.platform)}
            sentInvitations={invitations.sentInvitations}
            teams={teamsQuery.data?.teams ?? []}
          />
        ) : null}
        {invitations.dialog}
        {currentStep === "review" ? (
          <ReviewStep
            draft={draft}
            onEdit={onStepChange}
            participants={participantsQuery.data?.participants ?? []}
            teams={teamsQuery.data?.teams ?? []}
          />
        ) : null}
      </div>
      <CompetitionSetupActionBarRegistration
        busy={busy}
        canContinue={currentStep !== "review"}
        canGoBack={currentStep !== "information"}
        canSave={!readOnly}
        onBack={() => move(-1)}
        onContinue={continueNext}
        onSave={save}
        publish={
          currentStep === "review" && !participantsLocked && canPublish
            ? {
                disabled: approvedParticipantCount < draft.competition.teams.min,
                label: publish.isPending ? "Publicando…" : "Publicar competición",
                onPublish: () => void publish.mutateAsync(),
              }
            : undefined
        }
        registration={
          (currentStep === "participants" || currentStep === "review") &&
          !participantsLocked &&
          canPublish
            ? {
                label: registrationLabel(registrationOpen, registration.isPending),
                onRegistration: () =>
                  void registration.mutateAsync(registrationOpen ? "close" : "open"),
              }
            : undefined
        }
        saving={update.isPending ? (confirmingContinue ? "continue" : "draft") : null}
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
    rescheduleProposalExpiryHours: 12,
    rescheduleRequiresOpponentApproval: true,
    rescheduleRequiresOrganizerApproval: false,
  };
}
