"use client";

import { useId } from "react";
import {
  applyStyles,
  Badge,
  Card,
  CardContent,
  Field,
  FieldError,
  FieldLabel,
  Input,
  Separator,
} from "@futrob/ui";
import {
  competitionPlatformSchema,
  competitionRegionSchema,
  type UpdateCompetitionDraftRequest,
} from "@futrob/api-contracts";
import {
  competitionPlatformLabel,
  competitionRegions,
  competitionTimeZones,
} from "./competition-draft-meta.ts";
import {
  CompetitionScheduleFields,
  CompetitionTeamCapacityFields,
} from "./competition-profile-fields.tsx";
import { CompetitionVisualIdentity } from "./competition-visual-identity.tsx";
import { SelectField, StepHeading } from "./competition-setup-fields.tsx";
import { styles } from "./competition-setup-steps.styles.ts";
import type {
  CompetitionProfileFieldError,
  CompetitionProfileFieldsValue,
} from "./competition-profile-fields-value.ts";

const platforms = ["playstation", "xbox", "pc", "nintendo-switch-1", "nintendo-switch-2"] as const;
export function InformationStep({
  form,
  onChange,
  disabled,
  profile = null,
}: {
  form: UpdateCompetitionDraftRequest;
  onChange: (patch: Partial<UpdateCompetitionDraftRequest>) => void;
  disabled: boolean;
  profile?: {
    readonly value: CompetitionProfileFieldsValue;
    readonly onChange: (patch: Partial<CompetitionProfileFieldsValue>) => void;
    readonly fieldError: CompetitionProfileFieldError | null;
    readonly onClearFieldError?: () => void;
    readonly coverDisabled: boolean;
  } | null;
}) {
  const errorId = useId();
  function changeProfile(patch: Partial<CompetitionProfileFieldsValue>) {
    profile?.onChange(patch);
    profile?.onClearFieldError?.();
  }
  const fieldError = profile?.fieldError ?? null;
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
  const profileFields = profile
    ? {
        value: profile.value,
        onChange: changeProfile,
        disabled,
        idPrefix: "competition",
        fieldError,
        invalidProps,
        errorFor,
      }
    : null;

  return (
    <div {...applyStyles(styles.columns)}>
      <Card>
        <CardContent className={styles.content}>
          <section {...applyStyles(styles.section)}>
            <div {...applyStyles(styles.subsection)}>
              <StepHeading copy="Identidad y contexto de juego." title="Información general" />
              <Field>
                <FieldLabel htmlFor="competition-name">Nombre de la competición</FieldLabel>
                <Input
                  disabled={disabled}
                  id="competition-name"
                  maxLength={120}
                  onChange={(event) => onChange({ name: event.target.value })}
                  value={form.name}
                />
              </Field>
              <div {...applyStyles(styles.pair)}>
                <Field>
                  <FieldLabel htmlFor="competition-edition">Edición</FieldLabel>
                  <Input
                    disabled={disabled}
                    id="competition-edition"
                    maxLength={40}
                    onChange={(event) => onChange({ gameEdition: event.target.value })}
                    value={form.gameEdition}
                  />
                </Field>
                <SelectField
                  disabled={disabled}
                  id="competition-platform"
                  items={platforms.map((value) => ({
                    value,
                    label: competitionPlatformLabel(value),
                  }))}
                  label="Plataforma"
                  onChange={(value) =>
                    onChange({ platform: competitionPlatformSchema.parse(value) })
                  }
                  value={form.platform}
                />
              </div>
              <div {...applyStyles(styles.pair)}>
                <SelectField
                  disabled={disabled}
                  id="competition-region"
                  items={competitionRegions}
                  label="Región"
                  onChange={(value) => onChange({ region: competitionRegionSchema.parse(value) })}
                  value={form.region}
                />
                <SelectField
                  disabled={disabled}
                  id="competition-timezone"
                  items={competitionTimeZones}
                  label="Zona horaria"
                  onChange={(value) => onChange({ timeZone: value })}
                  value={form.timeZone}
                />
              </div>
            </div>
            {profile && profileFields ? (
              <>
                <Separator />
                <div {...applyStyles(styles.subsection)}>
                  <StepHeading
                    copy="Define la capacidad de la competición."
                    title="Participantes"
                  />
                  <CompetitionTeamCapacityFields {...profileFields} />
                </div>
                <Separator />
                <div {...applyStyles(styles.subsection)}>
                  <StepHeading badge={<Badge variant="outline">Opcional</Badge>} title="Fechas" />
                  <CompetitionScheduleFields {...profileFields} />
                </div>
              </>
            ) : null}
          </section>
        </CardContent>
      </Card>
      {profile ? (
        <Card>
          <CardContent className={styles.content}>
            <CompetitionVisualIdentity
              cover={profile.value.cover}
              disabled={profile.coverDisabled}
              error={errorFor("cover")}
              gameEdition={form.gameEdition}
              name={form.name}
              onChange={(cover) => changeProfile({ cover })}
              platform={form.platform}
              region={form.region}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
