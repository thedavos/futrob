"use client";

import { useId, useRef, useState } from "react";
import {
  Alert,
  AlertDescription,
  Button,
  ChoiceGroup,
  Field,
  FieldError,
  FieldLabel,
  Input,
} from "@futrob/ui";
import { InfoIcon } from "@phosphor-icons/react";
import type { GamePlatformDto } from "@futrob/api-contracts";
import { GAME_PLATFORM } from "@futrob/shared-kernel";
import { FieldsetError } from "@/shared/presentation/forms/fieldset-error.tsx";
import { GameEditionField } from "@/shared/presentation/forms/game-edition-field.tsx";
import { knownGameEditions } from "@/shared/presentation/forms/known-game-editions.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { PlatformChoice } from "@/shared/presentation/forms/platform-choice.tsx";
import { OnboardingActions } from "../onboarding-actions.tsx";
import { useOnboardingFlow } from "../onboarding-flow.tsx";
import { OnboardingShell } from "../onboarding-shell.tsx";
import { stepsForPath } from "../onboarding-step-meta.ts";

export function GameAccountStep() {
  const flow = useOnboardingFlow();
  const { t } = useI18n();
  const path = flow.path ?? "player";
  const platformLabelId = useId();
  const editionLabelId = useId();
  const validationErrorId = useId();
  const identifierRef = useRef<HTMLInputElement>(null);
  const customEditionRef = useRef<HTMLInputElement>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const draft = flow.draft;
  const hasAny = Boolean(
    draft.gameAccountIdentifier.trim() || draft.platform || draft.gameEdition.trim(),
  );
  const invalidField = validationError
    ? !draft.gameAccountIdentifier.trim()
      ? "identifier"
      : !draft.platform
        ? "platform"
        : !draft.gameEdition.trim()
          ? "edition"
          : null
    : null;

  function continueAfterAccount() {
    if (!draft.gameAccountIdentifier.trim()) {
      setValidationError(t("onboarding.account.identifier.required"));
      identifierRef.current?.focus();
      return;
    }
    if (!draft.platform) {
      setValidationError(t("onboarding.account.platform.required"));
      document.querySelector<HTMLElement>("[data-platform-group] [role=radio]")?.focus();
      return;
    }
    if (!draft.gameEdition.trim()) {
      setValidationError(t("onboarding.account.edition.required"));
      if (draft.customGameEdition) customEditionRef.current?.focus();
      else document.querySelector<HTMLElement>("[data-edition-group] [role=radio]")?.focus();
      return;
    }
    flow.updateDraft({
      gameAccountIdentifier: draft.gameAccountIdentifier.trim(),
      gameEdition: draft.gameEdition.trim(),
    });
    void flow.goTo(path === "player" ? "club" : "review", path);
  }

  return (
    <OnboardingShell
      currentStepId="game-account"
      description={t("onboarding.account.description")}
      error={flow.error}
      steps={stepsForPath(t, path)}
      title={t("onboarding.account.title")}
    >
      <div className="mx-auto grid w-full max-w-2xl gap-8">
        {path === "organization" &&
        flow.draft.competitionPlatform &&
        flow.draft.competitionGameEdition.trim() ? (
          <Alert
            className="sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-x-4 sm:[&>svg]:mt-0"
            variant="info"
          >
            <InfoIcon aria-hidden="true" />
            <AlertDescription>{t("onboarding.account.reuse.description")}</AlertDescription>
            <Button
              className="col-start-2 mt-2 w-full sm:col-start-3 sm:row-start-1 sm:mt-0 sm:w-auto"
              onClick={() =>
                flow.updateDraft({
                  platform: flow.draft.competitionPlatform,
                  gameEdition: flow.draft.competitionGameEdition,
                  customGameEdition: !(knownGameEditions as readonly string[]).includes(
                    flow.draft.competitionGameEdition,
                  ),
                })
              }
              variant="outline"
            >
              {t("onboarding.account.reuse.action")}
            </Button>
          </Alert>
        ) : null}
        <Field
          className="gap-3"
          invalid={Boolean(validationError && !draft.gameAccountIdentifier.trim())}
        >
          <FieldLabel htmlFor="game-account-identifier">
            {t("onboarding.account.identifier.label")}
          </FieldLabel>
          <Input
            aria-describedby={invalidField === "identifier" ? validationErrorId : undefined}
            aria-invalid={Boolean(validationError && !draft.gameAccountIdentifier.trim())}
            autoComplete="off"
            id="game-account-identifier"
            maxLength={80}
            onChange={(event) => {
              flow.updateDraft({ gameAccountIdentifier: event.target.value });
              setValidationError(null);
            }}
            placeholder={t("onboarding.account.identifier.placeholder")}
            ref={identifierRef}
            value={draft.gameAccountIdentifier}
          />
          {invalidField === "identifier" ? (
            <FieldError id={validationErrorId} match>
              {validationError}
            </FieldError>
          ) : null}
        </Field>

        <fieldset className="m-0 border-0 p-0" data-platform-group>
          <legend className="mb-3 typo-label" id={platformLabelId}>
            {t("onboarding.account.platform.label")}
          </legend>
          <ChoiceGroup<GamePlatformDto | "">
            aria-describedby={invalidField === "platform" ? validationErrorId : undefined}
            aria-invalid={invalidField === "platform"}
            aria-labelledby={platformLabelId}
            className="grid-cols-1 sm:grid-cols-3 lg:grid-cols-5"
            onValueChange={(value) => {
              if (value) flow.updateDraft({ platform: value });
              setValidationError(null);
            }}
            value={draft.platform ?? ""}
          >
            <PlatformChoice label="PlayStation" value={GAME_PLATFORM.PLAYSTATION} />
            <PlatformChoice label="Xbox" value={GAME_PLATFORM.XBOX} />
            <PlatformChoice label="PC" value={GAME_PLATFORM.PC} />
            <PlatformChoice label="Nintendo Switch 1" value={GAME_PLATFORM.NINTENDO_SWITCH_1} />
            <PlatformChoice label="Nintendo Switch 2" value={GAME_PLATFORM.NINTENDO_SWITCH_2} />
          </ChoiceGroup>
          {invalidField === "platform" ? (
            <FieldsetError id={validationErrorId}>{validationError}</FieldsetError>
          ) : null}
        </fieldset>

        <GameEditionField
          copy={{
            legend: t("onboarding.competition.edition.legend"),
            other: t("onboarding.competition.edition.other"),
            customName: t("onboarding.competition.edition.name"),
            customPlaceholder: t("onboarding.competition.edition.placeholder"),
          }}
          custom={draft.customGameEdition}
          customInputId="custom-game-edition"
          customInputRef={customEditionRef}
          errorId={validationErrorId}
          errorMessage={invalidField === "edition" ? validationError : null}
          invalid={invalidField === "edition"}
          legendId={editionLabelId}
          onValueChange={({ value, custom }) => {
            flow.updateDraft({ customGameEdition: custom, gameEdition: value });
            setValidationError(null);
          }}
          value={draft.gameEdition}
        />
      </div>
      <OnboardingActions
        loading={flow.saving}
        onBack={() =>
          void flow.goTo(
            path === "organization"
              ? "competition"
              : path === "invitation"
                ? "invitation"
                : "intention",
            path,
          )
        }
        onPrimary={continueAfterAccount}
        onSkip={() => {
          flow.clearGameAccount();
          setValidationError(null);
          void flow.goTo(path === "player" ? "club" : "review", path);
        }}
        primaryLabel={
          path === "player"
            ? hasAny
              ? t("onboarding.account.continue")
              : t("onboarding.account.linkContinue")
            : hasAny
              ? t("onboarding.account.review")
              : t("onboarding.account.linkReview")
        }
      />
    </OnboardingShell>
  );
}
