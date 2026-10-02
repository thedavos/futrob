"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import * as stylex from "@stylexjs/stylex";
import type {
  OrganizationProfileDto,
  UpdateOrganizationProfileRequest,
} from "@futrob/api-contracts";
import { Alert, AlertDescription, applyStyles, Button } from "@futrob/ui";
import { useFocusWhenIdle } from "@/shared/presentation/forms/use-focus-when-idle.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import {
  SupportErrorAlert,
  type SupportError,
} from "@/shared/presentation/support-error-alert.tsx";
import { OrganizationsClientError } from "./organizations-browser-client.ts";
import {
  useChangeOrganizationLogoMutation,
  useCheckOrganizationSlugMutation,
  useUpdateOrganizationProfileMutation,
} from "./organization-queries.ts";
import {
  ORGANIZATION_NAME_MAX_LENGTH,
  OrganizationProfileFields,
  type OrganizationProfileErrors,
  type OrganizationProfileValue,
} from "./organization-profile-fields.tsx";

const styles = stylex.create({
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
});

const form = applyStyles(styles.form);

function initialValue(profile: OrganizationProfileDto): OrganizationProfileValue {
  return {
    name: profile.name,
    slug: profile.slug,
    timeZone: profile.timeZone,
    logo: { kind: "keep" },
  };
}

/** Edits an existing organization. Fields are read-only without `organizations.update`. */
export function OrganizationSettingsForm({
  profile,
  canEdit,
}: Readonly<{ profile: OrganizationProfileDto; canEdit: boolean }>) {
  const { t } = useI18n();
  // The last saved profile; edits are compared against it, whatever the parent re-renders with.
  const [stored, setStored] = useState(profile);
  const [value, setValue] = useState(() => initialValue(profile));
  const [errors, setErrors] = useState<OrganizationProfileErrors>({});
  const [slugSuggestion, setSlugSuggestion] = useState<string | null>(null);
  const [alert, setAlert] = useState<SupportError | null>(null);
  const [saved, setSaved] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const slugRef = useRef<HTMLInputElement>(null);
  const checkSlug = useCheckOrganizationSlugMutation();
  const updateProfile = useUpdateOrganizationProfileMutation(profile.organizationId);
  const changeLogo = useChangeOrganizationLogoMutation(profile.organizationId);
  const busy = checkSlug.isPending || updateProfile.isPending || changeLogo.isPending;
  const fieldRefs = useMemo(() => ({ name: nameRef, slug: slugRef }), []);
  const focusWhenIdle = useFocusWhenIdle(busy, fieldRefs);

  const name = value.name.trim();
  const patch = changedFields(stored, { ...value, name });
  const logoChanged = logoNeedsSaving(stored, value);
  const profileChanged = Object.values(patch).some((field) => field !== undefined);
  const dirty = profileChanged || logoChanged;

  function change(next: Partial<OrganizationProfileValue>) {
    setValue((current) => ({ ...current, ...next }));
    setSaved(false);
    setErrors((current) => ({
      name: next.name === undefined ? current.name : null,
      slug: next.slug === undefined ? current.slug : null,
    }));
    if (next.slug !== undefined) setSlugSuggestion(null);
  }

  async function verifySlug(slug: string): Promise<boolean> {
    const result = await checkSlug.mutateAsync({ slug, organizationId: profile.organizationId });
    if (result.available) return true;
    setErrors({
      slug:
        result.reason === "invalid"
          ? t("organizations.profile.slug.invalid")
          : t("organizations.profile.slug.taken"),
    });
    setSlugSuggestion(result.suggestion ?? null);
    return false;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !canEdit || !dirty) return;
    setAlert(null);
    setErrors({});
    setSlugSuggestion(null);
    setSaved(false);

    if (name.length === 0 || name.length > ORGANIZATION_NAME_MAX_LENGTH) {
      setErrors({
        name:
          name.length === 0
            ? t("organizations.create.name.required")
            : t("organizations.create.name.max"),
      });
      nameRef.current?.focus();
      return;
    }

    if (patch.slug !== undefined) {
      try {
        if (!(await verifySlug(patch.slug))) {
          focusWhenIdle("slug");
          return;
        }
      } catch (caught) {
        const clientError = caught instanceof OrganizationsClientError ? caught : null;
        setAlert(supportError(clientError, t("organizations.profile.slug.checkFailed")));
        return;
      }
    }

    let current = stored;
    if (profileChanged) {
      try {
        current = await updateProfile.mutateAsync(patch);
      } catch (caught) {
        const clientError = caught instanceof OrganizationsClientError ? caught : null;
        const field = fieldError(clientError, t);
        if (field) {
          setErrors(field.errors);
          focusWhenIdle(field.focus);
          return;
        }
        setAlert(supportError(clientError, t("organizations.settings.saveFailed")));
        return;
      }
    }

    if (logoChanged) {
      try {
        current = await changeLogo.mutateAsync(value.logo.kind === "file" ? value.logo.file : null);
      } catch (caught) {
        const clientError = caught instanceof OrganizationsClientError ? caught : null;
        setStored(current);
        setValue({ ...initialValue(current), logo: value.logo });
        setAlert(supportError(clientError, t("organizations.settings.logoFailed")));
        return;
      }
    }

    setStored(current);
    setValue(initialValue(current));
    setSaved(true);
  }

  return (
    <form {...form} aria-busy={busy} noValidate onSubmit={(event) => void submit(event)}>
      {alert ? <SupportErrorAlert error={alert} /> : null}
      {saved ? (
        <Alert variant="success">
          <AlertDescription>{t("organizations.settings.saved")}</AlertDescription>
        </Alert>
      ) : null}

      <OrganizationProfileFields
        currentLogo={stored.logo}
        disabled={busy || !canEdit}
        errors={errors}
        idPrefix="organization-settings"
        nameRef={nameRef}
        onChange={change}
        onUseSlugSuggestion={(suggestion) => change({ slug: suggestion })}
        slugRef={slugRef}
        slugSuggestion={slugSuggestion}
        value={value}
      />

      {canEdit ? (
        <Button disabled={busy || !dirty} type="submit">
          {busy ? t("organizations.settings.saving") : t("organizations.settings.save")}
        </Button>
      ) : null}
    </form>
  );
}

