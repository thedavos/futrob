import type { ComponentProps } from "react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import * as stylex from "@stylexjs/stylex";

import { applyProps, type HostClassName } from "#styles/apply";
import { colors, z } from "#styles/tokens.stylex";
import { elevation } from "#styles/elevation";
import { media } from "#styles/media.stylex";
import { typography } from "#styles/typography";

const styles = stylex.create({
  positioner: {
    zIndex: z.popover,
    outlineWidth: 0,
    outlineStyle: "none",
  },
  content: {
    maxHeight: "min(24rem, var(--available-height))",
    minWidth: "14rem",
    transformOrigin: "var(--transform-origin)",
    overflowY: "auto",
    borderRadius: "var(--corner-lg)",
    backgroundColor: colors.popover,
    padding: "0.375rem",
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    color: colors.popoverForeground,
    outlineWidth: 0,
    outlineStyle: "none",
    transitionProperty: "opacity, scale",
    transitionDuration: "var(--duration-normal)",
    transitionTimingFunction: "var(--ease-emphasized)",
    // A 0.95 entrance scale turns a 44px row into a 41.8px hit target. Touch
    // keeps scale at 1 so the open menu stays on the control-height contract.
    scale: {
      default: 1,
      ":is([data-starting-style])": 0.95,
      ":is([data-ending-style])": 0.95,
      [media.maxSm]: {
        default: 1,
        ":is([data-starting-style])": 1,
        ":is([data-ending-style])": 1,
      },
    },
  },
  label: {
    paddingInline: "0.625rem",
    paddingBlock: "0.5rem",
    color: colors.mutedForeground,
  },
  item: {
    display: "flex",
    minHeight: "var(--control-height)",
    cursor: "pointer",
    alignItems: "center",
    gap: "0.5rem",
    borderRadius: "var(--corner-md)",
    paddingInline: "0.625rem",
    paddingBlock: "0.5rem",
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    outlineWidth: 0,
    outlineStyle: "none",
    userSelect: "none",
    backgroundColor: {
      default: null,
      ":is([data-highlighted])": colors.muted,
    },
    color: {
      default: null,
      ":is([data-disabled])": colors.textDisabled,
    },
    pointerEvents: {
      default: null,
      ":is([data-disabled])": "none",
    },
  },
  itemInset: {
    paddingLeft: "2rem",
  },
  separator: {
    marginBlock: "0.375rem",
    height: 1,
    backgroundColor: colors.border,
  },
});

const DropdownMenu = MenuPrimitive.Root;
const DropdownMenuTrigger = MenuPrimitive.Trigger;
const DropdownMenuPortal = MenuPrimitive.Portal;
const DropdownMenuGroup = MenuPrimitive.Group;

function DropdownMenuContent({
  align = "start",
  className,
  style,
  side = "bottom",
  sideOffset = 8,
  ...props
}: Omit<MenuPrimitive.Popup.Props, "className"> &
  Pick<MenuPrimitive.Positioner.Props, "align" | "side" | "sideOffset"> & {
    className?: HostClassName | MenuPrimitive.Popup.Props["className"];
  }) {
  return (
    <DropdownMenuPortal>
      <MenuPrimitive.Positioner
        align={align}
        {...applyProps(undefined, undefined, styles.positioner)}
        side={side}
        sideOffset={sideOffset}
      >
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-content"
          {...applyProps(className, style, styles.content, elevation.md)}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </DropdownMenuPortal>
  );
}

function DropdownMenuLabel({
  className,
  style,
  ...props
}: Omit<MenuPrimitive.GroupLabel.Props, "className"> & {
  className?: HostClassName | MenuPrimitive.GroupLabel.Props["className"];
}) {
  return (
    <MenuPrimitive.GroupLabel
      data-slot="dropdown-menu-label"
      {...applyProps(className, style, typography.label, styles.label)}
      {...props}
    />
  );
}

function DropdownMenuItem({
  className,
  style,
  inset,
  ...props
}: Omit<MenuPrimitive.Item.Props, "className"> & {
  className?: HostClassName | MenuPrimitive.Item.Props["className"];
  inset?: boolean;
}) {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      {...applyProps(className, style, styles.item, inset && styles.itemInset)}
      {...props}
    />
  );
}

function DropdownMenuSeparator({
  className,
  style,
  ...props
}: Omit<ComponentProps<typeof MenuPrimitive.Separator>, "className"> & {
  className?: HostClassName | ComponentProps<typeof MenuPrimitive.Separator>["className"];
}) {
  return (
    <MenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      {...applyProps(className, style, styles.separator)}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
};
