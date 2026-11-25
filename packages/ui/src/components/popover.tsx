import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import * as stylex from "@stylexjs/stylex";

import { applyProps, type HostClassName } from "#styles/apply";
import { colors, z } from "#styles/tokens.stylex";
import { elevation } from "#styles/elevation";

const styles = stylex.create({
  positioner: {
    zIndex: z.popover,
    outlineWidth: 0,
    outlineStyle: "none",
  },
  content: {
    width: "18rem",
    transformOrigin: "var(--transform-origin)",
    borderRadius: "var(--corner-lg)",
    backgroundColor: colors.popover,
    padding: "1rem",
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    color: colors.popoverForeground,
    transitionProperty: "opacity, scale",
    transitionDuration: "var(--duration-normal)",
    transitionTimingFunction: "var(--ease-emphasized)",
    outlineWidth: 0,
    outlineStyle: "none",
    scale: {
      default: 1,
      ":is([data-starting-style])": 0.95,
      ":is([data-ending-style])": 0.95,
    },
  },
  title: {
    fontWeight: 600,
    lineHeight: 1.375,
    color: colors.foreground,
  },
  description: {
    marginTop: "0.25rem",
    fontSize: "0.875rem",
    lineHeight: 1.625,
    color: colors.mutedForeground,
  },
});

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverClose = PopoverPrimitive.Close;

function PopoverContent({
  align = "center",
  children,
  className,
  style,
  side = "bottom",
  sideOffset = 8,
  ...props
}: Omit<PopoverPrimitive.Popup.Props, "className"> &
  Pick<PopoverPrimitive.Positioner.Props, "align" | "side" | "sideOffset"> & {
    className?: HostClassName | PopoverPrimitive.Popup.Props["className"];
  }) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        align={align}
        {...applyProps(undefined, undefined, styles.positioner)}
        side={side}
        sideOffset={sideOffset}
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          {...applyProps(className, style, styles.content, elevation.md)}
          {...props}
        >
          {children}
        </PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

function PopoverTitle({
  className,
  style,
  ...props
}: Omit<PopoverPrimitive.Title.Props, "className"> & {
  className?: HostClassName | PopoverPrimitive.Title.Props["className"];
}) {
  return (
    <PopoverPrimitive.Title
      data-slot="popover-title"
      {...applyProps(className, style, styles.title)}
      {...props}
    />
  );
}

function PopoverDescription({
  className,
  style,
  ...props
}: Omit<PopoverPrimitive.Description.Props, "className"> & {
  className?: HostClassName | PopoverPrimitive.Description.Props["className"];
}) {
  return (
    <PopoverPrimitive.Description
      data-slot="popover-description"
      {...applyProps(className, style, styles.description)}
      {...props}
    />
  );
}

export { Popover, PopoverClose, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger };
