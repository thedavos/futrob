"use client";

import { useState } from "react";
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
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { Link, useNavigate } from "@tanstack/react-router";
import { CheckCircleIcon } from "@phosphor-icons/react";
import { resolveSafeRedirect } from "@/modules/identity/presentation/safe-redirect.ts";
import { TeamsClientError } from "@/modules/teams/presentation/teams-browser-client.ts";
import { useAcceptRosterInvitationMutation } from "@/modules/teams/presentation/player-queries.ts";
import { rosterInvitationAcceptFailure } from "@/modules/teams/presentation/accept-roster-invitation-once.ts";
import { useFormValidation } from "@/shared/presentation/forms/use-form-validation.ts";
import {
  SupportErrorAlert,
  type SupportError,
} from "@/shared/presentation/support-error-alert.tsx";
import { useRetryAfterCountdown } from "@/shared/presentation/use-retry-after-countdown.ts";

const styles = stylex.create({
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

export function AcceptRosterInvitationForm() {
  const navigate = useNavigate();
  const [error, setError] = useState<SupportError | null>(null);
  const [accepted, setAccepted] = useState(false);
  const validation = useFormValidation<AcceptRosterInvitationField>();
  const acceptInvitation = useAcceptRosterInvitationMutation();
  const submitting = acceptInvitation.isPending;
  const retry = useRetryAfterCountdown();

  async function handleSubmit(formValues: AcceptRosterInvitationValues) {
    const trimmed = formValues.token.trim();
    if (trimmed.length === 0 || retry.blocked) return;

    setError(null);
    validation.clearServerErrors();

    try {
      await acceptInvitation.mutateAsync({ token: trimmed });
      setAccepted(true);
      await navigate({ to: "/player" });
    } catch (caught) {
      const failure = rosterInvitationAcceptFailure(caught instanceof Error ? caught : null);
      if (caught instanceof TeamsClientError) {
        retry.start(caught.retryAfterSeconds);
      }
      setError(failure);
    }
  }

  if (accepted) {
    return (
      <Alert>
        <CheckCircleIcon aria-hidden="true" />
        <AlertDescription>Te uniste a la plantilla. Redirigiendo…</AlertDescription>
      </Alert>
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
        <Input autoComplete="off" disabled={submitting} id="roster-invitation-token" name="token" />
        <FieldError />
      </Field>

      <Button disabled={submitting || retry.blocked} type="submit">
        {submitting
          ? "Procesando…"
          : retry.blocked
            ? `Reintentar en ${retry.remainingSeconds} s`
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
