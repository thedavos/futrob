import * as React from "react";
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cva } from "class-variance-authority";

import { cn } from "#lib/utils";

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

const tabsListVariants = cva(
  "relative flex min-h-(--control-height) overflow-x-auto text-muted-foreground",
  {
    variants: {
      variant: {
        line: "items-end gap-5 border-b border-border",
        pills: "items-center gap-1 rounded-lg bg-muted p-1",
      },
    },
    defaultVariants: {
      variant: "line",
    },
  },
);

const tabsTriggerVariants = cva(
  "typo-label inline-flex min-h-(--control-height) shrink-0 items-center justify-center gap-2 text-muted-foreground transition-colors duration-(--duration-normal) outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/25 disabled:pointer-events-none disabled:opacity-50 data-active:text-foreground",
  {
    variants: {
      variant: {
        line: "border-b-2 border-transparent px-0 focus-visible:rounded-sm",
        pills: "rounded-md px-3 focus-visible:rounded-md data-active:bg-surface",
      },
    },
    defaultVariants: {
      variant: "line",
    },
  },
);

function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  const variant = useTabsVariant();

  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  const variant = useTabsVariant();

  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(tabsTriggerVariants({ variant }), className)}
      {...props}
    />
  );
}

function TabsIndicator({ className, ...props }: TabsPrimitive.Indicator.Props) {
  const variant = useTabsVariant();

  switch (variant) {
    case "pills":
      return null;
    case "line":
      return (
        <TabsPrimitive.Indicator
          data-slot="tabs-indicator"
          className={cn(
            "absolute bottom-[-1px] left-0 h-0.5 w-(--active-tab-width) translate-x-(--active-tab-left) rounded-full bg-primary transition-[translate,width] duration-(--duration-slow) ease-(--ease-emphasized)",
            className,
          )}
          {...props}
        />
      );
    default: {
      const _exhaustive: never = variant;
      return _exhaustive;
    }
  }
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("py-5 outline-none focus-visible:ring-2 focus-visible:ring-ring/25", className)}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsIndicator, TabsList, TabsTrigger };
export type { TabsProps, TabsVariant };
