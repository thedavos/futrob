import * as React from "react";
import * as stylex from "@stylexjs/stylex";

import { applyProps } from "#styles/apply";
import { colors } from "#styles/tokens.stylex";
import { media } from "#styles/media.stylex";

const styles = stylex.create({
  base: {
    minHeight: "7rem",
    width: "100%",
    resize: "vertical",
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
    lineHeight: 1.625,
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
  paddingDefault: {
    paddingBlock: "0.625rem",
  },
  paddingDense: {
    paddingBlock: {
      default: "0.5rem",
      [media.maxSm]: "0.625rem",
    },
  },
});

type TextareaProps = React.ComponentProps<"textarea"> & {
  /** Compact desktop/operator mode. Touch layouts retain comfortable padding. */
  dense?: boolean;
};

function Textarea({ className, style, dense = false, ...props }: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      data-density={dense ? "dense" : "default"}
      {...applyProps(
        className,
        style,
        styles.base,
        dense ? styles.paddingDense : styles.paddingDefault,
      )}
      {...props}
    />
  );
}

export { Textarea };
export type { TextareaProps };
