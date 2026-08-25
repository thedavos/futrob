"use client";

import { useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, Button, colors, Form, typography } from "@futrob/ui";
import { useNavigate } from "@tanstack/react-router";
import { CompetitionDraftFields } from "@/modules/competitions/presentation/competition-draft-fields.tsx";
import { CompetitionsClientError } from "@/modules/competitions/presentation/competitions-browser-client.ts";
import { useCreateCompetitionDraftMutation } from "@/modules/competitions/presentation/competition-queries.ts";
import { COMPETITION_PERMISSION } from "@futrob/competitions";
import { useCan } from "@/shared/presentation/permissions/index.ts";
import {
  type CompetitionDraftFieldError,
  type CompetitionDraftFieldsValue,
  validateCompetitionDraftFields,
} from "@/modules/competitions/presentation/validate-competition-draft-input.ts";

const styles = stylex.create({
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "2rem",
  },
  error: {
    borderRadius: "var(--corner-lg)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "color-mix(in oklab, var(--destructive) 40%, transparent)",
    backgroundColor: "color-mix(in oklab, var(--destructive) 10%, transparent)",
    paddingInline: "0.75rem",
    paddingBlock: "0.625rem",
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    color: colors.destructive,
  },
  forbidden: {
    color: colors.mutedForeground,
  },
});

const form = applyStyles(styles.form);

function browserTimeZone(): string {
  if (!("Intl" in globalThis)) return "America/Lima";
  return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "America/Lima";
}

function emptyDraftFields(): CompetitionDraftFieldsValue {
  return {
    name: "",
    gameEdition: "FC 26",
    customEdition: false,
    platform: null,
    region: null,
    timeZone: browserTimeZone(),
    format: null,
  };
}

export function CreateCompetitionForm({ organizationId }: { readonly organizationId: string }) {
  const navigate = useNavigate();
  const createDraft = useCreateCompetitionDraftMutation(organizationId);
  const create = useCan({ organizationId }, COMPETITION_PERMISSION.update);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<CompetitionDraftFieldError | null>(null);
  const [fields, setFields] = useState<CompetitionDraftFieldsValue>(emptyDraftFields);
  const submitting = createDraft.isPending;
  const canCreate = create.allowed;

  async function handleSubmit() {
    setError(null);
    const validation = validateCompetitionDraftFields(fields);
    if (validation) {
      setFieldError(validation);
      return;
    }

    try {
      const created = await createDraft.mutateAsync({
        name: fields.name.trim(),
        gameEdition: fields.gameEdition.trim(),
        platform: fields.platform!,
        region: fields.region!,
        timeZone: fields.timeZone.trim(),
        format: fields.format!,
      });
      await navigate({
        to: "/orgs/$orgId/competitions/$competitionId/setup",
        params: {
          orgId: organizationId,
          competitionId: created.competition.id,
        },
      });
    } catch (caught) {
      if (caught instanceof CompetitionsClientError) {
        if (caught.code.includes("invalid_name")) {
          setFieldError({ field: "name", message: "El nombre no es válido." });
          return;
        }
        if (caught.code.includes("invalid_game_edition")) {
          setFieldError({ field: "edition", message: "La edición no es válida." });
          return;
        }
        if (caught.code.includes("invalid_time_zone")) {
          setFieldError({ field: "time-zone", message: "La zona horaria no es válida." });
          return;
        }
        if (caught.code === "competitions.forbidden") {
          setError("No tienes permiso para crear competiciones en esta organización.");
          return;
        }
      }
      setError("No se pudo crear la competición. Inténtalo de nuevo.");
    }
  }

  return (
    <Form
      aria-busy={submitting}
      className={form.className}
      onFormSubmit={handleSubmit}
      style={form.style}
    >
      {error ? (
        <div role="alert" {...applyStyles(styles.error)}>
          {error}
        </div>
      ) : null}

      <CompetitionDraftFields
        disabled={submitting || !canCreate}
        fieldError={fieldError}
        onChange={(patch) => setFields((current) => ({ ...current, ...patch }))}
        onClearFieldError={() => setFieldError(null)}
        value={fields}
      />

      {canCreate ? (
        <Button disabled={submitting} type="submit">
          {submitting ? "Creando…" : "Crear competición"}
        </Button>
      ) : create.loading ? null : (
        <p {...applyStyles(typography.caption, styles.forbidden)}>
          No tienes permiso para crear competiciones en esta organización.
        </p>
      )}
    </Form>
  );
}
