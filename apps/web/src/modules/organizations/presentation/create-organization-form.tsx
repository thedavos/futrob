"use client";

import { useEffect, useRef, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  Button,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  Form,
  Input,
  readFormString,
} from "@futrob/ui";
import { useNavigate } from "@tanstack/react-router";
import { OrganizationsClientError } from "@/modules/organizations/presentation/organizations-browser-client.ts";
import {
  useCheckOrganizationNameMutation,
  useCreateOrganizationMutation,
} from "@/modules/organizations/presentation/organization-queries.ts";
import { useFormValidation } from "@/shared/presentation/forms/use-form-validation.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { getBrowserTimeZone } from "@/shared/presentation/time-zone-options.ts";
import {
  SupportErrorAlert,
  type SupportError,
} from "@/shared/presentation/support-error-alert.tsx";

const styles = stylex.create({
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
});

const form = applyStyles(styles.form);

const MAX_NAME_LENGTH = 120;

type CreateOrganizationValues = {
  name: string;
};

type CreateOrganizationField = keyof CreateOrganizationValues;

export function CreateOrganizationForm({
  onCreated,
}: {
  readonly onCreated?: (created: {
    readonly organizationId: string;
    readonly name: string;
  }) => void;
} = {}) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [error, setError] = useState<SupportError | null>(null);
  const validation = useFormValidation<CreateOrganizationField>();
  const checkName = useCheckOrganizationNameMutation();
  const createOrganization = useCreateOrganizationMutation();
  const submitting = checkName.isPending || createOrganization.isPending;
  const nameRef = useRef<HTMLInputElement>(null);
  const refocusName = useRef(false);

  // The input is disabled while submitting, so focus returns to it once the request settles.
  useEffect(() => {
    if (submitting || !refocusName.current) return;
    refocusName.current = false;
    nameRef.current?.focus();
  }, [submitting]);

  function rejectName(message: string) {
    refocusName.current = true;
    validation.applyServerErrors({ name: message });
  }

  async function handleSubmit(formValues: CreateOrganizationValues) {
    const trimmed = formValues.name.trim();

    setError(null);
    validation.clearServerErrors();

    try {
      const { available } = await checkName.mutateAsync({ name: trimmed });
      if (!available) {
        rejectName(t("organizations.create.name.conflict"));
        return;
      }
    } catch (caught) {
      setError(
        supportError(
          caught instanceof OrganizationsClientError ? caught : null,
          t("organizations.create.checkFailed"),
        ),
      );
      return;
    }

    try {
      const created = await createOrganization.mutateAsync({
        name: trimmed,
        timeZone: getBrowserTimeZone(),
      });
      if (onCreated) {
        onCreated({ organizationId: created.organizationId, name: created.name });
        return;
      }
      await navigate({
        to: "/orgs/$orgId/competitions",
        params: { orgId: created.organizationId },
      });
    } catch (caught) {
      const clientError = caught instanceof OrganizationsClientError ? caught : null;
      const fieldError = nameFieldError(clientError);
      if (fieldError) {
        rejectName(t(fieldError));
        return;
      }
      setError(supportError(clientError, t("organizations.create.failed")));
    }
  }

  return (
    <Form<CreateOrganizationValues>
      aria-busy={submitting}
      className={form.className}
      errors={validation.formErrors}
      onFormSubmit={handleSubmit}
      style={form.style}
    >
      {error ? <SupportErrorAlert error={error} /> : null}

      <Field
        {...validation.getFieldValidationProps("name")}
        disabled={submitting}
        name="name"
        validate={(value) => {
          const trimmed = readFormString(value).trim();
          if (trimmed.length === 0) return t("organizations.create.name.required");
          if (trimmed.length > MAX_NAME_LENGTH) return t("organizations.create.name.max");
          return null;
        }}
      >
        <FieldLabel htmlFor="organization-name">{t("organizations.create.name.label")}</FieldLabel>
        <Input
          autoComplete="organization"
          disabled={submitting}
          id="organization-name"
          maxLength={MAX_NAME_LENGTH}
          name="name"
          placeholder={t("organizations.create.name.placeholder")}
          ref={nameRef}
        />
        <FieldDescription>{t("organizations.create.name.description")}</FieldDescription>
        <FieldError />
      </Field>

      <Button disabled={submitting} type="submit">
        {submitting ? t("organizations.create.submitting") : t("organizations.create.submit")}
      </Button>
    </Form>
  );
}

/** Server rejections that belong to the name field instead of the form-level alert. */
function nameFieldError(
  error: OrganizationsClientError | null,
): "organizations.create.name.conflict" | "organizations.create.name.invalid" | null {
  if (error?.code === "organizations.name_conflict") return "organizations.create.name.conflict";
  if (error?.code === "organizations.invalid_name" || error?.code === "api.validation_error") {
    return "organizations.create.name.invalid";
  }
  return null;
}

function supportError(error: OrganizationsClientError | null, message: string): SupportError {
  return {
    message,
    requestId: error?.requestId,
    retryAfterSeconds: error?.retryAfterSeconds,
  };
}
