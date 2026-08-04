"use client";

import { useId, useRef, useState } from "react";
import {
  ChoiceGroup,
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
} from "@futrob/ui";
import type {
  CompetitionFormatDto,
  CompetitionRegionDto,
  GamePlatformDto,
} from "@futrob/api-contracts";
import { GAME_PLATFORM } from "@futrob/shared-kernel";
import { FieldsetError } from "../fields/fieldset-error.tsx";
import { GameEditionField } from "../fields/game-edition-field.tsx";
import { PlatformChoice } from "../fields/platform-choice.tsx";
import { OnboardingActions } from "../onboarding-actions.tsx";
import { isIanaTimeZone } from "../onboarding-draft-validators.ts";
import { useOnboardingFlow } from "../onboarding-flow.tsx";
import { OnboardingShell } from "../onboarding-shell.tsx";
import {
  competitionFormats,
  competitionRegions,
  competitionTimeZones,
  stepsByPath,
} from "../onboarding-step-meta.ts";

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

        <GameEditionField
          custom={draft.customCompetitionGameEdition}
          customInputId="custom-competition-edition"
          customInputRef={customEditionRef}
          errorId={errorId}
          errorMessage={validation?.field === "edition" ? validation.message : null}
          invalid={validation?.field === "edition"}
          legendId={editionLabelId}
          onValueChange={({ value, custom }) => {
            flow.updateDraft({
              customCompetitionGameEdition: custom,
              competitionGameEdition: value,
            });
            setValidation(null);
          }}
          value={draft.competitionGameEdition}
        />

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
            <PlatformChoice label="PlayStation" value={GAME_PLATFORM.PLAYSTATION} />
            <PlatformChoice label="Xbox" value={GAME_PLATFORM.XBOX} />
            <PlatformChoice label="PC" value={GAME_PLATFORM.PC} />
            <PlatformChoice label="Nintendo Switch 1" value={GAME_PLATFORM.NINTENDO_SWITCH_1} />
            <PlatformChoice label="Nintendo Switch 2" value={GAME_PLATFORM.NINTENDO_SWITCH_2} />
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
