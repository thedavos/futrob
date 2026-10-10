"use client";

import { useEffect, useRef } from "react";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, Button, typography } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { useOptionalShellActionBar } from "@/shared/presentation/shell/shell-action-bar.tsx";

const styles = stylex.create({
  step: {
    color: colors.mutedForeground,
    whiteSpace: "nowrap",
  },
  separator: {
    color: colors.border,
  },
});

export type CompetitionSetupReviewActions = {
  readonly registrationLabel: string;
  readonly onRegistration: () => void;
  readonly publishLabel: string;
  readonly onPublish: () => void;
  readonly publishDisabled: boolean;
};

export type CompetitionSetupActionBarProps = {
  readonly step: number;
  readonly total: number;
  readonly canGoBack: boolean;
  readonly canContinue: boolean;
  readonly canSave: boolean;
  readonly saving: boolean;
  readonly busy: boolean;
  readonly onBack: () => void;
  readonly onSave: () => void;
  readonly onContinue: () => void;
  readonly review?: CompetitionSetupReviewActions;
};

export function CompetitionSetupActionBarStart({
  step,
  total,
  canGoBack,
  busy,
  onBack,
}: Pick<CompetitionSetupActionBarProps, "step" | "total" | "canGoBack" | "busy" | "onBack">) {
  const { t } = useI18n();
  const label = applyStyles(typography.label, styles.step);
  const separator = applyStyles(styles.separator);
  return (
    <>
      <span {...label}>{t("competitions.setup.step", { step, total })}</span>
      <span aria-hidden="true" {...separator}>
        |
      </span>
      <Button dense disabled={!canGoBack || busy} onClick={onBack} type="button" variant="outline">
        {t("competitions.setup.back")}
      </Button>
    </>
  );
}

export function CompetitionSetupActionBarEnd({
  canContinue,
  canSave,
  saving,
  busy,
  onSave,
  onContinue,
  review,
}: Pick<
  CompetitionSetupActionBarProps,
  "canContinue" | "canSave" | "saving" | "busy" | "onSave" | "onContinue" | "review"
>) {
  const { t } = useI18n();
  return (
    <>
      <Button dense disabled={!canSave || busy} onClick={onSave} type="button" variant="outline">
        {saving ? t("competitions.setup.saving") : t("competitions.setup.saveDraft")}
      </Button>
      <Button dense disabled={!canContinue || busy} onClick={onContinue} type="button">
        {t("competitions.setup.continue")}
      </Button>
      {review ? (
        <>
          <Button
            dense
            disabled={busy}
            onClick={review.onRegistration}
            type="button"
            variant="outline"
          >
            {review.registrationLabel}
          </Button>
          <Button
            dense
            disabled={busy || review.publishDisabled}
            onClick={review.onPublish}
            type="button"
          >
            {review.publishLabel}
          </Button>
        </>
      ) : null}
    </>
  );
}

/** Registers the setup controls in the shell action bar and removes them on leave. */
export function CompetitionSetupActionBarRegistration(props: CompetitionSetupActionBarProps) {
  const bar = useOptionalShellActionBar();
  const setActions = bar?.setActions;
  const clearActions = bar?.clearActions;
  const latest = useRef(props);
  latest.current = props;
  const signature = actionBarSignature(props);

  useEffect(() => {
    if (!setActions || !clearActions) return;
    const current = latest.current;
    setActions([
      {
        id: "competition-setup-start",
        placement: "start",
        node: (
          <CompetitionSetupActionBarStart
            busy={current.busy}
            canGoBack={current.canGoBack}
            onBack={() => latest.current.onBack()}
            step={current.step}
            total={current.total}
          />
        ),
      },
      {
        id: "competition-setup-end",
        placement: "end",
        node: (
          <CompetitionSetupActionBarEnd
            busy={current.busy}
            canContinue={current.canContinue}
            canSave={current.canSave}
            onContinue={() => latest.current.onContinue()}
            onSave={() => latest.current.onSave()}
            review={
              current.review
                ? {
                    ...current.review,
                    onPublish: () => latest.current.review?.onPublish(),
                    onRegistration: () => latest.current.review?.onRegistration(),
                  }
                : undefined
            }
            saving={current.saving}
          />
        ),
      },
    ]);
    return () => clearActions();
  }, [clearActions, setActions, signature]);

  return null;
}

function actionBarSignature(props: CompetitionSetupActionBarProps): string {
  return [
    props.step,
    props.total,
    props.canGoBack,
    props.canContinue,
    props.canSave,
    props.saving,
    props.busy,
    props.review?.registrationLabel ?? "",
    props.review?.publishLabel ?? "",
    props.review?.publishDisabled ?? "",
  ].join("|");
}
