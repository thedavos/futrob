"use client";

import { useRef, useState } from "react";
import { Field, FieldError, FieldLabel, Input } from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { OnboardingActions } from "../onboarding-actions.tsx";
import { useOnboardingFlow } from "../onboarding-flow.tsx";
import { OnboardingShell } from "../onboarding-shell.tsx";
import { stepsForPath } from "../onboarding-step-meta.ts";

export function OrganizationStep() {
  const flow = useOnboardingFlow();
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const name = flow.draft.organizationName;

  async function continueToReview() {
    const trimmed = name.trim();
    if (trimmed.length === 0 || trimmed.length > 120) {
      setValidationError(
        trimmed.length === 0
          ? t("onboarding.organization.name.required")
          : t("onboarding.organization.name.max"),
      );
      inputRef.current?.focus();
      return;
    }
    const available = await flow.checkOrganizationName(trimmed);
    if (available === null) return;
    if (!available) {
      setValidationError(t("onboarding.organization.name.conflict"));
      inputRef.current?.focus();
      return;
    }
    flow.updateDraft({ organizationName: trimmed });
    void flow.goTo("competition", "organization");
  }

  return (
    <OnboardingShell
      currentStepId="organization"
      description={t("onboarding.organization.description")}
      error={flow.error}
      steps={stepsForPath(t, "organization")}
      title={t("onboarding.organization.title")}
    >
      <div className="mx-auto w-full max-w-xl">
        <Field invalid={Boolean(validationError)}>
          <FieldLabel htmlFor="organization-name">
            {t("onboarding.organization.name.label")}
          </FieldLabel>
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
            placeholder={t("onboarding.organization.name.placeholder")}
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
        primaryLabel={t("onboarding.organization.review")}
      />
    </OnboardingShell>
  );
}
