"use client";

import { useEffect, useId, useRef, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import type { CompetitionCoverPresetDto } from "@futrob/api-contracts";
import {
  applyStyles,
  Button,
  ChoiceGroup,
  ChoiceGroupIndicator,
  ChoiceGroupItem,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  Input,
  typography,
} from "@futrob/ui";
import { media } from "@futrob/ui/styles/media.stylex";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { UploadSimpleIcon } from "@phosphor-icons/react";
import {
  COMPETITION_COVER_ASSETS,
  COMPETITION_COVER_PICKER_ORDER,
  competitionCoverSrc,
} from "@/modules/competitions/presentation/competition-cover-assets.ts";
import type {
  CompetitionProfileFieldError,
  CompetitionProfileFieldsValue,
  CoverSelection,
} from "@/modules/competitions/presentation/competition-profile-fields-value.ts";

const styles = stylex.create({
  stack: {
    display: "grid",
    gap: "2rem",
  },
  pair: {
    display: "grid",
    gap: {
      default: "2rem",
      [media.sm]: "1rem",
    },
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "repeat(2, minmax(0, 1fr))",
    },
  },
  fieldset: {
    display: "grid",
    gap: "0.75rem",
    margin: 0,
    borderWidth: 0,
    padding: 0,
    minWidth: 0,
  },
  presets: {
    gridTemplateColumns: {
      default: "repeat(3, minmax(0, 1fr))",
      [media.sm]: "repeat(5, minmax(0, 1fr))",
    },
    gap: "0.5rem",
  },
  presetImage: {
    width: "100%",
    maxWidth: "6rem",
    aspectRatio: "1",
    objectFit: "contain",
  },

  presetIndicator: {
    top: "0.375rem",
    right: "0.375rem",
    width: "1.25rem",
    height: "1.25rem",
  },
  upload: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "1rem",
  },
  preview: {
    width: "5rem",
    height: "5rem",
    flexShrink: 0,
    borderRadius: "var(--corner-lg)",
    objectFit: "cover",
    backgroundColor: colors.muted,
  },
  previewCopy: {
    display: "grid",
    gap: "0.25rem",
    minWidth: 0,
    flexGrow: 1,
  },
  previewName: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  hiddenInput: {
    display: "none",
  },
});

/** Inline so it outranks the tile's own StyleX row layout and its right-side check padding. */
const PRESET_TILE = {
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 0,
  minHeight: 0,
  padding: "0.5rem",
  borderRadius: "var(--corner-lg)",
} as const satisfies React.CSSProperties;

export function CompetitionProfileFields({
  value,
  onChange,
  fieldError,
  onClearFieldError,
  disabled = false,
  coverDisabled = disabled,
  idPrefix = "competition",
}: {
  readonly value: CompetitionProfileFieldsValue;
  readonly onChange: (patch: Partial<CompetitionProfileFieldsValue>) => void;
  readonly fieldError: CompetitionProfileFieldError | null;
  readonly onClearFieldError?: () => void;
  readonly disabled?: boolean;
  readonly coverDisabled?: boolean;
  readonly idPrefix?: string;
}) {
  const errorId = useId();
  function change(patch: Partial<CompetitionProfileFieldsValue>) {
    onChange(patch);
    onClearFieldError?.();
  }
  const errorFor = (field: CompetitionProfileFieldError["field"]) =>
    fieldError?.field === field ? (
      <FieldError id={errorId} match>
        {fieldError.message}
      </FieldError>
    ) : null;
  const invalidProps = (field: CompetitionProfileFieldError["field"]) => ({
    "aria-invalid": fieldError?.field === field,
    "aria-describedby": fieldError?.field === field ? errorId : undefined,
  });

  return (
    <div {...applyStyles(styles.stack)}>
      <div {...applyStyles(styles.pair)}>
        <Field invalid={fieldError?.field === "min-teams"}>
          <FieldLabel htmlFor={`${idPrefix}-min-teams`}>Mínimo de equipos</FieldLabel>
          <Input
            {...invalidProps("min-teams")}
            disabled={disabled}
            id={`${idPrefix}-min-teams`}
            inputMode="numeric"
            max={256}
            min={2}
            onChange={(event) => change({ minTeams: event.target.value })}
            type="number"
            value={value.minTeams}
          />
          <FieldDescription>Hacen falta para publicar.</FieldDescription>
          {errorFor("min-teams")}
        </Field>
        <Field invalid={fieldError?.field === "max-teams"}>
          <FieldLabel htmlFor={`${idPrefix}-max-teams`}>Máximo de equipos</FieldLabel>
          <Input
            {...invalidProps("max-teams")}
            disabled={disabled}
            id={`${idPrefix}-max-teams`}
            inputMode="numeric"
            max={256}
            min={2}
            onChange={(event) => change({ maxTeams: event.target.value })}
            placeholder="Sin límite"
            type="number"
            value={value.maxTeams}
          />
          <FieldDescription>Opcional. Al completarse, no se aprueban más equipos.</FieldDescription>
          {errorFor("max-teams")}
        </Field>
      </div>
      <div {...applyStyles(styles.pair)}>
        <Field invalid={fieldError?.field === "start-date"}>
          <FieldLabel htmlFor={`${idPrefix}-starts-on`}>Fecha de inicio</FieldLabel>
          <Input
            {...invalidProps("start-date")}
            disabled={disabled}
            id={`${idPrefix}-starts-on`}
            onChange={(event) => change({ startsOn: event.target.value })}
            type="date"
            value={value.startsOn}
          />
          <FieldDescription>Opcional.</FieldDescription>
          {errorFor("start-date")}
        </Field>
        <Field invalid={fieldError?.field === "end-date"}>
          <FieldLabel htmlFor={`${idPrefix}-ends-on`}>Fecha de fin</FieldLabel>
          <Input
            {...invalidProps("end-date")}
            disabled={disabled}
            id={`${idPrefix}-ends-on`}
            min={value.startsOn || undefined}
            onChange={(event) => change({ endsOn: event.target.value })}
            type="date"
            value={value.endsOn}
          />
          <FieldDescription>Opcional.</FieldDescription>
          {errorFor("end-date")}
        </Field>
      </div>
      <CompetitionCoverPicker
        disabled={coverDisabled}
        error={errorFor("cover")}
        idPrefix={idPrefix}
        onChange={(cover) => change({ cover })}
        value={value.cover}
      />
    </div>
  );
}

