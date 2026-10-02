"use client";

import { useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, Button, Form, typography } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { useNavigate } from "@tanstack/react-router";
import { CompetitionDraftFields } from "@/modules/competitions/presentation/competition-draft-fields.tsx";
import { useOrganizationProfileQuery } from "@/modules/organizations/presentation/organization-queries.ts";
import { getBrowserTimeZone } from "@/shared/presentation/time-zone-options.ts";
import { CompetitionsClientError } from "@/modules/competitions/presentation/competitions-browser-client.ts";
import { useCreateCompetitionDraftMutation } from "@/modules/competitions/presentation/competition-queries.ts";
import { COMPETITION_PERMISSION } from "@futrob/competitions";
import { useCan } from "@/shared/presentation/permissions/index.ts";
import { CompetitionProfileFields } from "@/modules/competitions/presentation/competition-profile-fields.tsx";
import {
  DEFAULT_PROFILE_FIELDS,
  toTeamsAndSchedule,
  validateCompetitionProfileFields,
  type CompetitionProfileFieldError,
  type CompetitionProfileFieldsValue,
} from "@/modules/competitions/presentation/competition-profile-fields-value.ts";
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
  section: {
    display: "grid",
    gap: "1.5rem",
  },
});

const COVER_FILE_ERROR: CompetitionProfileFieldError = {
  field: "cover",
  message: "Sube una imagen PNG, JPG o WebP de hasta 2 MB.",
};

function profileErrorFor(code: string): CompetitionProfileFieldError | null {
  switch (code) {
    case "competitions.invalid_team_range":
      return {
        field: "max-teams",
        message:
          "Revisa el rango: entre 2 y 256 equipos, con el máximo igual o mayor que el mínimo.",
      };
    case "competitions.invalid_schedule":
      return {
        field: "end-date",
        message: "Elige una fecha de fin igual o posterior a la de inicio.",
      };
    case "competitions.invalid_cover":
      return {
        field: "cover",
        message: "No se pudo usar esa imagen. Elige una ilustración o sube otra.",
      };
    case "media.unsupported_type":
    case "media.too_large":
      return COVER_FILE_ERROR;
    default:
      return null;
  }
}

const form = applyStyles(styles.form);

function emptyDraftFields(): CompetitionDraftFieldsValue {
  return {
    name: "",
    gameEdition: "FC 27",
    customEdition: false,
    platform: null,
    region: null,
    timeZone: getBrowserTimeZone(),
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
  const [profile, setProfile] = useState<CompetitionProfileFieldsValue>(DEFAULT_PROFILE_FIELDS);
  const [profileError, setProfileError] = useState<CompetitionProfileFieldError | null>(null);
  const [creationKey] = useState(() => crypto.randomUUID());
  // The organization's zone is the starting point until the organizer picks another one.
  const organizationProfile = useOrganizationProfileQuery(organizationId);
  const [timeZoneEdited, setTimeZoneEdited] = useState(false);
  const draft: CompetitionDraftFieldsValue = {
    ...fields,
    timeZone: timeZoneEdited
      ? fields.timeZone
      : (organizationProfile.data?.timeZone ??
        // No flash of the browser zone while the organization's own zone is loading.
        (organizationProfile.isPending ? "" : fields.timeZone)),
  };
  const submitting = createDraft.isPending;
  const canCreate = create.allowed;

  async function handleSubmit() {
    setError(null);
    const validation = validateCompetitionDraftFields(draft);
    if (validation) {
      setFieldError(validation);
      return;
    }
    const profileValidation = validateCompetitionProfileFields(profile);
    if (profileValidation) {
      setProfileError(profileValidation);
      return;
    }

    try {
      const created = await createDraft.mutateAsync({
        request: {
          name: draft.name.trim(),
          gameEdition: draft.gameEdition.trim(),
          platform: draft.platform!,
          region: draft.region!,
          timeZone: draft.timeZone.trim(),
          format: draft.format!,
          ...toTeamsAndSchedule(profile),
          creationKey,
        },
        cover: profile.cover,
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
        const profileFailure = profileErrorFor(caught.code);
        if (profileFailure) {
          setProfileError(profileFailure);
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
        onChange={(patch) => {
          if (patch.timeZone !== undefined) setTimeZoneEdited(true);
          setFields((current) => ({ ...current, ...patch }));
        }}
        onClearFieldError={() => setFieldError(null)}
        value={draft}
      />

      <section aria-labelledby="competition-profile-heading" {...applyStyles(styles.section)}>
        <h2 id="competition-profile-heading" {...applyStyles(typography.subtitle)}>
          Equipos, fechas y portada
        </h2>
        <CompetitionProfileFields
          disabled={submitting || !canCreate}
          fieldError={profileError}
          onChange={(patch) => setProfile((current) => ({ ...current, ...patch }))}
          onClearFieldError={() => setProfileError(null)}
          value={profile}
        />
      </section>

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
