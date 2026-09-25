"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CircleNotchIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  Button,
  ChoiceGroup,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  FieldError,
  FieldLabel,
  Input,
  typography,
} from "@futrob/ui";
import { media } from "@futrob/ui/styles/media.stylex";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import type { GamePlatformDto, PlayerGameAccountDto } from "@futrob/api-contracts";
import { GAME_PLATFORM } from "@futrob/shared-kernel";
import { formatProviderGameEdition } from "@/modules/game-data/presentation/ea-club-search-meta.ts";
import { FieldsetError } from "@/shared/presentation/forms/fieldset-error.tsx";
import { GameEditionField } from "@/shared/presentation/forms/game-edition-field.tsx";
import { knownGameEditions } from "@/shared/presentation/forms/known-game-editions.ts";
import { PlatformChoice } from "@/shared/presentation/forms/platform-choice.tsx";
import type { ParameterlessMessageKey } from "@/shared/presentation/i18n/catalogs.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { TeamsClientError } from "./teams-browser-client.ts";
import { useUpdateMyGameAccountMutation } from "./player-queries.ts";

type InvalidField = "identifier" | "platform" | "edition";

type EditDraft = {
  readonly identifier: string;
  readonly platform: GamePlatformDto | "";
  readonly gameEdition: string;
  readonly customGameEdition: boolean;
};

const spin = stylex.keyframes({
  to: { transform: "rotate(360deg)" },
});