export function CompetitionCoverPicker({
  value,
  onChange,
  disabled = false,
  error = null,
  idPrefix = "competition",
}: {
  readonly value: CoverSelection;
  readonly onChange: (cover: CoverSelection) => void;
  readonly disabled?: boolean;
  readonly error?: React.ReactNode;
  readonly idPrefix?: string;
}) {
  const legendId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const previewSrc = useCoverPreview(value);
  const indicator = applyStyles(styles.presetIndicator);
  const presets = applyStyles(styles.presets);

  return (
    <fieldset {...applyStyles(styles.fieldset)}>
      <legend id={legendId} {...applyStyles(typography.label)}>
        Portada
      </legend>
      <p {...applyStyles(typography.caption)}>
        Elige una ilustración o sube tu imagen. Si no eliges nada, se usa la copa.
      </p>
      <ChoiceGroup<CompetitionCoverPresetDto | null>
        aria-labelledby={legendId}
        className={presets.className}
        disabled={disabled}
        onValueChange={(preset) => {
          if (preset) onChange({ kind: "preset", preset });
        }}
        style={presets.style}
        value={value.kind === "preset" ? value.preset : null}
      >
        {COMPETITION_COVER_PICKER_ORDER.map((preset) => (
          <ChoiceGroupItem key={preset} style={PRESET_TILE} value={preset}>
            <img
              alt={COMPETITION_COVER_ASSETS[preset].label}
              data-outline="none"
              {...applyStyles(styles.presetImage)}
              src={COMPETITION_COVER_ASSETS[preset].src}
            />
            <ChoiceGroupIndicator className={indicator.className} style={indicator.style} />
          </ChoiceGroupItem>
        ))}
      </ChoiceGroup>
      <div {...applyStyles(styles.upload)}>
        {previewSrc ? (
          <>
            <img
              alt="Vista previa de la portada"
              src={previewSrc}
              {...applyStyles(styles.preview)}
            />
            <div {...applyStyles(styles.previewCopy)}>
              <span {...applyStyles(typography.body, styles.previewName)}>
                {value.kind === "file" ? value.file.name : "Imagen subida"}
              </span>
              <span {...applyStyles(typography.caption)}>PNG, JPG o WebP de hasta 2 MB.</span>
            </div>
            <Button
              disabled={disabled}
              onClick={() => onChange({ kind: "preset", preset: "cup" })}
              variant="outline"
            >
              Quitar imagen
            </Button>
          </>
        ) : (
          <Button disabled={disabled} onClick={() => fileRef.current?.click()} variant="outline">
            <UploadSimpleIcon aria-hidden />
            Subir imagen
          </Button>
        )}
        <input
          accept="image/png,image/jpeg,image/webp"
          aria-label="Subir imagen de portada"
          id={`${idPrefix}-cover-file`}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onChange({ kind: "file", file });
            event.target.value = "";
          }}
          ref={fileRef}
          type="file"
          {...applyStyles(styles.hiddenInput)}
        />
      </div>
      {error}
    </fieldset>
  );
}

function useCoverPreview(value: CoverSelection): string | null {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const file = value.kind === "file" ? value.file : null;
  useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  if (value.kind === "file") return objectUrl;
  if (value.kind === "upload") return competitionCoverSrc(value);
  return null;
}
