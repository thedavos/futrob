import { Select as SelectPrimitive } from "@base-ui/react/select";
import { CheckIcon, CaretDownIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";

import { applyProps } from "#styles/apply";
import { colors } from "#styles/tokens.stylex";
import { elevation } from "#styles/elevation";
import { media } from "#styles/media.stylex";
import { typography } from "#styles/typography";

const styles = stylex.create({
  trigger: {
    display: "flex",
    width: "100%",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.5rem",
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
    textAlign: "left",
    fontSize: {
      default: "1rem",
      [media.sm]: "0.875rem",
    },
    lineHeight: {
      default: "1.5rem",
      [media.sm]: "1.25rem",
    },
    color: {
      default: colors.foreground,
      ":is([data-placeholder])": colors.mutedForeground,
    },
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
  triggerIcon: {
    width: "1rem",
    height: "1rem",
    color: colors.mutedForeground,
  },
  positioner: {
    zIndex: 50,
    outlineWidth: 0,
    outlineStyle: "none",
  },
  content: {
    minWidth: "var(--anchor-width)",
    transformOrigin: "var(--transform-origin)",
    overflow: "hidden",
    borderRadius: "var(--corner-lg)",
    backgroundColor: colors.popover,
    padding: "0.25rem",
    color: colors.popoverForeground,
    transitionProperty: "opacity, scale",
    transitionDuration: "var(--duration-normal)",
    scale: {
      default: 1,
      ":is([data-starting-style])": 0.95,
      ":is([data-ending-style])": 0.95,
    },
  },
  label: {
    paddingInline: "0.5rem",
    paddingBlock: "0.5rem",
    color: colors.mutedForeground,
  },
  item: {
    position: "relative",
    display: "flex",
    minHeight: "2.5rem",
    cursor: "default",
    alignItems: "center",
    gap: "0.5rem",
    borderRadius: "var(--corner-md)",
    paddingBlock: "0.5rem",
    paddingRight: "2rem",
    paddingLeft: "0.5rem",
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    outlineWidth: 0,
    outlineStyle: "none",
    userSelect: "none",
    backgroundColor: {
      default: null,
      ":is([data-highlighted])": colors.accent,
    },
    color: {
      default: null,
      ":is([data-highlighted])": colors.accentForeground,
    },
    pointerEvents: {
      default: null,
      ":is([data-disabled])": "none",
    },
    opacity: {
      default: 1,
      ":is([data-disabled])": 0.5,
    },
  },
  itemIndicator: {
    position: "absolute",
    right: "0.5rem",
    display: "inline-flex",
    width: "1rem",
    height: "1rem",
    alignItems: "center",
    justifyContent: "center",
  },
  itemIndicatorIcon: {
    width: "1rem",
    height: "1rem",
  },
  separator: {
    marginInline: "-0.25rem",
    marginBlock: "0.25rem",
    height: 1,
    backgroundColor: colors.borderSubtle,
  },
});

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

type SelectTriggerProps = SelectPrimitive.Trigger.Props & {
  /** Compact desktop/operator mode. Touch layouts stay at the accessible 44px target. */
  dense?: boolean;
};

function SelectTrigger({
  children,
  className,
  style,
  dense = false,
  ...props
}: SelectTriggerProps) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-density={dense ? "dense" : "default"}
      {...applyProps(
        className,
        style,
        styles.trigger,
        dense ? styles.heightDense : styles.heightDefault,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon>
        <CaretDownIcon
          aria-hidden="true"
          data-slot="select-trigger-icon"
          {...applyProps(undefined, undefined, styles.triggerIcon)}
        />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  align = "start",
  alignItemWithTrigger = false,
  children,
  className,
  style,
  sideOffset = 6,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<SelectPrimitive.Positioner.Props, "align" | "alignItemWithTrigger" | "sideOffset">) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        align={align}
        alignItemWithTrigger={alignItemWithTrigger}
        {...applyProps(undefined, undefined, styles.positioner)}
        sideOffset={sideOffset}
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          {...applyProps(className, style, styles.content, elevation.md)}
          {...props}
        >
          <SelectPrimitive.List>{children}</SelectPrimitive.List>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({ className, style, ...props }: SelectPrimitive.Label.Props) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      {...applyProps(className, style, typography.label, styles.label)}
      {...props}
    />
  );
}

function SelectItem({ children, className, style, ...props }: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      {...applyProps(className, style, styles.item)}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator {...applyProps(undefined, undefined, styles.itemIndicator)}>
        <CheckIcon
          aria-hidden="true"
          {...applyProps(undefined, undefined, styles.itemIndicatorIcon)}
        />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({ className, style, ...props }: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      {...applyProps(className, style, styles.separator)}
      {...props}
    />
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
export type { SelectTriggerProps };
