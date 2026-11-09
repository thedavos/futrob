"use client";

import { useId, useRef, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  ChoiceGroup,
  Field,
  FieldError,
  FieldLabel,
  Input,
  typography,
} from "@futrob/ui";
import { media } from "@futrob/ui/styles/media.stylex";
import type { GamePlatformDto } from "@futrob/api-contracts";
import { GAME_PLATFORM } from "@futrob/shared-kernel";
import { FieldsetError } from "@/shared/presentation/forms/fieldset-error.tsx";
import { GameEditionField } from "@/shared/presentation/forms/game-edition-field.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { ParameterlessMessageKey } from "@/shared/presentation/i18n/catalogs.ts";
import { PlatformChoice } from "@/shared/presentation/forms/platform-choice.tsx";
import { OnboardingActions } from "../onboarding-actions.tsx";
import { useOnboardingFlow } from "../onboarding-flow.tsx";
import { OnboardingShell } from "../onboarding-shell.tsx";
import { stepsForPath } from "../onboarding-step-meta.ts";

const styles = stylex.create({
  body: {
    marginInline: "auto",
    display: "grid",
    width: "100%",
    maxWidth: "42rem",
    gap: "2rem",
  },
  fieldGap: {
    gap: "0.75rem",
  },
  fieldset: {
    margin: 0,
    borderWidth: 0,
    padding: 0,
  },
  legend: {
    marginBottom: "0.75rem",
  },
  platformGrid: {
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "repeat(3, minmax(0, 1fr))",
      [media.lg]: "repeat(5, minmax(0, 1fr))",
    },
  },
});

const fieldGap = applyStyles(styles.fieldGap);
const platformGrid = applyStyles(styles.platformGrid);

export function GameAccountStep() {
  const flow = useOnboardingFlow();
  const { t } = useI18n();
  const path = flow.path ?? "player";
  const platformLabelId = useId();
  const editionLabelId = useId();
  const validationErrorId = useId();
  const identifierRef = useRef<HTMLInputElement>(null);
  const customEditionRef = useRef<HTMLInputElement>(null);
  const [validationErrorKey, setValidationErrorKey] = useState<ParameterlessMessageKey | null>(
    null,
  );
  const validationError = validationErrorKey ? t(validationErrorKey) : null;
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
      setValidationErrorKey("onboarding.account.identifier.required");
      identifierRef.current?.focus();
      return;
    }
    if (!draft.platform) {
      setValidationErrorKey("onboarding.account.platform.required");
      document.querySelector<HTMLElement>("[data-platform-group] [role=radio]")?.focus();
      return;
    }
    if (!draft.gameEdition.trim()) {
      setValidationErrorKey("onboarding.account.edition.required");
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
      steps={stepsForPath(t, path, flow.draft.organizationAccountStep)}
      title={t("onboarding.account.title")}
    >
      <div {...applyStyles(styles.body)}>
        <Field
          className={fieldGap.className}
          invalid={Boolean(validationError && !draft.gameAccountIdentifier.trim())}
          style={fieldGap.style}
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
              setValidationErrorKey(null);
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

        <fieldset {...applyStyles(styles.fieldset)} data-platform-group="">
          <legend {...applyStyles(typography.label, styles.legend)} id={platformLabelId}>
            {t("onboarding.account.platform.label")}
          </legend>
          <ChoiceGroup<GamePlatformDto | "">
            aria-describedby={invalidField === "platform" ? validationErrorId : undefined}
            aria-invalid={invalidField === "platform"}
            aria-labelledby={platformLabelId}
            className={platformGrid.className}
            onValueChange={(value) => {
              if (value) flow.updateDraft({ platform: value });
              setValidationErrorKey(null);
            }}
            style={platformGrid.style}
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
            setValidationErrorKey(null);
          }}
          value={draft.gameEdition}
        />
      </div>
      <OnboardingActions
        loading={flow.saving}
        onBack={() =>
          void flow.goTo(
            path === "organization"
              ? "organization"
              : path === "invitation"
                ? "invitation"
                : "intention",
            path,
          )
        }
        // Identity is declared, never verified (DEC-073): the CTA saves what was typed.
        // With nothing typed, skipping is the only way forward.
        disabled={!hasAny}
        onPrimary={continueAfterAccount}
        onSkip={() => {
          flow.clearGameAccount();
          setValidationErrorKey(null);
          void flow.goTo(path === "player" ? "club" : "review", path);
        }}
        primaryLabel={
          path === "player"
            ? t("onboarding.account.saveContinue")
            : t("onboarding.account.saveReview")
        }
      />
    </OnboardingShell>
  );
}
