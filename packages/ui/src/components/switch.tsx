import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import * as stylex from "@stylexjs/stylex";

import { applyHost } from "#styles/apply";
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
    },
    backgroundColor: {
      default: colors.input,
      ":is([data-checked])": colors.primary,
      ":is([data-unchecked])": colors.input,
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
    },
    opacity: {
      default: 1,
      ":disabled": 0.5,
    },
    "::after": {
      content: '""',
      position: "absolute",
      top: "-0.5rem",
      bottom: "-0.5rem",
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

function Switch({ className, style, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      {...applyHost(className, style, styles.root)}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        {...applyHost(undefined, undefined, styles.thumb)}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
