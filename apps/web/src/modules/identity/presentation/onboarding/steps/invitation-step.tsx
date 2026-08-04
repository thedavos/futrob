"use client";

import { useRef, useState } from "react";
import { Field, FieldDescription, FieldError, FieldLabel, Input } from "@futrob/ui";
import { OnboardingActions } from "../onboarding-actions.tsx";
import { useOnboardingFlow } from "../onboarding-flow.tsx";
import { OnboardingShell } from "../onboarding-shell.tsx";
import { stepsByPath } from "../onboarding-step-meta.ts";

export function InvitationStep() {
  const flow = useOnboardingFlow();
  const inputRef = useRef<HTMLInputElement>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  function continueToReview() {
    if (!flow.draft.invitationToken.trim()) {
      setValidationError("Pega el código de invitación para continuar.");
      inputRef.current?.focus();
      return;
    }
    void flow.goTo("game-account", "invitation");
  }

  return (
    <OnboardingShell
      currentStepId="invitation"
      description="Escribe el código que recibiste para unirte a la competición al confirmar."
      error={flow.error}
      steps={stepsByPath.invitation}
      title="Únete a una competición"
    >
      <div className="mx-auto w-full max-w-xl">
        <Field invalid={Boolean(validationError)}>
          <FieldLabel htmlFor="invitation-token">Código de invitación</FieldLabel>
          <Input
            aria-describedby={
              validationError ? "invitation-token-error" : "invitation-token-description"
            }
            aria-invalid={Boolean(validationError)}
            autoComplete="off"
            id="invitation-token"
            onChange={(event) => {
              flow.updateDraft({ invitationToken: event.target.value });
              setValidationError(null);
            }}
            placeholder="Pega el código que recibiste"
            ref={inputRef}
            value={flow.draft.invitationToken}
          />
          {validationError ? (
            <FieldError id="invitation-token-error" match>
              {validationError}
            </FieldError>
          ) : (
            <FieldDescription id="invitation-token-description">
              Comprobaremos el código al confirmar. No se guardará con tu progreso.
            </FieldDescription>
          )}
        </Field>
      </div>
      <OnboardingActions
        loading={flow.saving}
        onBack={() => void flow.goTo("intention", "invitation")}
        onPrimary={continueToReview}
        onSkip={() => {
          flow.updateDraft({ invitationToken: "" });
          void flow.goTo("game-account", "player");
        }}
        primaryLabel="Revisar invitación"
        skipLabel="Continuar como jugador"
      />
    </OnboardingShell>
  );
}
