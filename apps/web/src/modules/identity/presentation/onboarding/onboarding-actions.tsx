import { Button } from "@futrob/ui";

interface OnboardingActionsProps {
  readonly primaryLabel: string;
  readonly onPrimary: () => void;
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly onBack?: () => void;
  readonly onSkip?: () => void;
}

export function OnboardingActions({
  primaryLabel,
  onPrimary,
  disabled,
  loading,
  onBack,
  onSkip,
}: OnboardingActionsProps) {
  return (
    <div className="mx-auto mt-auto flex w-full max-w-lg flex-col gap-2 pt-8">
      <Button disabled={disabled || loading} onClick={onPrimary}>
        {loading ? "Guardando…" : primaryLabel}
      </Button>
      {onSkip ? (
        <Button disabled={loading} onClick={onSkip} variant="ghost">
          Omitir por ahora
        </Button>
      ) : null}
      {onBack ? (
        <Button disabled={loading} onClick={onBack} variant="link">
          Volver
        </Button>
      ) : null}
    </div>
  );
}
