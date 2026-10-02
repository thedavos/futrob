"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import * as stylex from "@stylexjs/stylex";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { OrganizationSlugAvailabilityResponse } from "@futrob/api-contracts";
import { slugifyOrganizationText } from "@futrob/organizations";
import { Alert, AlertDescription, applyStyles, Button } from "@futrob/ui";
import { useFocusWhenIdle } from "@/shared/presentation/forms/use-focus-when-idle.ts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import {
  SupportErrorAlert,
  type SupportError,
} from "@/shared/presentation/support-error-alert.tsx";
import { getBrowserTimeZone } from "@/shared/presentation/time-zone-options.ts";
import { changeOrganizationLogo } from "./change-organization-logo.ts";
import { OrganizationsClientError } from "./organizations-browser-client.ts";
import {
  useCheckOrganizationNameMutation,
  useCheckOrganizationSlugMutation,
  useCreateOrganizationMutation,
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
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
  },
});

const form = applyStyles(styles.form);
const actions = applyStyles(styles.actions);

type Translate = Translator;

/** The organization exists but its logo upload failed; the user retries or moves on. */
interface LogoFailure {
  readonly organizationId: string;
  readonly file: File;
}

/** Page form: name, slug, time zone and logo. The selector dialog keeps the compact form. */
export function CreateOrganizationProfileForm() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [creationKey] = useState(() => crypto.randomUUID());
  const [value, setValue] = useState<OrganizationProfileValue>(() => ({
    name: "",
    slug: "",
    timeZone: getBrowserTimeZone(),
    logo: { kind: "monogram" },
  }));
  const [slugEdited, setSlugEdited] = useState(false);
  const [errors, setErrors] = useState<OrganizationProfileErrors>({});
  const [slugSuggestion, setSlugSuggestion] = useState<string | null>(null);
  const [alert, setAlert] = useState<SupportError | null>(null);
  const [logoFailure, setLogoFailure] = useState<LogoFailure | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const slugRef = useRef<HTMLInputElement>(null);
  const checkName = useCheckOrganizationNameMutation();
  const checkSlug = useCheckOrganizationSlugMutation();
  const createOrganization = useCreateOrganizationMutation();
  const busy =
    checkName.isPending || checkSlug.isPending || createOrganization.isPending || uploadingLogo;

  const fieldRefs = useMemo(() => ({ name: nameRef, slug: slugRef }), []);
  const focusWhenIdle = useFocusWhenIdle(busy, fieldRefs);

  const slug = slugEdited ? value.slug : suggestedSlug(value.name);
  const shown: OrganizationProfileValue = { ...value, slug };

  function change(patch: Partial<OrganizationProfileValue>) {
    setValue((current) => ({ ...current, ...patch }));
    if (patch.slug !== undefined) setSlugEdited(true);
    setErrors((current) => ({
      name: patch.name === undefined ? current.name : null,
      slug: patch.slug === undefined && patch.name === undefined ? current.slug : null,
    }));
    if (patch.slug !== undefined || (patch.name !== undefined && !slugEdited)) {
      setSlugSuggestion(null);
    }
  }

  async function verifySlugOnBlur() {
    if (slug.length === 0 || busy) return;
    try {
      const result = await checkSlug.mutateAsync({ slug });
      applySlugResult(result);
    } catch {
      // The submit checks again and reports a failed check; a blur stays quiet.
    }
  }

  function applySlugResult(result: OrganizationSlugAvailabilityResponse): boolean {
    if (result.available) return true;
    setErrors((current) => ({
      ...current,
      slug:
        result.reason === "invalid"
          ? t("organizations.profile.slug.invalid")
          : t("organizations.profile.slug.taken"),
    }));
    setSlugSuggestion(result.suggestion ?? null);
    return false;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setAlert(null);
    setErrors({});
    setSlugSuggestion(null);

    const name = value.name.trim();
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

    try {
      const { available } = await checkName.mutateAsync({ name });
      if (!available) {
        setErrors({ name: t("organizations.create.name.conflict") });
        focusWhenIdle("name");
        return;
      }
    } catch (caught) {
      const clientError = caught instanceof OrganizationsClientError ? caught : null;
      setAlert(supportError(clientError, t("organizations.create.checkFailed")));
      return;
    }

    try {
      if (!applySlugResult(await checkSlug.mutateAsync({ slug }))) {
        focusWhenIdle("slug");
        return;
      }
    } catch (caught) {
      const clientError = caught instanceof OrganizationsClientError ? caught : null;
      setAlert(supportError(clientError, t("organizations.profile.slug.checkFailed")));
      return;
    }

    try {
      const created = await createOrganization.mutateAsync({
        name,
        slug,
        timeZone: value.timeZone,
        creationKey,
      });
      if (value.logo.kind === "file") {
        await uploadLogo({ organizationId: created.organizationId, file: value.logo.file });
        return;
      }
      await openCompetitions(created.organizationId);
    } catch (caught) {
      const clientError = caught instanceof OrganizationsClientError ? caught : null;
      const field = fieldError(clientError, t);
      if (field) {
        setErrors(field.errors);
        focusWhenIdle(field.focus);
        return;
      }
      setAlert(supportError(clientError, t("organizations.create.failed")));
    }
  }

  async function uploadLogo(pending: LogoFailure) {
    setUploadingLogo(true);
    setAlert(null);
    try {
      await changeOrganizationLogo(pending.organizationId, pending.file);
      await queryClient.invalidateQueries({ queryKey: queryKeys.organizations.mine() });
      await openCompetitions(pending.organizationId);
    } catch {
      setLogoFailure(pending);
    } finally {
      setUploadingLogo(false);
    }
  }

  async function openCompetitions(organizationId: string) {
    await navigate({ to: "/orgs/$orgId/competitions", params: { orgId: organizationId } });
  }

  return (
    <form {...form} aria-busy={busy} noValidate onSubmit={(event) => void submit(event)}>
      {alert ? <SupportErrorAlert error={alert} /> : null}

      <OrganizationProfileFields
        currentLogo={null}
        disabled={busy || logoFailure !== null}
        errors={errors}
        idPrefix="new-organization"
        nameRef={nameRef}
        onChange={change}
        onSlugBlur={() => void verifySlugOnBlur()}
        onUseSlugSuggestion={(suggestion) => change({ slug: suggestion })}
        slugRef={slugRef}
        slugSuggestion={slugSuggestion}
        value={shown}
      />

      {logoFailure ? (
        <>
          <Alert variant="warning">
            <AlertDescription>{t("organizations.create.logoFailed")}</AlertDescription>
          </Alert>
          <div {...actions}>
            <Button
              disabled={uploadingLogo}
              onClick={() => void uploadLogo(logoFailure)}
              type="button"
            >
              {t("organizations.create.logoRetry")}
            </Button>
            <Button
              disabled={uploadingLogo}
              onClick={() => void openCompetitions(logoFailure.organizationId)}
              type="button"
              variant="outline"
            >
              {t("organizations.create.continue")}
            </Button>
          </div>
        </>
      ) : (
        <Button disabled={busy} type="submit">
          {busy ? t("organizations.create.submitting") : t("organizations.create.submit")}
        </Button>
      )}
    </form>
  );
}

function suggestedSlug(name: string): string {
  return name.trim().length === 0 ? "" : slugifyOrganizationText(name);
}

/** Server rejections that belong to one field instead of the form-level alert. */
function fieldError(
  error: OrganizationsClientError | null,
  t: Translate,
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
