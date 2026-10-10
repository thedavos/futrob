"use client";

import { useEffect, useRef, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import type { CompetitionCoverPresetDto } from "@futrob/api-contracts";
import {
  applyStyles,
  Button,
  ChoiceGroup,
  ChoiceGroupIndicator,
  ChoiceGroupItem,
  typography,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { ImageIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import backgroundStripesUrl from "@/assets/background-stripes.png";
import {
  COMPETITION_COVER_ASSETS,
  COMPETITION_COVER_PICKER_ORDER,
  competitionCoverSrc,
} from "@/modules/competitions/presentation/competition-cover-assets.ts";
import {
  competitionPlatformLabel,
  competitionRegionLabel,
} from "@/modules/competitions/presentation/competition-draft-meta.ts";
import type { CoverSelection } from "@/modules/competitions/presentation/competition-profile-fields-value.ts";
import { StepHeading } from "./competition-setup-fields.tsx";

const PREVIEW_COUNT = 4;

const styles = stylex.create({
  stack: {
    display: "grid",
    gap: "1.25rem",
  },
  preview: {
    display: "grid",
    justifyItems: "center",
    gap: "0.75rem",
    borderRadius: "var(--corner-lg)",
    padding: "1.5rem 1rem 1.25rem",
    textAlign: "center",
    backgroundColor: colors.background,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    backgroundSize: "cover",
  },
  artwork: {
    width: "8.5rem",
    height: "8.5rem",
    objectFit: "contain",
  },
  name: {
    margin: 0,
    fontWeight: 600,
  },
  meta: {
    display: "grid",
    gap: "0.125rem",
    color: colors.mutedForeground,
  },
  presets: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "0.5rem",
  },
  presetImage: {
    width: "100%",
    maxWidth: "4.5rem",
    aspectRatio: "1",
    objectFit: "contain",
  },
  presetIndicator: {
    top: "0.375rem",
    right: "0.375rem",
    width: "1.25rem",
    height: "1.25rem",
  },
  actions: {
    display: "grid",
    gap: "0.75rem",
  },
  caption: {
    margin: 0,
    color: colors.mutedForeground,
  },
  hiddenInput: {
    display: "none",
  },
});

const PRESET_TILE = {
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 0,
  minHeight: 0,
  padding: "0.5rem",
  borderRadius: "var(--corner-lg)",
} as const satisfies React.CSSProperties;

export function CompetitionVisualIdentity({
  name,
  gameEdition,
  platform,
  region,
  cover,
  onChange,
  disabled = false,
  error = null,
}: {
  readonly name: string;
  readonly gameEdition: string;
  readonly platform: Parameters<typeof competitionPlatformLabel>[0];
  readonly region: Parameters<typeof competitionRegionLabel>[0];
  readonly cover: CoverSelection;
  readonly onChange: (cover: CoverSelection) => void;
  readonly disabled?: boolean;
  readonly error?: React.ReactNode;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [showAll, setShowAll] = useState(false);
  const previewSrc = useCoverPreview(cover);
  const artwork =
    previewSrc ??
    (cover.kind === "preset"
      ? COMPETITION_COVER_ASSETS[cover.preset].src
      : COMPETITION_COVER_ASSETS.cup.src);
  const visiblePresets = showAll ? COMPETITION_COVER_PICKER_ORDER : collapsedPresets(cover);
  const preview = applyStyles(styles.preview);
  const presets = applyStyles(styles.presets);
  const indicator = applyStyles(styles.presetIndicator);
  const displayName = name.trim() || "Competición";

  return (
    <div {...applyStyles(styles.stack)}>
      <StepHeading copy="Así se verá tu competición." title="Identidad visual" />
      <div
        className={preview.className}
        style={{ ...preview.style, backgroundImage: `url("${backgroundStripesUrl}")` }}
      >
        <img alt="" data-outline="none" src={artwork} {...applyStyles(styles.artwork)} />
        <p {...applyStyles(typography.subtitle, styles.name)}>{displayName}</p>
        <div {...applyStyles(typography.caption, styles.meta)}>
          <span>
            {gameEdition} · {competitionPlatformLabel(platform)}
          </span>
          <span>{competitionRegionLabel(region)}</span>
        </div>
      </div>
      <div {...applyStyles(styles.stack)}>
        <p {...applyStyles(typography.label)}>Portada</p>
        <ChoiceGroup<CompetitionCoverPresetDto | null>
          aria-label="Portada"
          className={presets.className}
          disabled={disabled}
          onValueChange={(preset) => {
            if (preset) onChange({ kind: "preset", preset });
          }}
          style={presets.style}
          value={cover.kind === "preset" ? cover.preset : null}
        >
          {visiblePresets.map((preset) => (
            <ChoiceGroupItem key={preset} style={PRESET_TILE} value={preset}>
              <img
                alt={COMPETITION_COVER_ASSETS[preset].label}
                data-outline="none"
                src={COMPETITION_COVER_ASSETS[preset].src}
                {...applyStyles(styles.presetImage)}
              />
              <ChoiceGroupIndicator className={indicator.className} style={indicator.style} />
            </ChoiceGroupItem>
          ))}
        </ChoiceGroup>
        <div {...applyStyles(styles.actions)}>
          <Button
            disabled={disabled}
            onClick={() => setShowAll((current) => !current)}
            style={{ width: "100%" }}
            type="button"
            variant="outline"
          >
            <ImageIcon aria-hidden />
            {showAll ? "Ver menos" : "Ver todas las ilustraciones"}
          </Button>
          <Button
            disabled={disabled}
            onClick={() => fileRef.current?.click()}
            style={{ width: "100%" }}
            type="button"
            variant="outline"
          >
            <UploadSimpleIcon aria-hidden />
            Subir imagen
          </Button>
          <p {...applyStyles(typography.caption, styles.caption)}>
            Si no eliges una imagen, se usará la copa.
          </p>
        </div>
        <input
          accept="image/png,image/jpeg,image/webp"
          aria-label="Subir imagen de portada"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onChange({ kind: "file", file });
            event.target.value = "";
          }}
          ref={fileRef}
          type="file"
          {...applyStyles(styles.hiddenInput)}
        />
        {error}
      </div>
    </div>
  );
}

function collapsedPresets(cover: CoverSelection): readonly CompetitionCoverPresetDto[] {
  const first = COMPETITION_COVER_PICKER_ORDER.slice(0, PREVIEW_COUNT);
  if (cover.kind !== "preset" || first.includes(cover.preset)) return first;
  return [cover.preset, ...first.filter((preset) => preset !== cover.preset)].slice(
    0,
    PREVIEW_COUNT,
  );
}

function useCoverPreview(cover: CoverSelection): string | null {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const file = cover.kind === "file" ? cover.file : null;
  useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  if (cover.kind === "file") return objectUrl;
  if (cover.kind === "upload") return competitionCoverSrc(cover);
  return null;
}
