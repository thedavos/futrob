"use client";

import { useState } from "react";
import { Button, Field, FieldError, FieldLabel, Form, Input, readFormString } from "@futrob/ui";
import { useNavigate } from "@tanstack/react-router";
import {
  OrganizationsClientError,
  organizationsBrowserClient,
} from "@/modules/organizations/presentation/organizations-browser-client.ts";
import { useFormValidation } from "@/shared/presentation/forms/use-form-validation.ts";

type CreateOrganizationValues = {
  name: string;
};

type CreateOrganizationField = keyof CreateOrganizationValues;

export function CreateOrganizationForm() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const validation = useFormValidation<CreateOrganizationField>();

  async function handleSubmit(formValues: CreateOrganizationValues) {
    const trimmed = formValues.name.trim();

    setSubmitting(true);
    setError(null);
    validation.clearServerErrors();

    try {
      const created = await organizationsBrowserClient.create({ name: trimmed });
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
      setSubmitting(false);
    }
  }

  return (
    <Form<CreateOrganizationValues>
      aria-busy={submitting}
      className="space-y-5"
      errors={validation.formErrors}
      onFormSubmit={handleSubmit}
    >
      {error ? (
        <div
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
          role="alert"
        >
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
