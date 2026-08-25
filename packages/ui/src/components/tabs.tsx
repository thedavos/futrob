import * as React from "react";
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import * as stylex from "@stylexjs/stylex";

import { applyProps } from "#styles/apply";
import { colors } from "#styles/tokens.stylex";
import { typography } from "#styles/typography";

type TabsVariant = "line" | "pills";

const TabsVariantContext = React.createContext<TabsVariant>("line");

function useTabsVariant(): TabsVariant {
  return React.useContext(TabsVariantContext);
}

type TabsProps = TabsPrimitive.Root.Props & {
  readonly variant?: TabsVariant;
};

function Tabs({ variant = "line", ...props }: TabsProps) {
  const resolvedVariant = variant ?? "line";

  return (
    <TabsVariantContext.Provider value={resolvedVariant}>
      <TabsPrimitive.Root data-slot="tabs" data-variant={resolvedVariant} {...props} />
    </TabsVariantContext.Provider>
  );
}

const styles = stylex.create({
  list: {
    position: "relative",
    display: "flex",
    minHeight: "var(--control-height)",
    overflowX: "auto",
    color: colors.mutedForeground,
  },
  listLine: {
    alignItems: "flex-end",
    gap: "1.25rem",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.border,
  },
  listPills: {
    alignItems: "center",
    gap: "0.25rem",
    borderRadius: "var(--corner-lg)",
    backgroundColor: colors.muted,
    padding: "0.25rem",
  },
  trigger: {
    display: "inline-flex",
    minHeight: "var(--control-height)",
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    color: {
      default: colors.mutedForeground,
      ":hover": colors.foreground,
      ":is([data-active])": colors.foreground,
    },
    transitionProperty: "color, background-color",
    transitionDuration: "var(--duration-normal)",
    outlineWidth: 0,
    outlineStyle: "none",
    boxShadow: {
      default: null,
      ":focus-visible": "0 0 0 2px color-mix(in oklab, var(--ring) 25%, transparent)",
    },
    pointerEvents: {
      default: null,
      ":disabled": "none",
    },
    opacity: {
      default: 1,
      ":disabled": 0.5,
    },
  },
  triggerLine: {
    borderBottomWidth: 2,
    borderBottomStyle: "solid",
    borderBottomColor: "transparent",
    paddingInline: 0,
    borderRadius: {
      default: null,
      ":focus-visible": "var(--corner-sm)",
    },
  },
  triggerPills: {
    borderRadius: {
      default: "var(--corner-md)",
      ":focus-visible": "var(--corner-md)",
    },
    paddingInline: "0.75rem",
    backgroundColor: {
      default: null,
      ":is([data-active])": colors.surface,
    },
  },
  indicator: {
    position: "absolute",
    bottom: -1,
    left: 0,
    height: "0.125rem",
    width: "var(--active-tab-width)",
    translate: "var(--active-tab-left) 0",
    borderRadius: "var(--corner-full)",
    backgroundColor: colors.primary,
    transitionProperty: "translate, width",
    transitionDuration: "var(--duration-slow)",
    transitionTimingFunction: "var(--ease-emphasized)",
  },
  content: {
    paddingBlock: "1.25rem",
    outlineWidth: 0,
    outlineStyle: "none",
    boxShadow: {
      default: null,
      ":focus-visible": "0 0 0 2px color-mix(in oklab, var(--ring) 25%, transparent)",
    },
  },
});

const listVariantStyles = {
  line: styles.listLine,
  pills: styles.listPills,
} as const;

const triggerVariantStyles = {
  line: styles.triggerLine,
  pills: styles.triggerPills,
} as const;

function TabsList({ className, style, ...props }: TabsPrimitive.List.Props) {
  const variant = useTabsVariant();

  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      {...applyProps(className, style, styles.list, listVariantStyles[variant])}
      {...props}
    />
  );
}

function TabsTrigger({ className, style, ...props }: TabsPrimitive.Tab.Props) {
  const variant = useTabsVariant();

  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      {...applyProps(
        className,
        style,
        typography.label,
        styles.trigger,
        triggerVariantStyles[variant],
      )}
      {...props}
    />
  );
}

function TabsIndicator({ className, style, ...props }: TabsPrimitive.Indicator.Props) {
  const variant = useTabsVariant();

  switch (variant) {
    case "pills":
      return null;
    case "line":
      return (
        <TabsPrimitive.Indicator
          data-slot="tabs-indicator"
          {...applyProps(className, style, styles.indicator)}
          {...props}
        />
      );
    default: {
      const _exhaustive: never = variant;
      return _exhaustive;
    }
  }
}

function TabsContent({ className, style, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      {...applyProps(className, style, styles.content)}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsIndicator, TabsList, TabsTrigger };
export type { TabsProps, TabsVariant };
