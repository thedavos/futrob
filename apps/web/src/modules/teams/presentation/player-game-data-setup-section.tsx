"use client";

import { useId, useRef, useState } from "react";
import { CircleNotchIcon, GameControllerIcon } from "@phosphor-icons/react";
import {
  Alert,
  AlertDescription,
  applyStyles,
  Button,
  Card,
  CardContent,
  ChoiceGroup,
  Field,
  FieldError,
  FieldLabel,
  Heading,
  Input,
  Stepper,
  Subtitle,
  typography,
} from "@futrob/ui";
import type { GamePlatformDto } from "@futrob/api-contracts";
import { GAME_PLATFORM } from "@futrob/shared-kernel";
import gamepadUrl from "@/assets/gamepad.svg";
import {
  EaClubLinkForm,
  type EaClubLinkSelection,
} from "@/modules/game-data/presentation/ea-club-link-form.tsx";
import { toProviderGameEdition } from "@/modules/game-data/presentation/ea-club-search-meta.ts";
import { searchExternalClubs } from "@/modules/game-data/presentation/search-external-clubs.ts";
import { FieldsetError } from "@/shared/presentation/forms/fieldset-error.tsx";
import { GameEditionField } from "@/shared/presentation/forms/game-edition-field.tsx";
import { PlatformChoice } from "@/shared/presentation/forms/platform-choice.tsx";
import type { ParameterlessMessageKey } from "@/shared/presentation/i18n/catalogs.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { styles } from "./player-game-accounts-page.styles.ts";
import {
  useAddMyGameAccountMutation,
  useAssociateMyExternalClubMutation,
} from "./player-queries.ts";

type SetupStepId = "platform" | "club" | "identifier";

type SetupDraft = {
  readonly platform: GamePlatformDto | null;
  readonly gameEdition: string;
  readonly customGameEdition: boolean;
  readonly club: EaClubLinkSelection | null;
  readonly identifier: string;
};

const emptyDraft = (): SetupDraft => ({
  platform: null,
  gameEdition: "",
  customGameEdition: false,
  club: null,
  identifier: "",
});

const setupStepper = applyStyles(styles.setupStepper);
const setupPrimary = applyStyles(styles.setupPrimary);
const setupSecondary = applyStyles(styles.setupSecondary);
const setupFieldGap = applyStyles(styles.setupFieldGap);
const setupPlatformGrid = applyStyles(styles.setupPlatformGrid);

