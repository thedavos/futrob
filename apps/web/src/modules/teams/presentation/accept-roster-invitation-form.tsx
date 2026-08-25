"use client";

import { useEffect, useRef, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import {
  Alert,
  AlertDescription,
  applyStyles,
  Button,
  Field,
  FieldError,
  FieldLabel,
  Form,
  Input,
  readFormString,
  hasBrowserWindow,
  typography,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/public.stylex";
import { Link, useNavigate } from "@tanstack/react-router";
import { CheckCircleIcon } from "@phosphor-icons/react";
import { resolveSafeRedirect } from "@/modules/identity/presentation/safe-redirect.ts";
import { TeamsClientError } from "@/modules/teams/presentation/teams-browser-client.ts";
import { useAcceptRosterInvitationMutation } from "@/modules/teams/presentation/player-queries.ts";
import { useFormValidation } from "@/shared/presentation/forms/use-form-validation.ts";
import {
  SupportErrorAlert,
  type SupportError,
} from "@/shared/presentation/support-error-alert.tsx";
import { useRetryAfterCountdown } from "@/shared/presentation/use-retry-after-countdown.ts";

const styles = stylex.create({
  pending: {
    color: colors.mutedForeground,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  hint: {
    color: colors.mutedForeground,
  },
  signup: {
    fontWeight: 500,
    color: colors.foreground,
    textUnderlineOffset: "4px",
    textDecorationLine: {
      default: "none",
      ":hover": "underline",
    },
  },
});

const form = applyStyles(styles.form);
const signup = applyStyles(styles.signup);

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
  const [error, setError] = useState<SupportError | null>(null);
  const [accepted, setAccepted] = useState(false);
  const validation = useFormValidation<AcceptRosterInvitationField>();
  const acceptInvitation = useAcceptRosterInvitationMutation();
  const submitting = acceptInvitation.isPending;
  const autoAttempted = useRef(false);
  const retry = useRetryAfterCountdown();

  async function acceptToken(token: string) {
    const trimmed = token.trim();
    if (trimmed.length === 0 || retry.blocked) return;

    setError(null);
    validation.clearServerErrors();

    try {
      await acceptInvitation.mutateAsync({ token: trimmed });
      setAccepted(true);
      await navigate({ to: "/player" });
    } catch (caught) {
      if (caught instanceof TeamsClientError) {
        retry.start(caught.retryAfterSeconds);
        setError({
          message: caught.retryAfterSeconds
            ? "Alcanzaste el límite temporal de invitaciones."
            : rosterInvitationErrorMessage(caught.code),
          requestId: caught.requestId,
          retryAfterSeconds: caught.retryAfterSeconds,
        });
      } else {
        setError({ message: "No se pudo unirte a la plantilla. Inténtalo de nuevo." });
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

  function retryInitialToken() {
    if (props.initialToken !== undefined) void acceptToken(props.initialToken);
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
      <p {...applyStyles(typography.subtitle, styles.pending)}>
        Procesando tu invitación a la plantilla…
      </p>
    );
  }

  return (
    <Form<AcceptRosterInvitationValues>
      aria-busy={submitting}
      className={form.className}
      errors={validation.formErrors}
      onFormSubmit={handleSubmit}
      style={form.style}
    >
      {error ? (
        <SupportErrorAlert
          error={{ ...error, retryAfterSeconds: retry.remainingSeconds || undefined }}
        />
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

      <Button
        disabled={submitting || retry.blocked}
        onClick={props.initialToken === undefined ? undefined : retryInitialToken}
        type={props.initialToken === undefined ? "submit" : "button"}
      >
        {submitting
          ? "Procesando…"
          : retry.blocked
            ? `Reintentar en ${retry.remainingSeconds} s`
            : error && props.initialToken !== undefined
              ? "Reintentar invitación"
              : "Unirme a la plantilla"}
      </Button>

      <p {...applyStyles(typography.caption, styles.hint)}>
        ¿No tienes cuenta?{" "}
        <Link
          className={signup.className}
          search={signupSearchWithCurrentPath()}
          style={signup.style}
          to="/signup"
        >
          Crear una cuenta
        </Link>
      </p>
    </Form>
  );
}

function signupSearchWithCurrentPath() {
  if (!hasBrowserWindow()) return {};
  const redirectTo = resolveSafeRedirect(window.location.pathname);
  return redirectTo == null ? {} : { redirectTo };
}
