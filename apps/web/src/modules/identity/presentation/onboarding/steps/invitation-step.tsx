"use client";

import { useRef, useState } from "react";
import { Field, FieldDescription, FieldError, FieldLabel, Input } from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { OnboardingActions } from "../onboarding-actions.tsx";
import { useOnboardingFlow } from "../onboarding-flow.tsx";
import { OnboardingShell } from "../onboarding-shell.tsx";
import { stepsForPath } from "../onboarding-step-meta.ts";

export function InvitationStep() {
  const flow = useOnboardingFlow();
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  function continueToReview() {
    if (!flow.draft.invitationToken.trim()) {
      setValidationError(t("onboarding.invitation.token.required"));
      inputRef.current?.focus();
      return;
    }
    void flow.goTo("game-account", "invitation");
  }

  return (
    <OnboardingShell
      currentStepId="invitation"
      description={t("onboarding.invitation.description")}
      error={flow.error}
      steps={stepsForPath(t, "invitation")}
      title={t("onboarding.invitation.title")}
    >
      <div className="mx-auto w-full max-w-xl">
        <Field invalid={Boolean(validationError)}>
          <FieldLabel htmlFor="invitation-token">
            {t("onboarding.invitation.token.label")}
          </FieldLabel>
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
            placeholder={t("onboarding.invitation.token.placeholder")}
            ref={inputRef}
            value={flow.draft.invitationToken}
          />
          {validationError ? (
            <FieldError id="invitation-token-error" match>
              {validationError}
            </FieldError>
          ) : (
            <FieldDescription id="invitation-token-description">
              {t("onboarding.invitation.token.description")}
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
        primaryLabel={t("onboarding.invitation.review")}
        skipLabel={t("onboarding.invitation.continuePlayer")}
      />
    </OnboardingShell>
  );
}
