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
import { OrganizationsClientError } from "@/modules/organizations/presentation/organizations-browser-client.ts";
import { useAcceptInvitationMutation } from "@/modules/organizations/presentation/organization-queries.ts";
import { useFormValidation } from "@/shared/presentation/forms/use-form-validation.ts";

type AcceptInvitationValues = {
  token: string;
};

type AcceptInvitationField = keyof AcceptInvitationValues;

export function AcceptInvitationForm() {
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
      await navigate({
        to: "/orgs/$orgId/competitions/$competitionId",
        params: {
          orgId: accepted.destination.organizationId,
          competitionId: accepted.destination.competitionId,
        },
      });
    } catch (caught) {
      if (caught instanceof OrganizationsClientError) {
        switch (caught.code) {
          case "organizations.invitation_not_found":
            setError("No encontramos esa invitación.");
            break;
          case "organizations.invitation_expired":
            setError("La invitación ha caducado.");
            break;
          case "organizations.invitation_revoked":
            setError("La invitación fue revocada.");
            break;
          default:
            setError("No se pudo aceptar la invitación. Inténtalo de nuevo.");
        }
      } else {
        setError("No se pudo aceptar la invitación. Inténtalo de nuevo.");
      }
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
        <Input autoComplete="off" disabled={submitting} id="invitation-token" name="token" />
        <FieldError />
      </Field>

      <Button disabled={submitting} type="submit">
        Unirme a la competición
      </Button>
    </Form>
  );
}
