import type { ComponentProps } from "react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import * as stylex from "@stylexjs/stylex";

import { applyProps } from "#styles/apply";
import { colors } from "#styles/tokens.stylex";
import { elevation } from "#styles/elevation";
import { typography } from "#styles/typography";

const styles = stylex.create({
  positioner: {
    zIndex: 50,
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
    scale: {
      default: 1,
      ":is([data-starting-style])": 0.95,
      ":is([data-ending-style])": 0.95,
    },
  },
  label: {
    paddingInline: "0.625rem",
    paddingBlock: "0.5rem",
    color: colors.mutedForeground,
  },
  item: {
    display: "flex",
    minHeight: "2.75rem",
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
    pointerEvents: {
      default: null,
      ":is([data-disabled])": "none",
    },
    opacity: {
      default: 1,
      ":is([data-disabled])": 0.5,
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
}: MenuPrimitive.Popup.Props &
  Pick<MenuPrimitive.Positioner.Props, "align" | "side" | "sideOffset">) {
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

function DropdownMenuLabel({ className, style, ...props }: MenuPrimitive.GroupLabel.Props) {
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
}: MenuPrimitive.Item.Props & { inset?: boolean }) {
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
}: ComponentProps<typeof MenuPrimitive.Separator>) {
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
