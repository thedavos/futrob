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

export type CompetitionSetupRegistrationAction = {
  readonly label: string;
  readonly onRegistration: () => void;
};

export type CompetitionSetupPublishAction = {
  readonly label: string;
  readonly onPublish: () => void;
  readonly disabled: boolean;
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
  readonly registration?: CompetitionSetupRegistrationAction;
  readonly publish?: CompetitionSetupPublishAction;
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
  registration,
  publish,
}: Pick<
  CompetitionSetupActionBarProps,
  | "canContinue"
  | "canSave"
  | "saving"
  | "busy"
  | "onSave"
  | "onContinue"
  | "registration"
  | "publish"
>) {
  const { t } = useI18n();
  return (
    <>
      <Button dense disabled={!canSave || busy} onClick={onSave} type="button" variant="outline">
        {saving ? t("competitions.setup.saving") : t("competitions.setup.saveDraft")}
      </Button>
      {registration ? (
        <Button
          dense
          disabled={busy}
          onClick={registration.onRegistration}
          type="button"
          variant="outline"
        >
          {registration.label}
        </Button>
      ) : null}
      {canContinue ? (
        <Button dense disabled={busy} onClick={onContinue} type="button">
          {t("competitions.setup.continue")}
        </Button>
      ) : null}
      {publish ? (
        <Button dense disabled={busy || publish.disabled} onClick={publish.onPublish} type="button">
          {publish.label}
        </Button>
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
            publish={
              current.publish
                ? {
                    ...current.publish,
                    onPublish: () => latest.current.publish?.onPublish(),
                  }
                : undefined
            }
            registration={
              current.registration
                ? {
                    ...current.registration,
                    onRegistration: () => latest.current.registration?.onRegistration(),
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
    props.registration?.label ?? "",
    props.publish?.label ?? "",
    props.publish?.disabled ?? "",
  ].join("|");
}
