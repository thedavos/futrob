import { Input as InputPrimitive } from "@base-ui/react/input";
import * as stylex from "@stylexjs/stylex";

import { applyProps } from "#styles/apply";
import { colors } from "#styles/tokens.stylex";
import { media } from "#styles/media.stylex";

const styles = stylex.create({
  base: {
    width: "100%",
    minWidth: 0,
    borderRadius: "var(--corner-lg)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: {
      default: colors.input,
      ":focus-visible": colors.ring,
      ':is([aria-invalid="true"])': colors.danger,
      ':is([aria-invalid="true"]):focus-visible': colors.danger,
    },
    backgroundColor: {
      default: colors.surface,
      ":disabled": colors.muted,
    },
    paddingInline: "0.75rem",
    fontSize: {
      default: "1rem",
      [media.sm]: "0.875rem",
    },
    lineHeight: {
      default: "1.5rem",
      [media.sm]: "1.25rem",
    },
    color: colors.foreground,
    transitionProperty: "background-color, border-color, box-shadow",
    transitionDuration: "var(--duration-normal)",
    transitionTimingFunction: "var(--ease-emphasized)",
    outlineWidth: 0,
    outlineStyle: "none",
    boxShadow: {
      default: null,
      ":focus-visible": "0 0 0 2px color-mix(in oklab, var(--ring) 25%, transparent)",
      ':is([aria-invalid="true"])': "0 0 0 2px color-mix(in oklab, var(--danger) 15%, transparent)",
      ':is([aria-invalid="true"]):focus-visible':
        "0 0 0 2px color-mix(in oklab, var(--danger) 25%, transparent)",
    },
    cursor: {
      default: null,
      ":disabled": "not-allowed",
    },
    opacity: {
      default: 1,
      ":disabled": 0.6,
    },
    "::placeholder": {
      color: colors.mutedForeground,
    },
  },
  heightDefault: {
    height: "var(--control-height)",
  },
  heightDense: {
    height: {
      default: "var(--control-height-dense)",
      [media.maxSm]: "var(--control-height-touch)",
    },
  },
});

type InputProps = InputPrimitive.Props & {
  /** Compact desktop/operator mode. Touch layouts stay at the accessible 44px target. */
  dense?: boolean;
};

function Input({ className, style, dense = false, type, ...props }: InputProps) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      data-density={dense ? "dense" : "default"}
      {...applyProps(
        className,
        style,
        styles.base,
        dense ? styles.heightDense : styles.heightDefault,
      )}
      {...props}
    />
  );
}

export { Input };
export type { InputProps };
