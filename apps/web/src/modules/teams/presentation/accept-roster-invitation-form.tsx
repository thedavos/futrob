"use client";

import { useEffect, useRef, useState } from "react";
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
import { Link, useNavigate } from "@tanstack/react-router";
import { WarningCircleIcon, CheckCircleIcon } from "@phosphor-icons/react";
import { resolveSafeRedirect } from "@/modules/identity/presentation/safe-redirect.ts";
import { TeamsClientError } from "@/modules/teams/presentation/teams-browser-client.ts";
import { useAcceptRosterInvitationMutation } from "@/modules/teams/presentation/player-queries.ts";
import { useFormValidation } from "@/shared/presentation/forms/use-form-validation.ts";

type AcceptRosterInvitationValues = {
  token: string;
};

type AcceptRosterInvitationField = keyof AcceptRosterInvitationValues;

function rosterInvitationErrorMessage(code: string): string {
  switch (code) {
    case "teams.roster_invitation_not_found":
      return "No encontramos esa invitación a la plantilla.";
    case "teams.roster_invitation_expired":
      return "La invitación a la plantilla ha caducado.";
    case "teams.roster_invitation_revoked":
      return "La invitación a la plantilla fue revocada.";
    case "teams.roster_full":
      return "La plantilla ya está completa.";
    case "teams.roster_competition_conflict":
      return "Ya perteneces a otro equipo en esta competición.";
    case "teams.roster_locked":
      return "La plantilla está cerrada para esta competición.";
    case "teams.roster_invitation_invalid":
      return "La invitación a la plantilla ya no es válida.";
    default:
      return "No se pudo unirte a la plantilla. Inténtalo de nuevo.";
  }
}

export function AcceptRosterInvitationForm(props: {
  readonly initialToken?: string;
  readonly autoAccept?: boolean;
}) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const validation = useFormValidation<AcceptRosterInvitationField>();
  const acceptInvitation = useAcceptRosterInvitationMutation();
  const submitting = acceptInvitation.isPending;
  const autoAttempted = useRef(false);

  async function acceptToken(token: string) {
    const trimmed = token.trim();
    if (trimmed.length === 0) return;

    setError(null);
    validation.clearServerErrors();

    try {
      await acceptInvitation.mutateAsync({ token: trimmed });
      setAccepted(true);
      await navigate({ to: "/player" });
    } catch (caught) {
      if (caught instanceof TeamsClientError) {
        setError(rosterInvitationErrorMessage(caught.code));
      } else {
        setError("No se pudo unirte a la plantilla. Inténtalo de nuevo.");
      }
    }
  }

  useEffect(() => {
    if (!props.autoAccept || props.initialToken === undefined || autoAttempted.current) return;
    autoAttempted.current = true;
    void acceptToken(props.initialToken);
  }, [props.autoAccept, props.initialToken]);

  async function handleSubmit(formValues: AcceptRosterInvitationValues) {
    await acceptToken(formValues.token);
  }

  if (accepted) {
    return (
      <Alert>
        <CheckCircleIcon aria-hidden="true" />
        <AlertDescription>Te uniste a la plantilla. Redirigiendo…</AlertDescription>
      </Alert>
    );
  }

  if (props.autoAccept && submitting && error === null) {
    return (
      <p className="typo-subtitle text-muted-foreground">
        Procesando tu invitación a la plantilla…
      </p>
    );
  }

  return (
    <Form<AcceptRosterInvitationValues>
      aria-busy={submitting}
      className="space-y-5"
      errors={validation.formErrors}
      onFormSubmit={handleSubmit}
    >
      {error ? (
        <Alert variant="destructive">
          <WarningCircleIcon aria-hidden="true" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {props.initialToken === undefined ? (
        <Field
          {...validation.getFieldValidationProps("token")}
          disabled={submitting}
          name="token"
          validate={(value) =>
            readFormString(value).trim().length === 0
              ? "Escribe el enlace o código de invitación."
              : null
          }
        >
          <FieldLabel htmlFor="roster-invitation-token">Código de invitación</FieldLabel>
          <Input
            autoComplete="off"
            disabled={submitting}
            id="roster-invitation-token"
            name="token"
          />
          <FieldError />
        </Field>
      ) : null}

      <Button disabled={submitting} type="submit">
        Unirme a la plantilla
      </Button>

      <p className="typo-caption text-muted-foreground">
        ¿No tienes cuenta?{" "}
        <Link
          className="font-medium text-foreground underline-offset-4 hover:underline"
          to="/signup"
          search={signupSearchWithCurrentPath()}
        >
          Crear una cuenta
        </Link>
      </p>
    </Form>
  );
}

function signupSearchWithCurrentPath(): { redirectTo?: string } {
  if (typeof window === "undefined") return {};
  const redirectTo = resolveSafeRedirect(window.location.pathname);
  return redirectTo == null ? {} : { redirectTo };
}
