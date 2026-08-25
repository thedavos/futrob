import * as stylex from "@stylexjs/stylex";
import { applyStyles, Button } from "@futrob/ui";
import { media } from "@futrob/ui/styles/media.stylex";
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

const spin = stylex.keyframes({
  to: { transform: "rotate(360deg)" },
});

const styles = stylex.create({
  row: {
    marginTop: {
      default: "2rem",
      [media.sm]: "3rem",
    },
    display: "flex",
    width: "100%",
    flexDirection: {
      default: "column",
      [media.sm]: "row-reverse",
    },
    alignItems: {
      default: "stretch",
      [media.sm]: "center",
    },
    justifyContent: {
      default: null,
      [media.sm]: "space-between",
    },
    gap: {
      default: "0.5rem",
      [media.sm]: "1rem",
    },
  },
  primaryGroup: {
    display: "flex",
    flexDirection: {
      default: "column",
      [media.sm]: "row-reverse",
    },
    alignItems: {
      default: "stretch",
      [media.sm]: "center",
    },
    gap: {
      default: "0.5rem",
      [media.sm]: "0.75rem",
    },
  },
  primary: {
    width: {
      default: "100%",
      [media.sm]: "auto",
    },
    minWidth: {
      default: null,
      [media.sm]: "10rem",
    },
  },
  secondary: {
    width: {
      default: "100%",
      [media.sm]: "auto",
    },
  },
  spinner: {
    width: "1rem",
    height: "1rem",
    animationName: spin,
    animationDuration: "1s",
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
  },
});

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
  const primary = applyStyles(styles.primary);
  const secondary = applyStyles(styles.secondary);
  const spinner = applyStyles(styles.spinner);
  return (
    <div {...applyStyles(styles.row)}>
      <div {...applyStyles(styles.primaryGroup)}>
        <Button
          aria-busy={loading}
          className={primary.className}
          disabled={disabled || loading}
          onClick={onPrimary}
          style={primary.style}
        >
          {loading ? (
            <CircleNotchIcon
              aria-hidden="true"
              className={spinner.className}
              data-icon="inline-start"
              style={spinner.style}
            />
          ) : null}
          {primaryLabel}
        </Button>
        {onSkip ? (
          <Button
            className={secondary.className}
            disabled={loading}
            onClick={onSkip}
            style={secondary.style}
            variant="ghost"
          >
            {skipLabel ?? t("common.skip")}
          </Button>
        ) : null}
      </div>
      {onBack ? (
        <Button
          className={secondary.className}
          disabled={loading}
          onClick={onBack}
          style={secondary.style}
          variant="link"
        >
          {t("common.back")}
        </Button>
      ) : null}
    </div>
  );
}
