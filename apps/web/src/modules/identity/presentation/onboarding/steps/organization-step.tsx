"use client";

import { useRef, useState } from "react";
import { Field, FieldError, FieldLabel, Input } from "@futrob/ui";
import { OnboardingActions } from "../onboarding-actions.tsx";
import { useOnboardingFlow } from "../onboarding-flow.tsx";
import { OnboardingShell } from "../onboarding-shell.tsx";
import { stepsByPath } from "../onboarding-step-meta.ts";

export function OrganizationStep() {
  const flow = useOnboardingFlow();
  const inputRef = useRef<HTMLInputElement>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const name = flow.draft.organizationName;

  async function continueToReview() {
    const trimmed = name.trim();
    if (trimmed.length === 0 || trimmed.length > 120) {
      setValidationError(
        trimmed.length === 0
          ? "Escribe el nombre de la organización."
          : "El nombre debe tener como máximo 120 caracteres.",
      );
      inputRef.current?.focus();
      return;
    }
    const available = await flow.checkOrganizationName(trimmed);
    if (available === null) return;
    if (!available) {
      setValidationError("Ese nombre ya está en uso. Elige otro.");
      inputRef.current?.focus();
      return;
    }
    flow.updateDraft({ organizationName: trimmed });
    void flow.goTo("competition", "organization");
  }

  return (
    <OnboardingShell
      currentStepId="organization"
      description="Esta será la organización desde la que administrarás competiciones, equipos y resultados."
      error={flow.error}
      steps={stepsByPath.organization}
      title="Crea tu organización"
    >
      <div className="mx-auto w-full max-w-xl">
        <Field invalid={Boolean(validationError)}>
          <FieldLabel htmlFor="organization-name">Nombre de la organización</FieldLabel>
          <Input
            aria-describedby={validationError ? "organization-name-error" : undefined}
            aria-invalid={Boolean(validationError)}
            autoComplete="organization"
            id="organization-name"
            maxLength={120}
            onChange={(event) => {
              flow.updateDraft({ organizationName: event.target.value });
              setValidationError(null);
            }}
            ref={inputRef}
            value={name}
          />
          {validationError ? (
            <FieldError id="organization-name-error" match>
              {validationError}
            </FieldError>
          ) : null}
        </Field>
      </div>
      <OnboardingActions
        loading={flow.saving}
        onBack={() => void flow.goTo("intention", "organization")}
        onPrimary={() => void continueToReview()}
        primaryLabel="Revisar organización"
      />
    </OnboardingShell>
  );
}
