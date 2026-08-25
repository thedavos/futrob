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
import { useNavigate } from "@tanstack/react-router";
import { invitationAcceptErrorMessage } from "@/modules/organizations/presentation/invitation-accept-errors.ts";
import { OrganizationsClientError } from "@/modules/organizations/presentation/organizations-browser-client.ts";
import { useAcceptInvitationMutation } from "@/modules/organizations/presentation/organization-queries.ts";
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
});

const form = applyStyles(styles.form);

type AcceptInvitationValues = {
  token: string;
};

type AcceptInvitationField = keyof AcceptInvitationValues;

export function AcceptInvitationForm({ initialToken = "" }: Readonly<{ initialToken?: string }>) {
  const navigate = useNavigate();
  const [error, setError] = useState<SupportError | null>(null);
  const validation = useFormValidation<AcceptInvitationField>();
  const acceptInvitation = useAcceptInvitationMutation();
  const submitting = acceptInvitation.isPending;
  const retry = useRetryAfterCountdown();

  async function handleSubmit(formValues: AcceptInvitationValues) {
    const trimmed = formValues.token.trim();
    if (retry.blocked) return;

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
      const clientError = caught instanceof OrganizationsClientError ? caught : null;
      retry.start(clientError?.retryAfterSeconds);
      setError({
        message: clientError?.retryAfterSeconds
          ? "Alcanzaste el límite temporal de invitaciones."
          : invitationAcceptErrorMessage(clientError),
        requestId: clientError?.requestId,
        retryAfterSeconds: clientError?.retryAfterSeconds,
      });
    }
  }

  return (
    <Form<AcceptInvitationValues>
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

      <Button disabled={submitting || retry.blocked} type="submit">
        {submitting
          ? "Procesando…"
          : retry.blocked
            ? `Reintentar en ${retry.remainingSeconds} s`
            : "Unirme a la competición"}
      </Button>
    </Form>
  );
}
