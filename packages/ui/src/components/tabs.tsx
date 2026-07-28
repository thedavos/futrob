import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";

import { cn } from "#lib/utils";

const Tabs = TabsPrimitive.Root;

function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "relative flex min-h-(--control-height) items-end gap-5 overflow-x-auto border-b border-border text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "typo-label inline-flex min-h-(--control-height) shrink-0 items-center justify-center gap-2 border-b-2 border-transparent px-0 text-muted-foreground transition-colors duration-(--duration-normal) outline-none hover:text-foreground focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/35 disabled:pointer-events-none disabled:opacity-50 data-active:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function TabsIndicator({ className, ...props }: TabsPrimitive.Indicator.Props) {
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
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("py-5 outline-none focus-visible:ring-3 focus-visible:ring-ring/35", className)}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsIndicator, TabsList, TabsTrigger };
