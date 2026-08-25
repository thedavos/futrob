import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { CheckIcon, MinusIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";

import { applyHost } from "#styles/apply";
import { colors } from "#styles/tokens.stylex";

const styles = stylex.create({
  root: {
    display: "flex",
    width: "1.25rem",
    height: "1.25rem",
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "var(--corner-sm)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: {
      default: colors.input,
      ":focus-visible": colors.ring,
      ":is([data-checked])": colors.primary,
      ":is([data-indeterminate])": colors.primary,
      ':is([aria-invalid="true"])': colors.danger,
      ':is([aria-invalid="true"]):focus-visible': colors.danger,
    },
    backgroundColor: {
      default: colors.surface,
      ":is([data-checked])": colors.primary,
      ":is([data-indeterminate])": colors.primary,
    },
    color: colors.primaryForeground,
    transitionProperty: "background-color, border-color, box-shadow",
    transitionDuration: "var(--duration-normal)",
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
      ":disabled": 0.5,
    },
  },
  indicator: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  checkIcon: {
    width: "0.875rem",
    height: "0.875rem",
    display: {
      default: "block",
      [stylex.when.ancestor("[data-indeterminate]")]: "none",
    },
  },
  minusIcon: {
    width: "0.875rem",
    height: "0.875rem",
    display: {
      default: "none",
      [stylex.when.ancestor("[data-indeterminate]")]: "block",
    },
  },
});

function Checkbox({ className, style, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      {...applyHost(className, style, styles.root)}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        {...applyHost(undefined, undefined, styles.indicator, stylex.defaultMarker())}
      >
        <CheckIcon
          aria-hidden="true"
          {...applyHost(undefined, undefined, styles.checkIcon)}
          strokeWidth={2.5}
        />
        <MinusIcon
          aria-hidden="true"
          {...applyHost(undefined, undefined, styles.minusIcon)}
          strokeWidth={2.5}
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