export function GameDataSetupSection({
  onActiveChange,
}: {
  readonly onActiveChange?: (active: boolean) => void;
}) {
  const { t } = useI18n();
  const addAccount = useAddMyGameAccountMutation();
  const associateClub = useAssociateMyExternalClubMutation();
  const platformLabelId = useId();
  const editionLabelId = useId();
  const validationErrorId = useId();
  const identifierRef = useRef<HTMLInputElement>(null);
  const customEditionRef = useRef<HTMLInputElement>(null);
  const [active, setActive] = useState(false);
  const [step, setStep] = useState<SetupStepId>("platform");
  const [draft, setDraft] = useState<SetupDraft>(emptyDraft);
  const [accountSaved, setAccountSaved] = useState(false);
  const [validationErrorKey, setValidationErrorKey] = useState<ParameterlessMessageKey | null>(
    null,
  );
  const [saveFailed, setSaveFailed] = useState(false);
  const submitting = addAccount.isPending || associateClub.isPending;
  const validationError = validationErrorKey ? t(validationErrorKey) : null;
  const steps = [
    { id: "platform", label: t("player.gameData.setup.steps.platform") },
    { id: "club", label: t("player.gameData.setup.steps.club") },
    { id: "identifier", label: t("player.gameData.setup.steps.identifier") },
  ];

  function patchDraft(patch: Partial<SetupDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setValidationErrorKey(null);
    setSaveFailed(false);
  }

  function openFlow() {
    setActive(true);
    setStep("platform");
    setDraft(emptyDraft());
    setAccountSaved(false);
    setValidationErrorKey(null);
    setSaveFailed(false);
    onActiveChange?.(true);
  }

  function closeFlow() {
    setActive(false);
    setStep("platform");
    setDraft(emptyDraft());
    setAccountSaved(false);
    setValidationErrorKey(null);
    setSaveFailed(false);
    onActiveChange?.(false);
  }

  function continueFromPlatform() {
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
    setStep("club");
  }

  function continueFromClub() {
    if (!draft.club) return;
    setStep("identifier");
  }

  async function submitIdentifier() {
    const identifier = draft.identifier.trim();
    const platform = draft.platform;
    const club = draft.club;
    if (!identifier) {
      setValidationErrorKey("onboarding.account.identifier.required");
      identifierRef.current?.focus();
      return;
    }
    if (!platform || !club) return;
    setSaveFailed(false);
    try {
      if (!accountSaved) {
        await addAccount.mutateAsync({
          identifier,
          platform,
          gameEdition: draft.gameEdition.trim(),
        });
        setAccountSaved(true);
      }
      await associateClub.mutateAsync({
        providerKey: club.providerKey,
        externalClubId: club.externalClubId,
        platform: club.platform,
        gameEdition: club.gameEdition,
        name: club.name,
        imageUrl: club.imageUrl,
      });
      closeFlow();
    } catch {
      setSaveFailed(true);
    }
  }

  function onBack() {
    if (step === "platform") {
      closeFlow();
      return;
    }
    setValidationErrorKey(null);
    setSaveFailed(false);
    setStep(step === "identifier" ? "club" : "platform");
  }

  function onPrimary() {
    if (step === "platform") continueFromPlatform();
    else if (step === "club") continueFromClub();
    else void submitIdentifier();
  }

  const invalidField = invalidSetupField(step, draft, validationError);
  const primaryDisabled = submitting || (step === "club" && !draft.club);
  const primaryLabel =
    step === "identifier" ? t("player.gameData.setup.cta") : t("onboarding.account.continue");

  return (
    <Card className={active ? styles.setupActive : styles.setup}>
      <CardContent className={active ? styles.setupContentActive : styles.setupContent}>
        {active ? (
          <div {...applyStyles(styles.setupChrome)}>
            <img
              alt=""
              data-outline="none"
              src={gamepadUrl}
              {...applyStyles(styles.setupGamepadCompact)}
            />
            <Heading className={styles.setupTitle}>{t("player.gameData.setup.title")}</Heading>
          </div>
        ) : (
          <>
            <img
              alt=""
              data-outline="none"
              src={gamepadUrl}
              {...applyStyles(styles.setupGamepad)}
            />
            <div {...applyStyles(styles.setupCopy)}>
              <Heading className={styles.setupTitle}>{t("player.gameData.setup.title")}</Heading>
              <Subtitle className={styles.setupSubtitle}>
                {t("player.gameData.setup.subtitle")}
              </Subtitle>
            </div>
            <Button onClick={openFlow} type="button">
              <GameControllerIcon aria-hidden data-icon="inline-start" size={16} />
              {t("player.gameData.setup.cta")}
            </Button>
          </>
        )}
        <Stepper
          aria-label={t("player.gameData.setup.steps.progress")}
          className={setupStepper.className}
          currentStepId={active ? step : undefined}
          mobileSummary={(current, total, label) =>
            active
              ? t("player.gameData.setup.steps.summary", { current, label, total })
              : steps.map((item) => item.label).join(" · ")
          }
          steps={steps}
          style={setupStepper.style}
        />
        {active ? (
          <>
            <div {...applyStyles(styles.setupBody)}>
              {saveFailed ? (
                <Alert variant="destructive">
                  <AlertDescription>{t("player.gameData.setup.saveFailed")}</AlertDescription>
                </Alert>
              ) : null}
              {step === "platform" ? (
                <>
                  <fieldset {...applyStyles(styles.setupFieldset)} data-platform-group="">
                    <legend
                      {...applyStyles(typography.label, styles.setupLegend)}
                      id={platformLabelId}
                    >
                      {t("onboarding.account.platform.label")}
                    </legend>
                    <ChoiceGroup<GamePlatformDto | "">
                      aria-describedby={invalidField === "platform" ? validationErrorId : undefined}
                      aria-invalid={invalidField === "platform"}
                      aria-labelledby={platformLabelId}
                      className={setupPlatformGrid.className}
                      onValueChange={(value) => {
                        if (value) patchDraft({ platform: value });
                      }}
                      style={setupPlatformGrid.style}
                      value={draft.platform ?? ""}
                    >
                      <PlatformChoice label="PlayStation" value={GAME_PLATFORM.PLAYSTATION} />
                      <PlatformChoice label="Xbox" value={GAME_PLATFORM.XBOX} />
                      <PlatformChoice label="PC" value={GAME_PLATFORM.PC} />
                      <PlatformChoice
                        label="Nintendo Switch 1"
                        value={GAME_PLATFORM.NINTENDO_SWITCH_1}
                      />
                      <PlatformChoice
                        label="Nintendo Switch 2"
                        value={GAME_PLATFORM.NINTENDO_SWITCH_2}
                      />
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
                    customInputId="game-data-custom-edition"
                    customInputRef={customEditionRef}
                    errorId={validationErrorId}
                    errorMessage={invalidField === "edition" ? validationError : null}
                    invalid={invalidField === "edition"}
                    legendId={editionLabelId}
                    onValueChange={({ value, custom }) => {
                      patchDraft({ customGameEdition: custom, gameEdition: value });
                    }}
                    value={draft.gameEdition}
                  />
                </>
              ) : null}
              {step === "club" ? (
                <EaClubLinkForm
                  busy={submitting}
                  initialPlatform={draft.platform}
                  onClear={() => patchDraft({ club: null })}
                  onSelect={(club) => patchDraft({ club })}
                  searchExternalClubs={searchExternalClubs}
                  searchGameEdition={toProviderGameEdition(draft.gameEdition)}
                  selected={draft.club}
                />
              ) : null}
              {step === "identifier" ? (
                <Field
                  className={setupFieldGap.className}
                  invalid={Boolean(validationError && !draft.identifier.trim())}
                  style={setupFieldGap.style}
                >
                  <FieldLabel htmlFor="game-data-identifier">
                    {t("onboarding.account.identifier.label")}
                  </FieldLabel>
                  <Input
                    aria-describedby={invalidField === "identifier" ? validationErrorId : undefined}
                    aria-invalid={Boolean(validationError && !draft.identifier.trim())}
                    autoComplete="off"
                    id="game-data-identifier"
                    maxLength={80}
                    onChange={(event) => patchDraft({ identifier: event.target.value })}
                    placeholder={t("onboarding.account.identifier.placeholder")}
                    ref={identifierRef}
                    value={draft.identifier}
                  />
                  {invalidField === "identifier" ? (
                    <FieldError id={validationErrorId} match>
                      {validationError}
                    </FieldError>
                  ) : null}
                </Field>
              ) : null}
            </div>
            <div {...applyStyles(styles.setupActions)}>
              <Button
                aria-busy={submitting}
                className={setupPrimary.className}
                disabled={primaryDisabled}
                onClick={onPrimary}
                style={setupPrimary.style}
                type="button"
              >
                {submitting ? (
                  <CircleNotchIcon
                    aria-hidden
                    data-icon="inline-start"
                    size={16}
                    {...applyStyles(styles.spinner)}
                  />
                ) : step === "identifier" ? (
                  <GameControllerIcon aria-hidden data-icon="inline-start" size={16} />
                ) : null}
                {primaryLabel}
              </Button>
              <Button
                className={setupSecondary.className}
                disabled={submitting}
                onClick={onBack}
                style={setupSecondary.style}
                type="button"
                variant="link"
              >
                {t("common.back")}
              </Button>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function invalidSetupField(
  step: SetupStepId,
  draft: SetupDraft,
  validationError: string | null,
): "identifier" | "platform" | "edition" | null {
  if (!validationError) return null;
  if (step === "identifier" && !draft.identifier.trim()) return "identifier";
  if (step === "platform" && !draft.platform) return "platform";
  if (step === "platform" && !draft.gameEdition.trim()) return "edition";
  return null;
}
