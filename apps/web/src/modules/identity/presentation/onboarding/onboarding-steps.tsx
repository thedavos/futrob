"use client";

import { useId, useRef, useState } from "react";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  ChoiceGroup,
  ChoiceGroupIndicator,
  ChoiceGroupItem,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type StepperStep,
} from "@futrob/ui";
import {
  CircleAlert,
  Check,
  Info,
  Shield,
  Signpost,
  TicketCheck,
  Trophy,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import type {
  CompetitionFormatDto,
  CompetitionRegionDto,
  ExternalClubDto,
  GamePlatformDto,
  OnboardingPathDto,
  OnboardingStepDto,
} from "@futrob/api-contracts";
import { PlatformLogo } from "@/shared/presentation/platform-logo.tsx";
import { OnboardingActions } from "./onboarding-actions.tsx";
import { competitionFromDraft, useOnboardingFlow } from "./onboarding-flow.tsx";
import { OnboardingShell } from "./onboarding-shell.tsx";

const intentionSteps: readonly StepperStep[] = [
  { id: "intention", label: "Inicio" },
  { id: "configure", label: "Configurar" },
  { id: "review", label: "Confirmar" },
];

const stepsByPath: Record<OnboardingPathDto, readonly StepperStep[]> = {
  organization: [
    { id: "intention", label: "Inicio" },
    { id: "organization", label: "Organización" },
    { id: "competition", label: "Competición" },
    { id: "game-account", label: "Cuenta" },
    { id: "review", label: "Confirmar" },
  ],
  invitation: [
    { id: "intention", label: "Inicio" },
    { id: "invitation", label: "Invitación" },
    { id: "game-account", label: "Cuenta" },
    { id: "review", label: "Confirmar" },
  ],
  player: [
    { id: "intention", label: "Inicio" },
    { id: "game-account", label: "Cuenta" },
    { id: "team", label: "Club" },
    { id: "review", label: "Confirmar" },
  ],
};

const eaSearchPlatforms = [
  { value: "common-gen5", label: "Cross-gen" },
  { value: "ps5", label: "PlayStation 5" },
  { value: "xbox", label: "Xbox" },
  { value: "nx", label: "Nintendo Switch" },
] as const;

type EaSearchPlatform = (typeof eaSearchPlatforms)[number]["value"];

type ClubSearchState =
  | { readonly status: "idle" }
  | { readonly status: "loading"; readonly query: string }
  | {
      readonly status: "success";
      readonly query: string;
      readonly clubs: readonly ExternalClubDto[];
    }
  | { readonly status: "empty"; readonly query: string }
  | { readonly status: "error"; readonly query: string; readonly message: string };

export function IntentChoiceStep() {
  const flow = useOnboardingFlow();
  return (
    <OnboardingShell
      currentStepId="intention"
      description="Esto nos ayuda a preparar Futrob para lo que quieres hacer primero."
      error={flow.error}
      steps={flow.path ? stepsByPath[flow.path] : intentionSteps}
      title="¿Qué quieres hacer primero?"
    >
      <ChoiceGroup<OnboardingPathDto | "">
        aria-label="Intención del onboarding"
        className="grid-cols-1 sm:grid-cols-3"
        onValueChange={(value) => value && flow.setPath(value)}
        value={flow.path ?? ""}
      >
        <IntentChoice icon={Trophy} label="Organizar" value="organization">
          Crea una organización y una competición.
        </IntentChoice>
        <IntentChoice icon={TicketCheck} label="Unirme" value="invitation">
          Accede a una competición con tu código.
        </IntentChoice>
        <IntentChoice icon={UserRound} label="Empezar como jugador" value="player">
          Crea tu espacio personal.
        </IntentChoice>
      </ChoiceGroup>
      <OnboardingActions
        disabled={!flow.path}
        loading={flow.saving}
        onPrimary={() => {
          if (!flow.path) return;
          const next =
            flow.path === "organization"
              ? "organization"
              : flow.path === "invitation"
                ? "invitation"
                : "game-account";
          void flow.goTo(next, flow.path);
        }}
        primaryLabel="Continuar"
      />
    </OnboardingShell>
  );
}

function IntentChoice({
  icon: Icon,
  label,
  value,
  children,
}: {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly value: OnboardingPathDto;
  readonly children: string;
}) {
  return (
    <ChoiceGroupItem value={value}>
      <ChoiceGroupIndicator />
      <Icon aria-hidden="true" className="size-8" />
      <span className="grid min-w-0 gap-1">
        <span className="font-semibold">{label}</span>
        <span className="typo-caption text-muted-foreground">{children}</span>
      </span>
    </ChoiceGroupItem>
  );
}

export function OrganizationStep() {
  const flow = useOnboardingFlow();
  const inputRef = useRef<HTMLInputElement>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const name = flow.draft.organizationName;

  async function continueToReview() {
    const trimmed = name.trim();
    if (trimmed.length === 0 || trimmed.length > 120) {
      setValidationError(
        trimmed.length === 0
          ? "Escribe el nombre de la organización."
          : "El nombre debe tener como máximo 120 caracteres.",
      );
      inputRef.current?.focus();
      return;
    }
    const available = await flow.checkOrganizationName(trimmed);
    if (available === null) return;
    if (!available) {
      setValidationError("Ese nombre ya está en uso. Elige otro.");
      inputRef.current?.focus();
      return;
    }
    flow.updateDraft({ organizationName: trimmed });
    void flow.goTo("competition", "organization");
  }

  return (
    <OnboardingShell
      currentStepId="organization"
      description="Esta será la organización desde la que administrarás competiciones, equipos y resultados."
      error={flow.error}
      steps={stepsByPath.organization}
      title="Crea tu organización"
    >
      <div className="mx-auto w-full max-w-xl">
        <Field invalid={Boolean(validationError)}>
          <FieldLabel htmlFor="organization-name">Nombre de la organización</FieldLabel>
          <Input
            aria-describedby={validationError ? "organization-name-error" : undefined}
            aria-invalid={Boolean(validationError)}
            autoComplete="organization"
            id="organization-name"
            maxLength={120}
            onChange={(event) => {
              flow.updateDraft({ organizationName: event.target.value });
              setValidationError(null);
            }}
            ref={inputRef}
            value={name}
          />
          {validationError ? (
            <FieldError id="organization-name-error" match>
              {validationError}
            </FieldError>
          ) : null}
        </Field>
      </div>
      <OnboardingActions
        loading={flow.saving}
        onBack={() => void flow.goTo("intention", "organization")}
        onPrimary={() => void continueToReview()}
        primaryLabel="Revisar organización"
      />
    </OnboardingShell>
  );
}

export function InvitationStep() {
  const flow = useOnboardingFlow();
  const inputRef = useRef<HTMLInputElement>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  function continueToReview() {
    if (!flow.draft.invitationToken.trim()) {
      setValidationError("Pega el código de invitación para continuar.");
      inputRef.current?.focus();
      return;
    }
    void flow.goTo("game-account", "invitation");
  }

  return (
    <OnboardingShell
      currentStepId="invitation"
      description="Escribe el código que recibiste para unirte a la competición al confirmar."
      error={flow.error}
      steps={stepsByPath.invitation}
      title="Únete a una competición"
    >
      <div className="mx-auto w-full max-w-xl">
        <Field invalid={Boolean(validationError)}>
          <FieldLabel htmlFor="invitation-token">Código de invitación</FieldLabel>
          <Input
            aria-describedby={
              validationError ? "invitation-token-error" : "invitation-token-description"
            }
            aria-invalid={Boolean(validationError)}
            autoComplete="off"
            id="invitation-token"
            onChange={(event) => {
              flow.updateDraft({ invitationToken: event.target.value });
              setValidationError(null);
            }}
            placeholder="Pega el código que recibiste"
            ref={inputRef}
            value={flow.draft.invitationToken}
          />
          {validationError ? (
            <FieldError id="invitation-token-error" match>
              {validationError}
            </FieldError>
          ) : (
            <FieldDescription id="invitation-token-description">
              Comprobaremos el código al confirmar. No se guardará con tu progreso.
            </FieldDescription>
          )}
        </Field>
      </div>
      <OnboardingActions
        loading={flow.saving}
        onBack={() => void flow.goTo("intention", "invitation")}
        onPrimary={continueToReview}
        onSkip={() => {
          flow.updateDraft({ invitationToken: "" });
          void flow.goTo("game-account", "player");
        }}
        primaryLabel="Configurar cuenta"
        skipLabel="Continuar como jugador"
      />
    </OnboardingShell>
  );
}

const competitionRegions: readonly { value: CompetitionRegionDto; label: string }[] = [
  { value: "america", label: "América" },
  { value: "south-america", label: "Sudamérica" },
  { value: "north-central-america", label: "Norte y Centroamérica" },
  { value: "europe", label: "Europa" },
  { value: "africa", label: "África" },
  { value: "asia", label: "Asia" },
  { value: "middle-east", label: "Medio Oriente" },
  { value: "oceania", label: "Oceanía" },
];

const competitionFormats: readonly { value: CompetitionFormatDto; label: string }[] = [
  { value: "league", label: "Liga" },
  { value: "knockout", label: "Eliminación directa" },
  { value: "groups-knockout", label: "Grupos + eliminación" },
  { value: "league-playoffs", label: "Liga + playoffs" },
];

const fallbackCompetitionTimeZones = [
  "America/Lima",
  "America/Bogota",
  "America/Mexico_City",
  "America/New_York",
  "America/Santiago",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Madrid",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Tokyo",
  "Australia/Sydney",
] as const;

const competitionTimeZones = getCompetitionTimeZones();

type CompetitionInvalidField = "name" | "edition" | "platform" | "region" | "time-zone" | "format";

export function CompetitionStep() {
  const flow = useOnboardingFlow();
  const editionLabelId = useId();
  const platformLabelId = useId();
  const errorId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const customEditionRef = useRef<HTMLInputElement>(null);
  const timeZoneRef = useRef<HTMLButtonElement>(null);
  const [validation, setValidation] = useState<{
    readonly field: CompetitionInvalidField;
    readonly message: string;
  } | null>(null);
  const draft = flow.draft;

  function invalidate(field: CompetitionInvalidField, message: string) {
    setValidation({ field, message });
    if (field === "name") nameRef.current?.focus();
    else if (field === "edition") {
      if (draft.customCompetitionGameEdition) customEditionRef.current?.focus();
      else document.querySelector<HTMLElement>("[data-competition-edition] [role=radio]")?.focus();
    } else if (field === "platform") {
      document.querySelector<HTMLElement>("[data-competition-platform] [role=radio]")?.focus();
    } else if (field === "time-zone") timeZoneRef.current?.focus();
    else {
      document.querySelector<HTMLElement>(`[data-competition-${field}] button`)?.focus();
    }
  }

  function continueToAccount() {
    const name = draft.competitionName.trim();
    const edition = draft.competitionGameEdition.trim();
    if (!name || name.length > 120) {
      invalidate(
        "name",
        name
          ? "El nombre debe tener como máximo 120 caracteres."
          : "Escribe el nombre de la competición.",
      );
      return;
    }
    if (!edition || edition.length > 40) {
      invalidate(
        "edition",
        edition
          ? "La edición debe tener como máximo 40 caracteres."
          : "Selecciona o escribe la edición del juego.",
      );
      return;
    }
    if (!draft.competitionPlatform) {
      invalidate("platform", "Selecciona la plataforma de la competición.");
      return;
    }
    if (!draft.competitionRegion) {
      invalidate("region", "Selecciona la región de la competición.");
      return;
    }
    if (!isIanaTimeZone(draft.competitionTimeZone)) {
      invalidate("time-zone", "Selecciona una zona horaria válida.");
      return;
    }
    if (!draft.competitionFormat) {
      invalidate("format", "Selecciona el formato inicial de la competición.");
      return;
    }
    flow.updateDraft({
      competitionName: name,
      competitionGameEdition: edition,
      competitionTimeZone: draft.competitionTimeZone.trim(),
    });
    void flow.goTo("game-account", "organization");
  }

  return (
    <OnboardingShell
      currentStepId="competition"
      description="Crea un borrador de FC Clubs. Configurarás los equipos, el calendario y la publicación después."
      error={flow.error}
      steps={stepsByPath.organization}
      title="Configura tu primera competición"
    >
      <div className="mx-auto grid w-full max-w-2xl gap-8">
        <Field className="gap-3" invalid={validation?.field === "name"}>
          <FieldLabel htmlFor="competition-name">Nombre de la competición</FieldLabel>
          <Input
            aria-describedby={validation?.field === "name" ? errorId : undefined}
            aria-invalid={validation?.field === "name"}
            id="competition-name"
            maxLength={120}
            onChange={(event) => {
              flow.updateDraft({ competitionName: event.target.value });
              setValidation(null);
            }}
            placeholder="ej. Liga Futrob Apertura"
            ref={nameRef}
            value={draft.competitionName}
          />
          {validation?.field === "name" ? (
            <FieldError id={errorId} match>
              {validation.message}
            </FieldError>
          ) : null}
        </Field>

        <fieldset className="m-0 border-0 p-0" data-competition-edition>
          <legend className="mb-3 typo-label" id={editionLabelId}>
            Edición del juego
          </legend>
          <ChoiceGroup
            aria-describedby={validation?.field === "edition" ? errorId : undefined}
            aria-invalid={validation?.field === "edition"}
            aria-labelledby={editionLabelId}
            className="grid-cols-1 sm:grid-cols-3"
            onValueChange={(value: string) => {
              const custom = value === "__other__";
              flow.updateDraft({
                customCompetitionGameEdition: custom,
                competitionGameEdition: custom ? "" : value,
              });
              setValidation(null);
            }}
            value={draft.customCompetitionGameEdition ? "__other__" : draft.competitionGameEdition}
          >
            {["FC 26", "FC 27"].map((edition) => (
              <ChoiceGroupItem appearance="pill" key={edition} value={edition}>
                <ChoiceGroupIndicator className="static size-5" />
                {edition}
              </ChoiceGroupItem>
            ))}
            <ChoiceGroupItem appearance="pill" value="__other__">
              <ChoiceGroupIndicator className="static size-5" />
              Otra edición
            </ChoiceGroupItem>
          </ChoiceGroup>
          {draft.customCompetitionGameEdition ? (
            <Field className="mt-4 gap-3" invalid={validation?.field === "edition"}>
              <FieldLabel htmlFor="custom-competition-edition">Nombre de la edición</FieldLabel>
              <Input
                aria-describedby={validation?.field === "edition" ? errorId : undefined}
                aria-invalid={validation?.field === "edition"}
                id="custom-competition-edition"
                maxLength={40}
                onChange={(event) => {
                  flow.updateDraft({ competitionGameEdition: event.target.value });
                  setValidation(null);
                }}
                placeholder="ej. FC 28"
                ref={customEditionRef}
                value={draft.competitionGameEdition}
              />
              {validation?.field === "edition" ? (
                <FieldError id={errorId} match>
                  {validation.message}
                </FieldError>
              ) : null}
            </Field>
          ) : validation?.field === "edition" ? (
            <FieldsetError id={errorId}>{validation.message}</FieldsetError>
          ) : null}
        </fieldset>

        <fieldset className="m-0 border-0 p-0" data-competition-platform>
          <legend className="mb-3 typo-label" id={platformLabelId}>
            Plataforma de la competición
          </legend>
          <ChoiceGroup<GamePlatformDto | "">
            aria-describedby={validation?.field === "platform" ? errorId : undefined}
            aria-invalid={validation?.field === "platform"}
            aria-labelledby={platformLabelId}
            className="grid-cols-1 sm:grid-cols-3 lg:grid-cols-5"
            onValueChange={(value) => {
              if (value) flow.updateDraft({ competitionPlatform: value });
              setValidation(null);
            }}
            value={draft.competitionPlatform ?? ""}
          >
            <PlatformChoice label="PlayStation" value="playstation" />
            <PlatformChoice label="Xbox" value="xbox" />
            <PlatformChoice label="PC" value="pc" />
            <PlatformChoice label="Nintendo Switch 1" value="nintendo-switch-1" />
            <PlatformChoice label="Nintendo Switch 2" value="nintendo-switch-2" />
          </ChoiceGroup>
          {validation?.field === "platform" ? (
            <FieldsetError id={errorId}>{validation.message}</FieldsetError>
          ) : null}
        </fieldset>

        <div className="grid gap-8 sm:grid-cols-2 sm:gap-4">
          <Field className="gap-3" invalid={validation?.field === "region"} data-competition-region>
            <FieldLabel htmlFor="competition-region">Región deportiva</FieldLabel>
            <Select
              items={competitionRegions}
              onValueChange={(value) => {
                if (value) flow.updateDraft({ competitionRegion: value as CompetitionRegionDto });
                setValidation(null);
              }}
              value={draft.competitionRegion}
            >
              <SelectTrigger
                aria-describedby={validation?.field === "region" ? errorId : undefined}
                aria-invalid={validation?.field === "region"}
                id="competition-region"
              >
                <SelectValue placeholder="Selecciona una región" />
              </SelectTrigger>
              <SelectContent>
                {competitionRegions.map((region) => (
                  <SelectItem key={region.value} value={region.value}>
                    {region.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {validation?.field === "region" ? (
              <FieldError id={errorId} match>
                {validation.message}
              </FieldError>
            ) : null}
          </Field>

          <Field className="gap-3" invalid={validation?.field === "time-zone"}>
            <FieldLabel htmlFor="competition-time-zone">Zona horaria</FieldLabel>
            <Select
              items={competitionTimeZones}
              onValueChange={(value) => {
                if (value) flow.updateDraft({ competitionTimeZone: value });
                setValidation(null);
              }}
              value={draft.competitionTimeZone}
            >
              <SelectTrigger
                aria-describedby={validation?.field === "time-zone" ? errorId : undefined}
                aria-invalid={validation?.field === "time-zone"}
                id="competition-time-zone"
                ref={timeZoneRef}
              >
                <SelectValue placeholder="Selecciona una zona horaria" />
              </SelectTrigger>
              <SelectContent className="max-h-(--available-height) overflow-y-auto overscroll-contain">
                {competitionTimeZones.map((timeZone) => (
                  <SelectItem key={timeZone.value} value={timeZone.value}>
                    {timeZone.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {validation?.field === "time-zone" ? (
              <FieldError id={errorId} match>
                {validation.message}
              </FieldError>
            ) : null}
          </Field>
        </div>

        <Field className="gap-3" invalid={validation?.field === "format"} data-competition-format>
          <FieldLabel htmlFor="competition-format">Formato inicial</FieldLabel>
          <Select
            items={competitionFormats}
            onValueChange={(value) => {
              if (value) flow.updateDraft({ competitionFormat: value as CompetitionFormatDto });
              setValidation(null);
            }}
            value={draft.competitionFormat}
          >
            <SelectTrigger
              aria-describedby={validation?.field === "format" ? errorId : undefined}
              aria-invalid={validation?.field === "format"}
              id="competition-format"
            >
              <SelectValue placeholder="Selecciona un formato" />
            </SelectTrigger>
            <SelectContent>
              {competitionFormats.map((format) => (
                <SelectItem key={format.value} value={format.value}>
                  {format.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>
            Las reglas iniciales se asignarán según el formato y podrás ajustarlas antes de
            publicar.
          </FieldDescription>
          {validation?.field === "format" ? (
            <FieldError id={errorId} match>
              {validation.message}
            </FieldError>
          ) : null}
        </Field>
      </div>
      <OnboardingActions
        loading={flow.saving}
        onBack={() => void flow.goTo("organization", "organization")}
        onPrimary={continueToAccount}
        primaryLabel="Configurar cuenta"
      />
    </OnboardingShell>
  );
}

export function GameAccountStep() {
  const flow = useOnboardingFlow();
  const path = flow.path ?? "player";
  const platformLabelId = useId();
  const editionLabelId = useId();
  const validationErrorId = useId();
  const identifierRef = useRef<HTMLInputElement>(null);
  const customEditionRef = useRef<HTMLInputElement>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const draft = flow.draft;
  const hasAny = Boolean(
    draft.gameAccountIdentifier.trim() || draft.platform || draft.gameEdition.trim(),
  );
  const invalidField = validationError
    ? !draft.gameAccountIdentifier.trim()
      ? "identifier"
      : !draft.platform
        ? "platform"
        : !draft.gameEdition.trim()
          ? "edition"
          : null
    : null;

  function continueAfterAccount() {
    if (!draft.gameAccountIdentifier.trim()) {
      setValidationError("Escribe tu identificador de EA.");
      identifierRef.current?.focus();
      return;
    }
    if (!draft.platform) {
      setValidationError("Selecciona la plataforma de esta cuenta.");
      document.querySelector<HTMLElement>("[data-platform-group] [role=radio]")?.focus();
      return;
    }
    if (!draft.gameEdition.trim()) {
      setValidationError("Selecciona o escribe la edición del juego.");
      if (draft.customGameEdition) customEditionRef.current?.focus();
      else document.querySelector<HTMLElement>("[data-edition-group] [role=radio]")?.focus();
      return;
    }
    flow.updateDraft({
      gameAccountIdentifier: draft.gameAccountIdentifier.trim(),
      gameEdition: draft.gameEdition.trim(),
    });
    void flow.goTo(path === "player" ? "team" : "review", path);
  }

  return (
    <OnboardingShell
      currentStepId="game-account"
      description="Registra tu identificador de EA sin compartir credenciales. Futrob lo usará para localizar tus partidos y estadísticas."
      error={flow.error}
      steps={stepsByPath[path]}
      title="Configura tus datos de juego"
    >
      <div className="mx-auto grid w-full max-w-2xl gap-8">
        {path === "organization" &&
        flow.draft.competitionPlatform &&
        flow.draft.competitionGameEdition.trim() ? (
          <Alert
            className="sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-x-4 sm:[&>svg]:mt-0"
            variant="info"
          >
            <Info aria-hidden="true" />
            <AlertDescription>
              La cuenta es personal, pero puedes usar la misma edición y plataforma de la
              competición.
            </AlertDescription>
            <Button
              className="col-start-2 mt-2 w-full sm:col-start-3 sm:row-start-1 sm:mt-0 sm:w-auto"
              onClick={() =>
                flow.updateDraft({
                  platform: flow.draft.competitionPlatform,
                  gameEdition: flow.draft.competitionGameEdition,
                  customGameEdition: !["FC 26", "FC 27"].includes(
                    flow.draft.competitionGameEdition,
                  ),
                })
              }
              variant="outline"
            >
              Usar datos de la competición
            </Button>
          </Alert>
        ) : null}
        <Field
          className="gap-3"
          invalid={Boolean(validationError && !draft.gameAccountIdentifier.trim())}
        >
          <FieldLabel htmlFor="game-account-identifier">Identificador de EA</FieldLabel>
          <Input
            aria-describedby={invalidField === "identifier" ? validationErrorId : undefined}
            aria-invalid={Boolean(validationError && !draft.gameAccountIdentifier.trim())}
            autoComplete="off"
            id="game-account-identifier"
            maxLength={80}
            onChange={(event) => {
              flow.updateDraft({ gameAccountIdentifier: event.target.value });
              setValidationError(null);
            }}
            placeholder="ej. gamer23"
            ref={identifierRef}
            value={draft.gameAccountIdentifier}
          />
          {invalidField === "identifier" ? (
            <FieldError id={validationErrorId} match>
              {validationError}
            </FieldError>
          ) : null}
        </Field>

        <fieldset className="m-0 border-0 p-0" data-platform-group>
          <legend className="mb-3 typo-label" id={platformLabelId}>
            Plataforma
          </legend>
          <ChoiceGroup<GamePlatformDto | "">
            aria-describedby={invalidField === "platform" ? validationErrorId : undefined}
            aria-invalid={invalidField === "platform"}
            aria-labelledby={platformLabelId}
            className="grid-cols-1 sm:grid-cols-3 lg:grid-cols-5"
            onValueChange={(value) => {
              if (value) flow.updateDraft({ platform: value });
              setValidationError(null);
            }}
            value={draft.platform ?? ""}
          >
            <PlatformChoice label="PlayStation" value="playstation" />
            <PlatformChoice label="Xbox" value="xbox" />
            <PlatformChoice label="PC" value="pc" />
            <PlatformChoice label="Nintendo Switch 1" value="nintendo-switch-1" />
            <PlatformChoice label="Nintendo Switch 2" value="nintendo-switch-2" />
          </ChoiceGroup>
          {invalidField === "platform" ? (
            <FieldsetError id={validationErrorId}>{validationError}</FieldsetError>
          ) : null}
        </fieldset>

        <fieldset className="m-0 border-0 p-0" data-edition-group>
          <legend className="mb-3 typo-label" id={editionLabelId}>
            Edición del juego
          </legend>
          <ChoiceGroup
            aria-describedby={invalidField === "edition" ? validationErrorId : undefined}
            aria-invalid={invalidField === "edition"}
            aria-labelledby={editionLabelId}
            className="grid-cols-1 sm:grid-cols-3"
            onValueChange={(value: string) => {
              const custom = value === "__other__";
              flow.updateDraft({ customGameEdition: custom, gameEdition: custom ? "" : value });
              setValidationError(null);
            }}
            value={draft.customGameEdition ? "__other__" : draft.gameEdition}
          >
            {["FC 26", "FC 27"].map((edition) => (
              <ChoiceGroupItem appearance="pill" key={edition} value={edition}>
                <ChoiceGroupIndicator className="static size-5" />
                {edition}
              </ChoiceGroupItem>
            ))}
            <ChoiceGroupItem appearance="pill" value="__other__">
              <ChoiceGroupIndicator className="static size-5" />
              Otra edición
            </ChoiceGroupItem>
          </ChoiceGroup>
          {draft.customGameEdition ? (
            <Field className="mt-4 gap-3" invalid={invalidField === "edition"}>
              <FieldLabel htmlFor="custom-game-edition">Nombre de la edición</FieldLabel>
              <Input
                aria-describedby={invalidField === "edition" ? validationErrorId : undefined}
                aria-invalid={invalidField === "edition"}
                id="custom-game-edition"
                maxLength={40}
                onChange={(event) => {
                  flow.updateDraft({ gameEdition: event.target.value });
                  setValidationError(null);
                }}
                placeholder="ej. FC 28"
                ref={customEditionRef}
                value={draft.gameEdition}
              />
              {invalidField === "edition" ? (
                <FieldError id={validationErrorId} match>
                  {validationError}
                </FieldError>
              ) : null}
            </Field>
          ) : invalidField === "edition" ? (
            <FieldsetError id={validationErrorId}>{validationError}</FieldsetError>
          ) : null}
        </fieldset>
      </div>
      <OnboardingActions
        loading={flow.saving}
        onBack={() =>
          void flow.goTo(
            path === "organization"
              ? "competition"
              : path === "invitation"
                ? "invitation"
                : "intention",
            path,
          )
        }
        onPrimary={continueAfterAccount}
        onSkip={() => {
          flow.clearGameAccount();
          setValidationError(null);
          void flow.goTo(path === "player" ? "team" : "review", path);
        }}
        primaryLabel={
          path === "player"
            ? hasAny
              ? "Continuar"
              : "Vincular y continuar"
            : hasAny
              ? "Revisar cuenta"
              : "Vincular y revisar"
        }
      />
    </OnboardingShell>
  );
}

function PlatformChoice({
  label,
  value,
}: {
  readonly label: string;
  readonly value: GamePlatformDto;
}) {
  return (
    <ChoiceGroupItem value={value}>
      <ChoiceGroupIndicator />
      <PlatformLogo className="size-8" platform={value} />
      <span className="font-semibold">{label}</span>
    </ChoiceGroupItem>
  );
}

export function TeamStep() {
  const flow = useOnboardingFlow();
  const clubNameId = useId();
  const statusId = useId();
  const queryRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState<EaSearchPlatform>("common-gen5");
  const [search, setSearch] = useState<ClubSearchState>({ status: "idle" });
  const selected = flow.draft.selectedExternalClub;

  async function searchClubs() {
    const trimmed = query.trim();
    if (!trimmed || search.status === "loading" || flow.saving) return;
    setSearch({ status: "loading", query: trimmed });
    try {
      const clubs = await flow.searchExternalClubs({
        query: trimmed,
        platform,
        gameEdition: "fc26",
      });
      setSearch(
        clubs.length > 0
          ? { status: "success", query: trimmed, clubs }
          : { status: "empty", query: trimmed },
      );
    } catch {
      setSearch({
        status: "error",
        query: trimmed,
        message: "No pudimos buscar clubs. Inténtalo nuevamente.",
      });
    }
  }

  function selectClub(club: ExternalClubDto) {
    flow.updateDraft({
      selectedExternalClub: {
        providerKey: club.providerKey,
        externalClubId: club.externalClubId,
        platform: club.platform,
        gameEdition: club.gameEdition,
        name: club.name,
      },
    });
  }

  const liveStatus =
    search.status === "loading"
      ? `Buscando clubs para «${search.query}»…`
      : search.status === "empty"
        ? `No encontramos clubs para «${search.query}».`
        : search.status === "error"
          ? search.message
          : search.status === "success"
            ? `${search.clubs.length} club${search.clubs.length === 1 ? "" : "s"} encontrado${search.clubs.length === 1 ? "" : "s"}.`
            : null;

  return (
    <OnboardingShell
      currentStepId="team"
      description="Busca tu club de EA Clubs para asociarlo a tu perfil. No crea un equipo de organización."
      error={flow.error}
      steps={stepsByPath.player}
      title="Asocia tu club EA"
    >
      <div className="mx-auto grid w-full max-w-2xl gap-6">
        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-3 typo-label">Plataforma EA</legend>
          <ChoiceGroup<EaSearchPlatform>
            aria-label="Plataforma EA para la búsqueda"
            className="grid-cols-2 sm:grid-cols-4"
            onValueChange={(value) => {
              if (!value) return;
              setPlatform(value);
              setSearch({ status: "idle" });
            }}
            value={platform}
          >
            {eaSearchPlatforms.map((option) => (
              <ChoiceGroupItem appearance="pill" key={option.value} value={option.value}>
                <ChoiceGroupIndicator className="static size-5" />
                {option.label}
              </ChoiceGroupItem>
            ))}
          </ChoiceGroup>
        </fieldset>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <Field className="gap-3">
            <FieldLabel htmlFor={clubNameId}>Nombre del club</FieldLabel>
            <Input
              autoComplete="off"
              id={clubNameId}
              maxLength={80}
              onChange={(event) => {
                setQuery(event.target.value);
                if (search.status !== "idle" && search.status !== "loading") {
                  setSearch({ status: "idle" });
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void searchClubs();
                }
              }}
              placeholder="ej. Night Owls"
              ref={queryRef}
              value={query}
            />
          </Field>
          <Button
            className="w-full sm:w-auto"
            disabled={!query.trim() || search.status === "loading" || flow.saving}
            onClick={() => void searchClubs()}
            variant="outline"
          >
            {search.status === "loading" ? "Buscando…" : "Buscar club"}
          </Button>
        </div>

        <div aria-live="polite" className="min-h-5 typo-caption text-muted-foreground" id={statusId}>
          {liveStatus}
        </div>

        {search.status === "error" ? (
          <Alert variant="destructive">
            <CircleAlert aria-hidden="true" />
            <AlertDescription>{search.message}</AlertDescription>
          </Alert>
        ) : null}

        {search.status === "success" ? (
          <ChoiceGroup
            aria-describedby={statusId}
            aria-label="Resultados de clubs EA"
            className="grid-cols-1"
            onValueChange={(value: string) => {
              const club = search.clubs.find((item) => item.externalClubId === value);
              if (club) selectClub(club);
            }}
            value={selected?.externalClubId ?? ""}
          >
            {search.clubs.map((club) => {
              const isSelected = selected?.externalClubId === club.externalClubId;
              return (
                <ChoiceGroupItem key={club.externalClubId} value={club.externalClubId}>
                  <ChoiceGroupIndicator />
                  <span className="grid min-w-0 flex-1 gap-1 text-left">
                    <span className="font-semibold">{club.name}</span>
                    <span className="typo-caption text-muted-foreground">
                      {eaPlatformLabel(club.platform)} · {club.gameEdition} · ID{" "}
                      {club.externalClubId}
                    </span>
                  </span>
                  {isSelected ? (
                    <span className="inline-flex items-center gap-1 typo-caption text-foreground">
                      <Check aria-hidden="true" className="size-4" strokeWidth={2} />
                      Seleccionado
                    </span>
                  ) : null}
                </ChoiceGroupItem>
              );
            })}
          </ChoiceGroup>
        ) : null}

        {selected && search.status !== "success" ? (
          <p className="typo-caption text-muted-foreground">
            Club seleccionado: {selected.name} · {eaPlatformLabel(selected.platform)} · ID{" "}
            {selected.externalClubId}
          </p>
        ) : null}
      </div>
      <OnboardingActions
        disabled={!selected}
        loading={flow.saving}
        onBack={() => void flow.goTo("game-account", "player")}
        onPrimary={() => void flow.goTo("review", "player")}
        onSkip={() => {
          flow.clearExternalClub();
          setSearch({ status: "idle" });
          setQuery("");
          void flow.goTo("review", "player");
        }}
        primaryLabel="Revisar club"
      />
    </OnboardingShell>
  );
}

export function OnboardingReview() {
  const flow = useOnboardingFlow();
  const path = flow.path ?? "player";
  const rows = reviewRows(flow);
  const canFinish =
    path === "organization"
      ? validOrganizationName(flow.draft.organizationName) &&
        Boolean(competitionFromDraft(flow.draft)) &&
        validOptionalAccount(flow.draft)
      : path === "invitation"
        ? Boolean(flow.draft.invitationToken.trim()) && validOptionalAccount(flow.draft)
        : validOptionalAccount(flow.draft);
  const previous: OnboardingStepDto = path === "player" ? "team" : "game-account";
  const primaryLabel =
    path === "organization"
      ? "Crear organización y competición"
      : path === "invitation"
        ? "Aceptar invitación"
        : "Entrar a mi espacio";

  return (
    <OnboardingShell
      currentStepId="review"
      description="Revisa qué se guardará al confirmar. Si recargas o cierras esta página antes de confirmar, tendrás que completar los datos otra vez."
      error={flow.error}
      steps={stepsByPath[path]}
      title="Confirma tu configuración"
    >
      <Card className="mx-auto w-full max-w-2xl">
        <CardContent className="p-0">
          <dl>
            {rows.map((row) => (
              <div
                className="grid min-h-16 gap-1 border-t border-border-subtle px-5 py-4 first:border-t-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-x-6 sm:px-6"
                key={row.label}
              >
                <dt className="flex items-center gap-3 font-semibold">
                  <row.icon aria-hidden="true" className="size-5" />
                  {row.label}
                </dt>
                <dd className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 pl-8 text-left sm:flex sm:justify-end sm:pl-0 sm:text-right">
                  {row.value ? (
                    <span>{row.value}</span>
                  ) : (
                    <Badge variant="neutral">Pendiente</Badge>
                  )}
                  {row.editStep ? (
                    <Button
                      aria-label={`Editar ${row.label.toLowerCase()}`}
                      onClick={() => void flow.goTo(row.editStep!, path)}
                      variant="link"
                    >
                      Editar
                    </Button>
                  ) : null}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
      {!canFinish ? (
        <p className="mt-4 text-center typo-caption text-muted-foreground">
          Completa los datos pendientes antes de confirmar.
        </p>
      ) : null}
      <OnboardingActions
        disabled={!canFinish}
        loading={flow.saving}
        onBack={() => void flow.goTo(previous, path)}
        onPrimary={() => void flow.finish()}
        primaryLabel={primaryLabel}
      />
    </OnboardingShell>
  );
}

interface OnboardingReviewRow {
  readonly label: string;
  readonly value: string | null;
  readonly icon: LucideIcon;
  readonly editStep?: OnboardingStepDto;
}

function reviewRows(flow: ReturnType<typeof useOnboardingFlow>): readonly OnboardingReviewRow[] {
  const selectedPath = flow.path ?? "player";
  const intention = {
    organization: "Organizar",
    invitation: "Unirme",
    player: "Empezar como jugador",
  }[selectedPath];
  const base: OnboardingReviewRow = {
    label: "Cómo empezarás",
    value: intention,
    icon: Signpost,
    editStep: "intention",
  };
  if (flow.path === "organization") {
    return [
      base,
      {
        label: "Organización",
        value: flow.draft.organizationName.trim() || null,
        icon: UsersRound,
        editStep: "organization",
      },
      {
        label: "Competición",
        value: competitionFromDraft(flow.draft)
          ? `${flow.draft.competitionName.trim()} · ${formatLabel(flow.draft.competitionFormat!)} · ${platformLabel(flow.draft.competitionPlatform!)}`
          : null,
        icon: Trophy,
        editStep: "competition",
      },
      accountReviewRow(flow),
    ];
  }
  if (flow.path === "invitation") {
    return [
      base,
      {
        label: "Competición",
        value: flow.draft.invitationToken.trim() ? "Invitación lista para validar" : null,
        icon: TicketCheck,
        editStep: "invitation",
      },
      accountReviewRow(flow),
    ];
  }
  return [base, accountReviewRow(flow), clubReviewRow(flow)];
}

function FieldsetError({
  id,
  children,
}: {
  readonly id: string;
  readonly children: string | null;
}) {
  return (
    <p className="mt-3 flex items-start gap-1.5 typo-caption text-danger" id={id}>
      <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} />
      <span>{children}</span>
    </p>
  );
}

function accountReviewRow(flow: ReturnType<typeof useOnboardingFlow>): OnboardingReviewRow {
  const accountComplete = validCompleteAccount(flow.draft);
  return {
    label: "Cuenta de juego",
    value: accountComplete
      ? `${flow.draft.gameAccountIdentifier.trim()} · ${platformLabel(flow.draft.platform!)} · ${flow.draft.gameEdition.trim()}`
      : "Perfil de jugador listo · Datos EA para después",
    icon: UserRound,
    editStep: "game-account",
  };
}

function clubReviewRow(flow: ReturnType<typeof useOnboardingFlow>): OnboardingReviewRow {
  const club = flow.draft.selectedExternalClub;
  return {
    label: "Club EA",
    value: club
      ? `${club.name} · ${eaPlatformLabel(club.platform)} · ID ${club.externalClubId}`
      : "Sin club asociado por ahora",
    icon: Shield,
    editStep: "team",
  };
}

function validOrganizationName(value: string): boolean {
  const length = value.trim().length;
  return length > 0 && length <= 120;
}

function validCompleteAccount(draft: ReturnType<typeof useOnboardingFlow>["draft"]): boolean {
  return Boolean(draft.gameAccountIdentifier.trim() && draft.platform && draft.gameEdition.trim());
}

function validOptionalAccount(draft: ReturnType<typeof useOnboardingFlow>["draft"]): boolean {
  const empty = !draft.gameAccountIdentifier.trim() && !draft.platform && !draft.gameEdition.trim();
  return empty || validCompleteAccount(draft);
}

function platformLabel(platform: GamePlatformDto): string {
  return {
    playstation: "PlayStation",
    xbox: "Xbox",
    pc: "PC",
    "nintendo-switch-1": "Nintendo Switch 1",
    "nintendo-switch-2": "Nintendo Switch 2",
  }[platform];
}

function eaPlatformLabel(platform: string): string {
  return eaSearchPlatforms.find((option) => option.value === platform)?.label ?? platform;
}

function formatLabel(format: CompetitionFormatDto): string {
  return competitionFormats.find((option) => option.value === format)?.label ?? format;
}

function isIanaTimeZone(value: string): boolean {
  if (!value.trim()) return false;
  try {
    new Intl.DateTimeFormat("es", { timeZone: value.trim() }).format();
    return true;
  } catch {
    return false;
  }
}

function getCompetitionTimeZones(): readonly { value: string; label: string }[] {
  let values: readonly string[] = fallbackCompetitionTimeZones;
  let localTimeZone = "UTC";
  try {
    localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    if (typeof Intl.supportedValuesOf === "function") {
      values = Intl.supportedValuesOf("timeZone");
    }
  } catch {
    values = fallbackCompetitionTimeZones;
  }
  return [...new Set(["UTC", localTimeZone, ...values])].map((value) => ({
    value,
    label: value.replaceAll("_", " "),
  }));
}
