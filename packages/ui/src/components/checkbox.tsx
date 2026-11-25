import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { CheckIcon, MinusIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";

import { applyProps, type HostClassName } from "#styles/apply";
import { colors } from "#styles/tokens.stylex";

const styles = stylex.create({
  root: {
    position: "relative",
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
      ":disabled": colors.border,
      ":is([data-disabled])": colors.border,
      ":is([data-checked][data-disabled])": colors.border,
      ":is([data-indeterminate][data-disabled])": colors.border,
    },
    backgroundColor: {
      default: colors.surface,
      ":is([data-checked])": colors.primary,
      ":is([data-indeterminate])": colors.primary,
      ":disabled": colors.muted,
      ":is([data-disabled])": colors.muted,
      ":is([data-checked][data-disabled])": colors.muted,
      ":is([data-indeterminate][data-disabled])": colors.muted,
    },
    color: {
      default: colors.primaryForeground,
      ":disabled": colors.textDisabled,
      ":is([data-disabled])": colors.textDisabled,
      ":is([data-checked][data-disabled])": colors.textDisabled,
      ":is([data-indeterminate][data-disabled])": colors.textDisabled,
    },
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
      ":is([data-disabled])": "not-allowed",
    },
    // Expand the visual 20px box to a 44px touch target without affecting surrounding layout.
    "::after": {
      content: '""',
      position: "absolute",
      inset: "-0.75rem",
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

type CheckboxProps = Omit<CheckboxPrimitive.Root.Props, "className"> & {
  className?: HostClassName | CheckboxPrimitive.Root.Props["className"];
};

function Checkbox({ className, style, ...props }: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      {...applyProps(className, style, styles.root)}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        {...applyProps(undefined, undefined, styles.indicator, stylex.defaultMarker())}
      >
        <CheckIcon
          aria-hidden="true"
          weight="bold"
          {...applyProps(undefined, undefined, styles.checkIcon)}
        />
        <MinusIcon
          aria-hidden="true"
          weight="bold"
          {...applyProps(undefined, undefined, styles.minusIcon)}
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
