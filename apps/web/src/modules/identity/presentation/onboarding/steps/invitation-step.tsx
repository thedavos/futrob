"use client";

import { useRef, useState } from "react";
import type { RequestId } from "@futrob/api-contracts";
import { Field, FieldDescription, FieldError, FieldLabel, Input } from "@futrob/ui";
import { IdentityOnboardingClientError } from "@/modules/identity/presentation/identity-browser-client.ts";
import {
  SupportErrorAlert,
  type SupportErrorAlertCopy,
} from "@/shared/presentation/support-error-alert.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { ParameterlessMessageKey } from "@/shared/presentation/i18n/catalogs.ts";
import { useRetryAfterCountdown } from "@/shared/presentation/use-retry-after-countdown.ts";
import { OnboardingActions } from "../onboarding-actions.tsx";
import { useOnboardingFlow } from "../onboarding-flow.tsx";
import { OnboardingShell } from "../onboarding-shell.tsx";
import { stepsForPath } from "../onboarding-step-meta.ts";

export function InvitationStep() {
  const flow = useOnboardingFlow();
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const retry = useRetryAfterCountdown();
  const [validationErrorKey, setValidationErrorKey] = useState<ParameterlessMessageKey | null>(
    null,
  );
  const validationError = validationErrorKey ? t(validationErrorKey) : null;
  const [previewError, setPreviewError] = useState<{
    readonly code: string;
    readonly requestId?: RequestId;
    readonly retryAfterSeconds?: number;
  } | null>(null);

  async function continueToReview() {
    const token = flow.draft.invitationToken.trim();
    if (!token) {
      setValidationErrorKey("onboarding.invitation.token.required");
      inputRef.current?.focus();
      return;
    }
    if (retry.blocked) return;
    setPreviewError(null);
    try {
      if (await flow.inspectCompetitionInvitation(token)) {
        await flow.goTo("game-account", "invitation");
      }
    } catch (caught) {
      const error =
        caught instanceof IdentityOnboardingClientError
          ? {
              code: caught.code,
              ...(caught.requestId ? { requestId: caught.requestId } : {}),
              ...(caught.retryAfterSeconds ? { retryAfterSeconds: caught.retryAfterSeconds } : {}),
            }
          : { code: "fallback" };
      retry.start(error.retryAfterSeconds);
      setPreviewError(error);
      window.requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  const supportCopy: SupportErrorAlertCopy = {
    retryAfter: (seconds) => t("support.retryAfter", { seconds }),
    codeLabel: t("support.codeLabel"),
    copyAria: t("support.copy.aria"),
    copyAction: t("support.copy.action"),
    copyDone: t("support.copy.done"),
    copySuccess: t("support.copy.success"),
    copyFailure: t("support.copy.failure"),
  };

  return (
    <OnboardingShell
      currentStepId="invitation"
      description={t("onboarding.invitation.description")}
      error={flow.error}
      steps={stepsForPath(t, "invitation")}
      title={t("onboarding.invitation.title")}
    >
      <div className="mx-auto w-full max-w-xl">
        <Field invalid={Boolean(validationError || previewError)}>
          <FieldLabel htmlFor="invitation-token">
            {t("onboarding.invitation.token.label")}
          </FieldLabel>
          <Input
            aria-describedby={
              validationError
                ? "invitation-token-error"
                : previewError
                  ? "invitation-preview-error"
                  : "invitation-token-description"
            }
            aria-invalid={Boolean(validationError || previewError)}
            autoComplete="off"
            id="invitation-token"
            onChange={(event) => {
              flow.updateDraft({ invitationToken: event.target.value });
              setValidationErrorKey(null);
              setPreviewError(null);
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
          {previewError ? (
            <div id="invitation-preview-error">
              <SupportErrorAlert
                copy={supportCopy}
                error={{
                  message: t.error(previewError.code),
                  ...(previewError.requestId ? { requestId: previewError.requestId } : {}),
                  ...(previewError.retryAfterSeconds
                    ? { retryAfterSeconds: retry.remainingSeconds || undefined }
                    : {}),
                }}
              />
            </div>
          ) : null}
        </Field>
      </div>
      <OnboardingActions
        loading={flow.saving}
        onBack={() => void flow.goTo("intention", "invitation")}
        disabled={retry.blocked}
        onPrimary={() => void continueToReview()}
        onSkip={() => {
          flow.updateDraft({ invitationToken: "" });
          void flow.goTo("game-account", "player");
        }}
        primaryLabel={
          retry.blocked
            ? t("onboarding.invitation.retry", { seconds: retry.remainingSeconds })
            : t("onboarding.invitation.review")
        }
        skipLabel={t("onboarding.invitation.continuePlayer")}
      />
    </OnboardingShell>
  );
}
