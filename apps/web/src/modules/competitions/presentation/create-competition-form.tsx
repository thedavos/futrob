"use client";

import { useState } from "react";
import { Button, Form } from "@futrob/ui";
import { useNavigate } from "@tanstack/react-router";
import { CompetitionDraftFields } from "@/modules/competitions/presentation/competition-draft-fields.tsx";
import { CompetitionsClientError } from "@/modules/competitions/presentation/competitions-browser-client.ts";
import { useCreateCompetitionDraftMutation } from "@/modules/competitions/presentation/competition-queries.ts";
import {
  type CompetitionDraftFieldError,
  type CompetitionDraftFieldsValue,
  validateCompetitionDraftFields,
} from "@/modules/competitions/presentation/validate-competition-draft-input.ts";

function browserTimeZone(): string {
  if (typeof Intl === "undefined") return "America/Lima";
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
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<CompetitionDraftFieldError | null>(null);
  const [fields, setFields] = useState<CompetitionDraftFieldsValue>(emptyDraftFields);
  const submitting = createDraft.isPending;

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
    <Form aria-busy={submitting} className="space-y-8" onFormSubmit={handleSubmit}>
      {error ? (
        <div
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <CompetitionDraftFields
        disabled={submitting}
        fieldError={fieldError}
        onChange={(patch) => setFields((current) => ({ ...current, ...patch }))}
        onClearFieldError={() => setFieldError(null)}
        value={fields}
      />

      <Button disabled={submitting} type="submit">
        {submitting ? "Creando…" : "Crear competición"}
      </Button>
    </Form>
  );
}
