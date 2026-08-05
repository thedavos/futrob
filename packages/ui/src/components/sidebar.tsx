import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "#lib/utils";

type SidebarContextValue = {
  readonly openMobile: boolean;
  readonly setOpenMobile: (open: boolean) => void;
  readonly toggleMobile: () => void;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

function useSidebar(): SidebarContextValue {
  const value = React.useContext(SidebarContext);
  if (!value) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return value;
}

function SidebarProvider({ children, className, ...props }: React.ComponentProps<"div">) {
  const [openMobile, setOpenMobile] = React.useState(false);
  const value = React.useMemo(
    () => ({
      openMobile,
      setOpenMobile,
      toggleMobile: () => setOpenMobile((current) => !current),
    }),
    [openMobile],
  );

  return (
    <SidebarContext.Provider value={value}>
      <div
        data-slot="sidebar-provider"
        className={cn("flex min-h-svh w-full bg-background text-foreground", className)}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

function Sidebar({ className, ...props }: React.ComponentProps<"aside">) {
  return (
    <aside
      data-slot="sidebar"
      className={cn(
        "hidden w-64 shrink-0 flex-col border-r border-border bg-surface md:flex",
        className,
      )}
      {...props}
    />
  );
}

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-header"
      className={cn("flex flex-col gap-3 border-b border-border-subtle p-4", className)}
      {...props}
    />
  );
}

function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-content"
      className={cn("flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3", className)}
      {...props}
    />
  );
}

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-footer"
      className={cn("mt-auto border-t border-border-subtle p-3", className)}
      {...props}
    />
  );
}

function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="sidebar-group" className={cn("flex flex-col gap-1", className)} {...props} />
  );
}

function SidebarGroupLabel({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="sidebar-group-label"
      className={cn("px-2.5 py-1.5 typo-label text-muted-foreground", className)}
      {...props}
    />
  );
}

function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul data-slot="sidebar-menu" className={cn("flex flex-col gap-0.5", className)} {...props} />
  );
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li data-slot="sidebar-menu-item" className={cn("min-w-0", className)} {...props} />;
}

const sidebarMenuButtonVariants = cva(
  "flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 text-left text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/25 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      active: {
        true: "bg-muted text-foreground",
        false: "text-foreground hover:bg-muted/70",
      },
      dense: {
        true: "min-h-(--control-height-dense) max-sm:min-h-(--control-height-touch)",
        false: "min-h-(--control-height)",
      },
    },
    defaultVariants: {
      active: false,
      dense: false,
    },
  },
);

function SidebarMenuButton({
  active = false,
  dense = false,
  className,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof sidebarMenuButtonVariants>) {
  return (
    <button
      data-slot="sidebar-menu-button"
      data-active={active ? "true" : undefined}
      data-density={dense ? "dense" : "default"}
      className={cn(sidebarMenuButtonVariants({ active, dense }), className)}
      type="button"
      {...props}
    />
  );
}

function SidebarMenuLink({
  active = false,
  dense = false,
  className,
  ...props
}: React.ComponentProps<"a"> & VariantProps<typeof sidebarMenuButtonVariants>) {
  return (
    <a
      data-slot="sidebar-menu-link"
      data-active={active ? "true" : undefined}
      data-density={dense ? "dense" : "default"}
      className={cn(sidebarMenuButtonVariants({ active, dense }), className)}
      {...props}
    />
  );
}

function SidebarInset({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-inset"
      className={cn("flex min-w-0 flex-1 flex-col", className)}
      {...props}
    />
  );
}

function SidebarRail({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-rail"
      className={cn(
        "flex h-14 items-center gap-2 border-b border-border px-4 md:hidden",
        className,
      )}
      {...props}
    />
  );
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuLink,
  SidebarProvider,
  SidebarRail,
  sidebarMenuButtonVariants,
  useSidebar,
};
