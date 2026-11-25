import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import * as stylex from "@stylexjs/stylex";

import { applyProps, type HostClassName } from "#styles/apply";
import { colors } from "#styles/tokens.stylex";

const styles = stylex.create({
  root: {
    position: "relative",
    display: "inline-flex",
    height: "1.5rem",
    width: "2.75rem",
    flexShrink: 0,
    alignItems: "center",
    borderRadius: "var(--corner-full)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: {
      default: "transparent",
      ":focus-visible": colors.ring,
      ':is([aria-invalid="true"])': colors.danger,
      ':is([aria-invalid="true"]):focus-visible': colors.danger,
      ":disabled": colors.border,
      ":is([data-disabled])": colors.border,
      ":is([data-checked][data-disabled])": colors.border,
    },
    backgroundColor: {
      default: colors.input,
      ":is([data-checked])": colors.primary,
      ":is([data-unchecked])": colors.input,
      ":disabled": colors.muted,
      ":is([data-disabled])": colors.muted,
      ":is([data-checked][data-disabled])": colors.muted,
      ":is([data-unchecked][data-disabled])": colors.muted,
    },
    padding: "0.125rem",
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
      ":is([data-disabled])": "not-allowed",
    },
    "::after": {
      content: '""',
      position: "absolute",
      top: "-0.625rem",
      bottom: "-0.625rem",
      left: "-0.375rem",
      right: "-0.375rem",
    },
  },
  thumb: {
    pointerEvents: "none",
    display: "block",
    width: "1.25rem",
    height: "1.25rem",
    borderRadius: "var(--corner-full)",
    backgroundColor: {
      default: colors.surface,
      ":is([data-checked])": colors.primaryForeground,
      ":is([data-disabled])": colors.textDisabled,
      ":is([data-checked][data-disabled])": colors.textDisabled,
    },
    transitionProperty: "translate",
    transitionDuration: "var(--duration-normal)",
    transitionTimingFunction: "var(--ease-emphasized)",
    translate: {
      default: "0 0",
      ":is([data-checked])": "1.25rem 0",
      ":is([data-unchecked])": "0 0",
    },
  },
});

type SwitchProps = Omit<SwitchPrimitive.Root.Props, "className"> & {
  className?: HostClassName | SwitchPrimitive.Root.Props["className"];
};

function Switch({ className, style, ...props }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      {...applyProps(className, style, styles.root)}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        {...applyProps(undefined, undefined, styles.thumb)}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