const styles = stylex.create({
  content: {
    maxWidth: "42rem",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
    marginTop: "1.25rem",
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
  fieldGap: {
    gap: "0.75rem",
  },
  error: {
    marginTop: "1rem",
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    color: colors.destructive,
  },
  footer: {
    marginTop: "1.5rem",
  },
  spinner: {
    animationName: spin,
    animationDuration: "0.8s",
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
  },
});

const content = applyStyles(styles.content);
const footer = applyStyles(styles.footer);
const platformGrid = applyStyles(styles.platformGrid);
const fieldGap = applyStyles(styles.fieldGap);

export function EditGameAccountDialog({
  account,
  open,
  onOpenChange,
}: {
  readonly account: PlayerGameAccountDto;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const updateAccount = useUpdateMyGameAccountMutation();
  const identifierRef = useRef<HTMLInputElement>(null);
  const customEditionRef = useRef<HTMLInputElement>(null);
  const identifierId = useId();
  const platformLabelId = useId();
  const editionLabelId = useId();
  const customEditionId = useId();
  const validationErrorId = useId();
  const [draft, setDraft] = useState<EditDraft>(() => draftFromAccount(account));
  const [invalidField, setInvalidField] = useState<InvalidField | null>(null);
  const [validationErrorKey, setValidationErrorKey] = useState<ParameterlessMessageKey | null>(
    null,
  );
  const [formErrorKey, setFormErrorKey] = useState<ParameterlessMessageKey | null>(null);
  const pending = updateAccount.isPending;
  const validationError = validationErrorKey ? t(validationErrorKey) : null;

  useEffect(() => {
    if (!open) {
      setInvalidField(null);
      setValidationErrorKey(null);
      setFormErrorKey(null);
      return;
    }
    setDraft(draftFromAccount(account));
    setInvalidField(null);
    setValidationErrorKey(null);
    setFormErrorKey(null);
  }, [open, account]);

  function patchDraft(patch: Partial<EditDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setInvalidField(null);
    setValidationErrorKey(null);
    setFormErrorKey(null);
  }

  async function save() {
    if (pending) return;
    const identifier = draft.identifier.trim();
    const gameEdition = draft.gameEdition.trim();
    if (!draft.platform) {
      setInvalidField("platform");
      setValidationErrorKey("onboarding.account.platform.required");
      return;
    }
    if (!gameEdition) {
      setInvalidField("edition");
      setValidationErrorKey("onboarding.account.edition.required");
      if (draft.customGameEdition) customEditionRef.current?.focus();
      return;
    }
    if (!identifier) {
      setInvalidField("identifier");
      setValidationErrorKey("onboarding.account.identifier.required");
      identifierRef.current?.focus();
      return;
    }
    setFormErrorKey(null);
    try {
      await updateAccount.mutateAsync({
        accountId: account.id,
        identifier,
        platform: draft.platform,
        gameEdition,
      });
      onOpenChange(false);
    } catch (caught) {
      if (caught instanceof TeamsClientError) {
        if (caught.code === "teams.invalid_game_account_identifier") {
          setInvalidField("identifier");
          setValidationErrorKey("onboarding.account.identifier.required");
          identifierRef.current?.focus();
          return;
        }
        if (caught.code === "teams.invalid_game_edition") {
          setInvalidField("edition");
          setValidationErrorKey("onboarding.account.edition.required");
          return;
        }
        if (caught.code === "teams.game_account_conflict") {
          setFormErrorKey("player.gameData.identifier.conflict");
          return;
        }
        if (caught.code === "teams.game_account_not_found") {
          setFormErrorKey("player.gameData.identifier.missing");
          return;
        }
      }
      setFormErrorKey("player.gameData.identifier.saveFailed");
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className={content.className} style={content.style}>
        <DialogHeader>
          <DialogTitle>{t("player.gameData.identifier.editTitle")}</DialogTitle>
          <DialogDescription>{t("player.gameData.identifier.editDescription")}</DialogDescription>
        </DialogHeader>
        <fieldset disabled={pending} {...applyStyles(styles.form)}>
          <Field
            className={fieldGap.className}
            invalid={invalidField === "identifier"}
            style={fieldGap.style}
          >
            <FieldLabel htmlFor={identifierId}>
              {t("onboarding.account.identifier.label")}
            </FieldLabel>
            <Input
              aria-describedby={invalidField === "identifier" ? validationErrorId : undefined}
              aria-invalid={invalidField === "identifier"}
              autoComplete="off"
              id={identifierId}
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
          <fieldset data-platform-group="" {...applyStyles(styles.fieldset)}>
            <legend {...applyStyles(typography.label, styles.legend)} id={platformLabelId}>
              {t("onboarding.account.platform.label")}
            </legend>
            <ChoiceGroup<GamePlatformDto | "">
              aria-describedby={invalidField === "platform" ? validationErrorId : undefined}
              aria-invalid={invalidField === "platform"}
              aria-labelledby={platformLabelId}
              className={platformGrid.className}
              onValueChange={(value) => {
                if (value) patchDraft({ platform: value });
              }}
              style={platformGrid.style}
              value={draft.platform}
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
            customInputId={customEditionId}
            customInputRef={customEditionRef}
            disabled={pending}
            errorId={validationErrorId}
            errorMessage={invalidField === "edition" ? validationError : null}
            invalid={invalidField === "edition"}
            legendId={editionLabelId}
            onValueChange={({ value, custom }) => {
              patchDraft({ customGameEdition: custom, gameEdition: value });
            }}
            value={draft.gameEdition}
          />
        </fieldset>
        {formErrorKey ? (
          <p role="alert" {...applyStyles(styles.error)}>
            {t(formErrorKey)}
          </p>
        ) : null}
        <DialogFooter className={footer.className} style={footer.style}>
          <Button aria-busy={pending} disabled={pending} onClick={() => void save()} type="button">
            {pending ? (
              <CircleNotchIcon
                aria-hidden
                data-icon="inline-start"
                size={16}
                {...applyStyles(styles.spinner)}
              />
            ) : null}
            {t("player.gameData.identifier.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function draftFromAccount(account: PlayerGameAccountDto): EditDraft {
  const display = formatProviderGameEdition(account.gameEdition);
  const known = knownGameEditions.some((edition) => edition === display);
  return {
    identifier: account.identifier,
    platform: account.platform,
    gameEdition: known ? display : account.gameEdition,
    customGameEdition: !known,
  };
}
