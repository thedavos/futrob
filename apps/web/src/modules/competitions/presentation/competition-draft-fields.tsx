"use client";

import { useId, useRef, type Ref } from "react";
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
import type { GamePlatformDto } from "@futrob/api-contracts";
import { competitionFormatSchema, competitionRegionSchema } from "@futrob/api-contracts";
import { GAME_PLATFORM } from "@futrob/shared-kernel";
import {
  competitionFormats,
  competitionRegions,
  competitionTimeZones,
} from "@/modules/competitions/presentation/competition-draft-meta.ts";
import type {
  CompetitionDraftFieldError,
  CompetitionDraftFieldsValue,
} from "@/modules/competitions/presentation/validate-competition-draft-input.ts";
import { FieldsetError } from "@/shared/presentation/forms/fieldset-error.tsx";
import {
  GameEditionField,
  type GameEditionFieldCopy,
} from "@/shared/presentation/forms/game-edition-field.tsx";
import { PlatformChoice } from "@/shared/presentation/forms/platform-choice.tsx";

export type CompetitionDraftFieldsProps = {
  readonly value: CompetitionDraftFieldsValue;
  readonly onChange: (patch: Partial<CompetitionDraftFieldsValue>) => void;
  readonly fieldError: CompetitionDraftFieldError | null;
  readonly onClearFieldError?: () => void;
  readonly disabled?: boolean;
  readonly idPrefix?: string;
  readonly showFormatDescription?: boolean;
  readonly nameInputRef?: Ref<HTMLInputElement>;
  readonly timeZoneTriggerRef?: Ref<HTMLButtonElement>;
  readonly copy?: CompetitionDraftFieldsCopy;
};

export interface CompetitionDraftFieldsCopy {
  readonly nameLabel: string;
  readonly namePlaceholder: string;
  readonly gameEdition: GameEditionFieldCopy;
  readonly platformLabel: string;
  readonly regionLabel: string;
  readonly regionPlaceholder: string;
  readonly regions: typeof competitionRegions;
  readonly timeZoneLabel: string;
  readonly timeZonePlaceholder: string;
  readonly formatLabel: string;
  readonly initialFormatLabel: string;
  readonly formatPlaceholder: string;
  readonly formatDescription: string;
  readonly formats: typeof competitionFormats;
}

const defaultCopy: CompetitionDraftFieldsCopy = {
  nameLabel: "Nombre de la competición",
  namePlaceholder: "ej. Liga Futrob Apertura",
  gameEdition: {
    legend: "Edición del juego",
    other: "Otra edición",
    customName: "Nombre de la edición",
    customPlaceholder: "ej. FC 24",
  },
  platformLabel: "Plataforma de la competición",
  regionLabel: "Región deportiva",
  regionPlaceholder: "Selecciona una región",
  regions: competitionRegions,
  timeZoneLabel: "Zona horaria",
  timeZonePlaceholder: "Selecciona una zona horaria",
  formatLabel: "Formato",
  initialFormatLabel: "Formato inicial",
  formatPlaceholder: "Selecciona un formato",
  formatDescription:
    "Las reglas iniciales se asignarán según el formato y podrás ajustarlas antes de publicar.",
  formats: competitionFormats,
};

