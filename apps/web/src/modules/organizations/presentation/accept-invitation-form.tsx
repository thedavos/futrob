"use client";

import { useState, type FormEvent } from "react";
import { Button, Input, Label } from "@futrob/ui";
import { useNavigate } from "@tanstack/react-router";
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
      setError("El token de invitación es obligatorio.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const accepted = await organizationsBrowserClient.acceptInvitation({ token: trimmed });
      await navigate({ to: "/orgs/$orgId", params: { orgId: accepted.organizationId } });
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
        <div
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="invitation-token">Token de invitación</Label>
        <Input
          autoComplete="off"
          disabled={submitting}
          id="invitation-token"
          name="token"
          onChange={(event) => setToken(event.target.value)}
          value={token}
        />
      </div>

      <Button disabled={submitting} type="submit" variant="secondary">
        Unirme
      </Button>
    </form>
  );
}
