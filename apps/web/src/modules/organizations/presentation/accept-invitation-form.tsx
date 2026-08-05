"use client";

import { useState } from "react";
import {
  Alert,
  AlertDescription,
  Button,
  Field,
  FieldError,
  FieldLabel,
  Form,
  Input,
  readFormString,
} from "@futrob/ui";
import { useNavigate } from "@tanstack/react-router";
import { CircleAlert } from "lucide-react";
import { invitationAcceptErrorMessage } from "@/modules/organizations/presentation/invitation-accept-errors.ts";
import { useAcceptInvitationMutation } from "@/modules/organizations/presentation/organization-queries.ts";
import { useFormValidation } from "@/shared/presentation/forms/use-form-validation.ts";

type AcceptInvitationValues = {
  token: string;
};

type AcceptInvitationField = keyof AcceptInvitationValues;

export function AcceptInvitationForm({ initialToken = "" }: Readonly<{ initialToken?: string }>) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const validation = useFormValidation<AcceptInvitationField>();
  const acceptInvitation = useAcceptInvitationMutation();
  const submitting = acceptInvitation.isPending;

  async function handleSubmit(formValues: AcceptInvitationValues) {
    const trimmed = formValues.token.trim();

    setError(null);
    validation.clearServerErrors();

    try {
      const accepted = await acceptInvitation.mutateAsync({ token: trimmed });
      if (accepted.destination.kind === "competition") {
        await navigate({
          to: "/orgs/$orgId/competitions/$competitionId",
          params: {
            orgId: accepted.destination.organizationId,
            competitionId: accepted.destination.competitionId,
          },
        });
        return;
      }
      await navigate({
        to: "/orgs/$orgId",
        params: { orgId: accepted.organizationId },
      });
    } catch (caught) {
      setError(invitationAcceptErrorMessage(caught));
    }
  }

  return (
    <Form<AcceptInvitationValues>
      aria-busy={submitting}
      className="space-y-5"
      errors={validation.formErrors}
      onFormSubmit={handleSubmit}
    >
      {error ? (
        <Alert variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Field
        {...validation.getFieldValidationProps("token")}
        disabled={submitting}
        name="token"
        validate={(value) =>
          readFormString(value).trim().length === 0 ? "Escribe el código de invitación." : null
        }
      >
        <FieldLabel htmlFor="invitation-token">Código de invitación</FieldLabel>
        <Input
          autoComplete="off"
          defaultValue={initialToken}
          disabled={submitting}
          id="invitation-token"
          name="token"
        />
        <FieldError />
      </Field>

      <Button disabled={submitting} type="submit">
        Unirme a la competición
      </Button>
    </Form>
  );
}
