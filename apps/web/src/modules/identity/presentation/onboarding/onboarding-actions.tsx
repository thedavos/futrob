import { Button } from "@futrob/ui";
import { CircleNotchIcon } from "@phosphor-icons/react";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";

interface OnboardingActionsProps {
  readonly primaryLabel: string;
  readonly onPrimary: () => void;
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly onBack?: () => void;
  readonly onSkip?: () => void;
  readonly skipLabel?: string;
}

export function OnboardingActions({
  primaryLabel,
  onPrimary,
  disabled,
  loading,
  onBack,
  onSkip,
  skipLabel,
}: OnboardingActionsProps) {
  const { t } = useI18n();
  return (
    <div className="mt-8 flex w-full flex-col gap-2 sm:mt-12 sm:flex-row-reverse sm:items-center sm:justify-between sm:gap-4">
      <div className="flex flex-col gap-2 sm:flex-row-reverse sm:items-center sm:gap-3">
        <Button
          className="w-full sm:min-w-40 sm:w-auto"
          aria-busy={loading}
          disabled={disabled || loading}
          onClick={onPrimary}
        >
          {loading ? (
            <CircleNotchIcon
              aria-hidden="true"
              className="size-4 animate-spin"
              data-icon="inline-start"
            />
          ) : null}
          {primaryLabel}
        </Button>
        {onSkip ? (
          <Button className="w-full sm:w-auto" disabled={loading} onClick={onSkip} variant="ghost">
            {skipLabel ?? t("common.skip")}
          </Button>
        ) : null}
      </div>
      {onBack ? (
        <Button className="w-full sm:w-auto" disabled={loading} onClick={onBack} variant="link">
          {t("common.back")}
        </Button>
      ) : null}
    </div>
  );
}
