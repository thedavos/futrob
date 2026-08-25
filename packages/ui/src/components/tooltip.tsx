import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import * as stylex from "@stylexjs/stylex";

import { applyHost } from "#styles/apply";
import { colors } from "#styles/tokens.stylex";

const styles = stylex.create({
  positioner: {
    zIndex: 50,
    outlineWidth: 0,
    outlineStyle: "none",
  },
  content: {
    maxWidth: "16rem",
    transformOrigin: "var(--transform-origin)",
    borderRadius: "var(--corner-md)",
    backgroundColor: colors.foreground,
    paddingInline: "0.625rem",
    paddingBlock: "0.375rem",
    fontSize: "0.75rem",
    lineHeight: "1rem",
    fontWeight: 500,
    color: colors.background,
    boxShadow:
      "0 18px 47px 0 color-mix(in srgb, var(--smooth-shadow-color) 3%, transparent), 0 7.5px 19px 0 color-mix(in srgb, var(--smooth-shadow-color) 2%, transparent), 0 4px 10.5px 0 color-mix(in srgb, var(--smooth-shadow-color) 2%, transparent), 0 2.3px 5.8px 0 color-mix(in srgb, var(--smooth-shadow-color) 1%, transparent), 0 1.2px 3.1px 0 color-mix(in srgb, var(--smooth-shadow-color) 1%, transparent), 0 0.5px 1.3px 0 color-mix(in srgb, var(--smooth-shadow-color) 1%, transparent)",
    transitionProperty: "opacity, scale",
    transitionDuration: "var(--duration-fast)",
    scale: {
      default: 1,
      ":is([data-starting-style])": 0.95,
      ":is([data-ending-style])": 0.95,
    },
  },
});

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

function TooltipContent({
  align = "center",
  className,
  style,
  side = "top",
  sideOffset = 6,
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<TooltipPrimitive.Positioner.Props, "align" | "side" | "sideOffset">) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        align={align}
        {...applyHost(undefined, undefined, styles.positioner)}
        side={side}
        sideOffset={sideOffset}
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          {...applyHost(className, style, styles.content)}
          {...props}
        />
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
