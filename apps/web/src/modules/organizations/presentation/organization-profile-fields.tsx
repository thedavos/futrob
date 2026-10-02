"use client";

import type { Ref } from "react";
import * as stylex from "@stylexjs/stylex";
import type { OrganizationLogoDto } from "@futrob/api-contracts";
import {
  applyStyles,
  Button,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  Input,
} from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { TimeZoneSelect } from "@/shared/presentation/time-zone-select.tsx";
import { OrganizationLogoPicker, type LogoChoice } from "./organization-logo-picker.tsx";

export const ORGANIZATION_NAME_MAX_LENGTH = 120;
export const ORGANIZATION_SLUG_MAX_LENGTH = 48;

export interface OrganizationProfileValue {
  readonly name: string;
  readonly slug: string;
  readonly timeZone: string;
  readonly logo: LogoChoice;
}

export interface OrganizationProfileErrors {
  readonly name?: string | null;
  readonly slug?: string | null;
}

const styles = stylex.create({
  fields: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  suggestion: {
    justifySelf: "start",
  },
});

const fields = applyStyles(styles.fields);
const suggestionStyle = applyStyles(styles.suggestion);

/** Name, slug, time zone and logo, shared by the create page and the settings form. */
export function OrganizationProfileFields({
  idPrefix,
  value,
  onChange,
  errors,
  slugSuggestion,
  onUseSlugSuggestion,
  onSlugBlur,
  currentLogo,
  disabled,
  nameRef,
  slugRef,
}: Readonly<{
  idPrefix: string;
  value: OrganizationProfileValue;
  onChange: (patch: Partial<OrganizationProfileValue>) => void;
  errors: OrganizationProfileErrors;
  slugSuggestion?: string | null;
  onUseSlugSuggestion?: (slug: string) => void;
  onSlugBlur?: () => void;
  /** The stored logo, or `null` while the organization does not exist yet. */
  currentLogo: OrganizationLogoDto | null;
  disabled?: boolean;
  nameRef?: Ref<HTMLInputElement>;
  slugRef?: Ref<HTMLInputElement>;
}>) {
  const { t } = useI18n();
  const nameId = `${idPrefix}-name`;
  const slugId = `${idPrefix}-slug`;
  const timeZoneId = `${idPrefix}-time-zone`;

  return (
    <div {...fields}>
      <Field invalid={Boolean(errors.name)}>
        <FieldLabel htmlFor={nameId}>{t("organizations.create.name.label")}</FieldLabel>
        <Input
          aria-describedby={errors.name ? `${nameId}-error` : undefined}
          aria-invalid={Boolean(errors.name)}
          autoComplete="organization"
          disabled={disabled}
          id={nameId}
          maxLength={ORGANIZATION_NAME_MAX_LENGTH}
          onChange={(event) => onChange({ name: event.target.value })}
          placeholder={t("organizations.create.name.placeholder")}
          ref={nameRef}
          value={value.name}
        />
        <FieldDescription>{t("organizations.create.name.description")}</FieldDescription>
        {errors.name ? (
          <FieldError id={`${nameId}-error`} match>
            {errors.name}
          </FieldError>
        ) : null}
      </Field>

      <Field invalid={Boolean(errors.slug)}>
        <FieldLabel htmlFor={slugId}>{t("organizations.profile.slug.label")}</FieldLabel>
        <Input
          aria-describedby={errors.slug ? `${slugId}-error` : undefined}
          aria-invalid={Boolean(errors.slug)}
          autoCapitalize="none"
          autoComplete="off"
          disabled={disabled}
          id={slugId}
          maxLength={ORGANIZATION_SLUG_MAX_LENGTH}
          onBlur={onSlugBlur}
          onChange={(event) => onChange({ slug: event.target.value.toLowerCase() })}
          ref={slugRef}
          spellCheck={false}
          value={value.slug}
        />
        <FieldDescription>{t("organizations.profile.slug.description")}</FieldDescription>
        {errors.slug ? (
          <FieldError id={`${slugId}-error`} match>
            {errors.slug}
          </FieldError>
        ) : null}
        {slugSuggestion && onUseSlugSuggestion ? (
          <Button
            className={suggestionStyle.className}
            disabled={disabled}
            onClick={() => onUseSlugSuggestion(slugSuggestion)}
            style={suggestionStyle.style}
            type="button"
            variant="outline"
          >
            {t("organizations.profile.slug.useSuggestion", { slug: slugSuggestion })}
          </Button>
        ) : null}
      </Field>

      <Field>
        <FieldLabel htmlFor={timeZoneId}>{t("organizations.profile.timeZone.label")}</FieldLabel>
        <TimeZoneSelect
          disabled={disabled}
          id={timeZoneId}
          onChange={(timeZone) => onChange({ timeZone })}
          placeholder={t("organizations.profile.timeZone.placeholder")}
          value={value.timeZone}
        />
        <FieldDescription>{t("organizations.profile.timeZone.description")}</FieldDescription>
      </Field>

      <Field>
        <OrganizationLogoPicker
          choice={value.logo}
          currentLogo={currentLogo}
          disabled={disabled}
          idPrefix={idPrefix}
          onChange={(logo) => onChange({ logo })}
          organizationName={value.name}
        />
      </Field>
    </div>
  );
}
