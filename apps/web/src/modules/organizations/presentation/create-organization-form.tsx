"use client";

import { useState } from "react";
import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  Button,
  Field,
  FieldError,
  FieldLabel,
  Form,
  Input,
  readFormString,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/public.stylex";
const styles = stylex.create({
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
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
});
import { useNavigate } from "@tanstack/react-router";
import { OrganizationsClientError } from "@/modules/organizations/presentation/organizations-browser-client.ts";
import { useCreateOrganizationMutation } from "@/modules/organizations/presentation/organization-queries.ts";
import { useFormValidation } from "@/shared/presentation/forms/use-form-validation.ts";

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
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const validation = useFormValidation<CreateOrganizationField>();
  const createOrganization = useCreateOrganizationMutation();
  const submitting = createOrganization.isPending;

  async function handleSubmit(formValues: CreateOrganizationValues) {
    const trimmed = formValues.name.trim();

    setError(null);
    validation.clearServerErrors();

    try {
      const created = await createOrganization.mutateAsync({ name: trimmed });
      if (onCreated) {
        onCreated({ organizationId: created.organizationId, name: created.name });
        return;
      }
      await navigate({ to: "/orgs/$orgId", params: { orgId: created.organizationId } });
    } catch (caught) {
      if (caught instanceof OrganizationsClientError) {
        if (caught.code === "organizations.invalid_name") {
          validation.applyServerErrors({ name: "El nombre no es válido." });
          setError(null);
        } else {
          setError("No se pudo crear la organización. Inténtalo de nuevo.");
        }
      } else {
        setError("No se pudo crear la organización. Inténtalo de nuevo.");
      }
    }
  }

  return (
    <Form<CreateOrganizationValues>
      aria-busy={submitting}
      className={applyStyles(styles.form).className}
      errors={validation.formErrors}
      onFormSubmit={handleSubmit}
      style={applyStyles(styles.form).style}
    >
      {error ? (
        <div role="alert" {...applyStyles(styles.error)}>
          {error}
        </div>
      ) : null}

      <Field
        {...validation.getFieldValidationProps("name")}
        disabled={submitting}
        name="name"
        validate={(value) =>
          readFormString(value).trim().length === 0 ? "El nombre es obligatorio." : null
        }
      >
        <FieldLabel htmlFor="organization-name">Nombre de la organización</FieldLabel>
        <Input
          autoComplete="organization"
          disabled={submitting}
          id="organization-name"
          name="name"
        />
        <FieldError />
      </Field>

      <Button disabled={submitting} type="submit">
        Crear organización
      </Button>
    </Form>
  );
}