export function CompetitionDraftFields({
  value,
  onChange,
  fieldError,
  onClearFieldError,
  disabled = false,
  idPrefix = "competition",
  showFormatDescription = false,
  nameInputRef,
  timeZoneTriggerRef,
  copy = defaultCopy,
}: CompetitionDraftFieldsProps) {
  const editionLabelId = useId();
  const platformLabelId = useId();
  const errorId = useId();
  const customEditionRef = useRef<HTMLInputElement>(null);

  function clearError() {
    onClearFieldError?.();
  }

  return (
    <div className="grid gap-8">
      <Field className="gap-3" invalid={fieldError?.field === "name"} name="name">
        <FieldLabel htmlFor={`${idPrefix}-name`}>{copy.nameLabel}</FieldLabel>
        <Input
          aria-describedby={fieldError?.field === "name" ? errorId : undefined}
          aria-invalid={fieldError?.field === "name"}
          disabled={disabled}
          id={`${idPrefix}-name`}
          maxLength={120}
          name="name"
          onChange={(event) => {
            onChange({ name: event.target.value });
            clearError();
          }}
          placeholder={copy.namePlaceholder}
          ref={nameInputRef}
          value={value.name}
        />
        {fieldError?.field === "name" ? (
          <FieldError id={errorId} match>
            {fieldError.message}
          </FieldError>
        ) : null}
      </Field>

      <GameEditionField
        copy={copy.gameEdition}
        custom={value.customEdition}
        customInputId={`${idPrefix}-custom-edition`}
        customInputRef={customEditionRef}
        disabled={disabled}
        errorId={errorId}
        errorMessage={fieldError?.field === "edition" ? fieldError.message : null}
        invalid={fieldError?.field === "edition"}
        legendId={editionLabelId}
        onValueChange={({ value: nextValue, custom }) => {
          onChange({ gameEdition: nextValue, customEdition: custom });
          clearError();
        }}
        value={value.gameEdition}
      />

      <fieldset className="m-0 border-0 p-0" data-competition-platform>
        <legend className="mb-3 typo-label" id={platformLabelId}>
          {copy.platformLabel}
        </legend>
        <ChoiceGroup<GamePlatformDto | "">
          aria-describedby={fieldError?.field === "platform" ? errorId : undefined}
          aria-invalid={fieldError?.field === "platform"}
          aria-labelledby={platformLabelId}
          className="grid-cols-1 sm:grid-cols-3 lg:grid-cols-5"
          onValueChange={(next) => {
            if (next) onChange({ platform: next });
            clearError();
          }}
          value={value.platform ?? ""}
        >
          <PlatformChoice label="PlayStation" value={GAME_PLATFORM.PLAYSTATION} />
          <PlatformChoice label="Xbox" value={GAME_PLATFORM.XBOX} />
          <PlatformChoice label="PC" value={GAME_PLATFORM.PC} />
          <PlatformChoice label="Nintendo Switch 1" value={GAME_PLATFORM.NINTENDO_SWITCH_1} />
          <PlatformChoice label="Nintendo Switch 2" value={GAME_PLATFORM.NINTENDO_SWITCH_2} />
        </ChoiceGroup>
        {fieldError?.field === "platform" ? (
          <FieldsetError id={errorId}>{fieldError.message}</FieldsetError>
        ) : null}
      </fieldset>

      <div className="grid gap-8 sm:grid-cols-2 sm:gap-4">
        <Field className="gap-3" data-competition-region invalid={fieldError?.field === "region"}>
          <FieldLabel htmlFor={`${idPrefix}-region`}>{copy.regionLabel}</FieldLabel>
          <Select
            items={copy.regions}
            onValueChange={(next) => {
              if (!next) return;
              const region = competitionRegionSchema.parse(next);
              onChange({ region });
              clearError();
            }}
            value={value.region}
          >
            <SelectTrigger
              aria-describedby={fieldError?.field === "region" ? errorId : undefined}
              aria-invalid={fieldError?.field === "region"}
              disabled={disabled}
              id={`${idPrefix}-region`}
            >
              <SelectValue placeholder={copy.regionPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {copy.regions.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldError?.field === "region" ? (
            <FieldError id={errorId} match>
              {fieldError.message}
            </FieldError>
          ) : null}
        </Field>

        <Field className="gap-3" invalid={fieldError?.field === "time-zone"}>
          <FieldLabel htmlFor={`${idPrefix}-time-zone`}>{copy.timeZoneLabel}</FieldLabel>
          <Select
            items={competitionTimeZones}
            onValueChange={(next) => {
              if (next) onChange({ timeZone: next });
              clearError();
            }}
            value={value.timeZone}
          >
            <SelectTrigger
              aria-describedby={fieldError?.field === "time-zone" ? errorId : undefined}
              aria-invalid={fieldError?.field === "time-zone"}
              disabled={disabled}
              id={`${idPrefix}-time-zone`}
              ref={timeZoneTriggerRef}
            >
              <SelectValue placeholder={copy.timeZonePlaceholder} />
            </SelectTrigger>
            <SelectContent className="max-h-(--available-height) overflow-y-auto overscroll-contain">
              {competitionTimeZones.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldError?.field === "time-zone" ? (
            <FieldError id={errorId} match>
              {fieldError.message}
            </FieldError>
          ) : null}
        </Field>
      </div>

      <Field className="gap-3" data-competition-format invalid={fieldError?.field === "format"}>
        <FieldLabel htmlFor={`${idPrefix}-format`}>
          {showFormatDescription ? copy.initialFormatLabel : copy.formatLabel}
        </FieldLabel>
        <Select
          items={copy.formats}
          onValueChange={(next) => {
            if (!next) return;
            const format = competitionFormatSchema.parse(next);
            onChange({ format });
            clearError();
          }}
          value={value.format}
        >
          <SelectTrigger
            aria-describedby={fieldError?.field === "format" ? errorId : undefined}
            aria-invalid={fieldError?.field === "format"}
            disabled={disabled}
            id={`${idPrefix}-format`}
          >
            <SelectValue placeholder={copy.formatPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {copy.formats.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {showFormatDescription ? (
          <FieldDescription>{copy.formatDescription}</FieldDescription>
        ) : null}
        {fieldError?.field === "format" ? (
          <FieldError id={errorId} match>
            {fieldError.message}
          </FieldError>
        ) : null}
      </Field>
    </div>
  );
}