/** Only the fields that differ from the stored profile; the rest stay `undefined`. */
function changedFields(
  profile: OrganizationProfileDto,
  value: OrganizationProfileValue,
): UpdateOrganizationProfileRequest {
  return {
    name: value.name !== profile.name ? value.name : undefined,
    slug: value.slug.trim() !== profile.slug ? value.slug.trim() : undefined,
    timeZone: value.timeZone !== profile.timeZone ? value.timeZone : undefined,
  };
}

/** A picked file always saves; removing is only a change when a logo is stored. */
function logoNeedsSaving(
  profile: OrganizationProfileDto,
  value: OrganizationProfileValue,
): boolean {
  switch (value.logo.kind) {
    case "file":
      return true;
    case "monogram":
      return profile.logo.kind === "upload";
    case "keep":
      return false;
    default: {
      const _exhaustive: never = value.logo;
      return _exhaustive;
    }
  }
}

function fieldError(
  error: OrganizationsClientError | null,
  t: Translator,
): { errors: OrganizationProfileErrors; focus: "name" | "slug" } | null {
  if (!error) return null;
  switch (error.code) {
    case "organizations.name_conflict":
      return { errors: { name: t("organizations.create.name.conflict") }, focus: "name" };
    case "organizations.invalid_name":
      return { errors: { name: t("organizations.create.name.invalid") }, focus: "name" };
    case "organizations.slug_conflict":
      return { errors: { slug: t("organizations.profile.slug.taken") }, focus: "slug" };
    case "organizations.invalid_slug":
      return { errors: { slug: t("organizations.profile.slug.invalid") }, focus: "slug" };
    default:
      return null;
  }
}

function supportError(error: OrganizationsClientError | null, message: string): SupportError {
  return {
    message,
    requestId: error?.requestId,
    retryAfterSeconds: error?.retryAfterSeconds,
  };
}
