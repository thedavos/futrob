import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible";
import * as stylex from "@stylexjs/stylex";

import { applyHost } from "#styles/apply";
import { colors } from "#styles/tokens.stylex";

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
  },
  trigger: {
    display: "flex",
    minHeight: "var(--control-height)",
    width: "100%",
    cursor: "pointer",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.5rem",
    borderRadius: "var(--corner-lg)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: {
      default: colors.border,
      ":focus-visible": colors.ring,
    },
    backgroundColor: {
      default: colors.surface,
      ":hover": colors.muted,
    },
    paddingInline: "0.75rem",
    textAlign: "left",
    outlineWidth: 0,
    outlineStyle: "none",
    transitionProperty: "background-color, border-color",
    transitionDuration: "var(--duration-normal)",
    transitionTimingFunction: "var(--ease-emphasized)",
    boxShadow: {
      default: null,
      ":focus-visible": "0 0 0 2px color-mix(in oklab, var(--ring) 25%, transparent)",
    },
    pointerEvents: {
      default: null,
      ":disabled": "none",
      ":is([data-disabled])": "none",
    },
    opacity: {
      default: 1,
      ":disabled": 0.5,
      ":is([data-disabled])": 0.5,
    },
  },
  content: {
    height: {
      default: "var(--collapsible-panel-height)",
      ":is([data-starting-style])": 0,
      ":is([data-ending-style])": 0,
    },
    overflow: "hidden",
    transitionProperty: "height",
    transitionDuration: "var(--duration-normal)",
    transitionTimingFunction: "var(--ease-emphasized)",
    display: {
      default: null,
      "[hidden]:not([hidden='until-found'])": "none",
    },
  },
});

function Collapsible({ className, style, ...props }: CollapsiblePrimitive.Root.Props) {
  return (
    <CollapsiblePrimitive.Root
      data-slot="collapsible"
      {...applyHost(className, style, styles.root)}
      {...props}
    />
  );
}

function CollapsibleTrigger({ className, style, ...props }: CollapsiblePrimitive.Trigger.Props) {
  return (
    <CollapsiblePrimitive.Trigger
      data-slot="collapsible-trigger"
      {...applyHost(className, style, styles.trigger, stylex.defaultMarker())}
      {...props}
    />
  );
}

function CollapsibleContent({ className, style, ...props }: CollapsiblePrimitive.Panel.Props) {
  return (
    <CollapsiblePrimitive.Panel
      data-slot="collapsible-content"
      {...applyHost(className, style, styles.content)}
      {...props}
    />
  );
}

export { Collapsible, CollapsibleContent, CollapsibleTrigger };
