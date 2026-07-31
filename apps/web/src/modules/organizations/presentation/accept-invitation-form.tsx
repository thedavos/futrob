"use client";

import { useState, type FormEvent } from "react";
import { Alert, AlertDescription, Button, Field, FieldLabel, Input } from "@futrob/ui";
import { useNavigate } from "@tanstack/react-router";
import { CircleAlert } from "lucide-react";
import {
  OrganizationsClientError,
  organizationsBrowserClient,
} from "@/modules/organizations/presentation/organizations-browser-client.ts";

export function AcceptInvitationForm() {
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = token.trim();
    if (trimmed.length === 0) {
      setError("Escribe el código de invitación.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const accepted = await organizationsBrowserClient.acceptInvitation({ token: trimmed });
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
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" noValidate onSubmit={handleSubmit}>
      {error ? (
        <Alert variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Field>
        <FieldLabel htmlFor="invitation-token">Código de invitación</FieldLabel>
        <Input
          autoComplete="off"
          disabled={submitting}
          id="invitation-token"
          name="token"
          onChange={(event) => setToken(event.target.value)}
          value={token}
        />
      </Field>

      <Button disabled={submitting} type="submit">
        Unirme a la competición
      </Button>
    </form>
  );
}
