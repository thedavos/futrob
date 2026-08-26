import { Button as ButtonPrimitive } from "@base-ui/react/button";
import * as stylex from "@stylexjs/stylex";

import { applyProps } from "#styles/apply";
import { colors } from "#styles/tokens.stylex";
import { media } from "#styles/media.stylex";

const styles = stylex.create({
  base: {
    cursor: "pointer",
    position: "relative",
    display: "inline-flex",
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "var(--corner-lg)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: {
      default: "transparent",
      ":focus-visible": colors.ring,
      ':is([aria-invalid="true"])': colors.danger,
      ':is([aria-invalid="true"]):focus-visible': colors.danger,
    },
    backgroundClip: "padding-box",
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    fontWeight: 600,
    whiteSpace: "nowrap",
    textDecorationLine: "none",
    transitionProperty: "background-color, border-color, color, scale",
    transitionDuration: "var(--duration-normal)",
    transitionTimingFunction: "var(--ease-emphasized)",
    outlineWidth: 0,
    outlineStyle: "none",
    userSelect: "none",
    boxShadow: {
      default: null,
      ":focus-visible": "0 0 0 2px color-mix(in oklab, var(--ring) 25%, transparent)",
      ':is([aria-invalid="true"])': "0 0 0 2px color-mix(in oklab, var(--danger) 15%, transparent)",
      ':is([aria-invalid="true"]):focus-visible':
        "0 0 0 2px color-mix(in oklab, var(--danger) 25%, transparent)",
    },
    pointerEvents: {
      default: null,
      ":disabled": "none",
    },
    opacity: {
      default: 1,
      ":disabled": 0.5,
    },
  },
  defaultVariant: {
    backgroundColor: {
      default: colors.primary,
      ":hover": colors.primaryHover,
      ":active": colors.primaryHover,
    },
    color: colors.primaryForeground,
  },
  outline: {
    borderColor: {
      default: colors.borderStrong,
      ":focus-visible": colors.ring,
    },
    backgroundColor: {
      default: colors.surface,
      ":hover": colors.muted,
      ':is([aria-expanded="true"])': colors.muted,
    },
    color: colors.foreground,
  },
  secondary: {
    backgroundColor: {
      default: colors.secondary,
      ":hover": colors.secondaryHover,
      ":active": colors.secondaryHover,
      ':is([aria-expanded="true"])': colors.secondaryHover,
    },
    color: colors.secondaryForeground,
  },
  ghost: {
    backgroundColor: {
      default: "transparent",
      ":hover": colors.muted,
      ':is([aria-expanded="true"])': colors.muted,
    },
    color: colors.foreground,
  },
  destructive: {
    backgroundColor: {
      default: colors.danger,
      ":hover": colors.destructive,
      ":active": colors.destructive,
    },
    color: colors.dangerForeground,
    borderColor: {
      default: "transparent",
      ":focus-visible": colors.danger,
    },
    boxShadow: {
      default: null,
      ":focus-visible": "0 0 0 2px color-mix(in oklab, var(--danger) 25%, transparent)",
    },
  },
  link: {
    borderColor: "transparent",
    backgroundColor: "transparent",
    color: colors.primary,
    textUnderlineOffset: "4px",
    textDecorationLine: {
      default: "none",
      ":hover": "underline",
    },
  },
  sizeDefault: {
    gap: "0.5rem",
    paddingInline: "1rem",
    paddingRight: {
      default: "1rem",
      ":has([data-icon=inline-end])": "0.75rem",
    },
    paddingLeft: {
      default: "1rem",
      ":has([data-icon=inline-start])": "0.75rem",
    },
  },
  sizeIcon: {
    aspectRatio: "1",
    paddingInline: 0,
  },
  pressable: {
    scale: {
      default: 1,
      ":active": 0.96,
    },
  },
  heightDefault: {
    minHeight: "var(--control-height)",
  },
  heightDefaultIcon: {
    width: "var(--control-height)",
    height: "var(--control-height)",
  },
  heightDense: {
    minHeight: {
      default: "var(--control-height-dense)",
      [media.maxSm]: "var(--control-height-touch)",
    },
  },
  heightDenseIcon: {
    width: {
      default: "var(--control-height-dense)",
      [media.maxSm]: "var(--control-height-touch)",
    },
    height: {
      default: "var(--control-height-dense)",
      [media.maxSm]: "var(--control-height-touch)",
    },
  },
});

const variantStyles = {
  default: styles.defaultVariant,
  outline: styles.outline,
  secondary: styles.secondary,
  ghost: styles.ghost,
  destructive: styles.destructive,
  link: styles.link,
} as const;

export type ButtonVariant = keyof typeof variantStyles;
export type ButtonSize = "default" | "icon";

/** Stops browsers from restoring dynamic `disabled` across reloads (SSR hydration mismatch). */
const disableFormStateRestore = { autoComplete: "off" } as const;

type ButtonProps = ButtonPrimitive.Props & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Compact desktop/operator mode. Touch layouts stay at the accessible 44px target. */
  dense?: boolean;
  /** Turn off press feedback for controls that should remain visually anchored. */
  static?: boolean;
};

function Button({
  className,
  style,
  dense = false,
  nativeButton,
  render,
  variant = "default",
  size = "default",
  static: isStatic = false,
  ...props
}: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      data-density={dense ? "dense" : "default"}
      nativeButton={nativeButton ?? render == null}
      render={render}
      {...applyProps(
        className,
        style,
        styles.base,
        variantStyles[variant],
        size === "icon" ? styles.sizeIcon : styles.sizeDefault,
        isStatic ? null : styles.pressable,
        dense
          ? size === "icon"
            ? styles.heightDenseIcon
            : styles.heightDense
          : size === "icon"
            ? styles.heightDefaultIcon
            : styles.heightDefault,
        stylex.defaultMarker(),
      )}
      {...props}
      {...disableFormStateRestore}
    />
  );
}

export { Button, variantStyles as buttonVariants };
export type { ButtonProps };
