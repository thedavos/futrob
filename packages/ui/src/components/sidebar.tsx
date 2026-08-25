import * as React from "react";
import * as stylex from "@stylexjs/stylex";

import { applyHost } from "#styles/apply";
import { colors } from "#styles/tokens.stylex";
import { media } from "#styles/media.stylex";
import { typography } from "#styles/typography";

type SidebarContextValue = {
  readonly openMobile: boolean;
  readonly setOpenMobile: (open: boolean) => void;
  readonly toggleMobile: () => void;
  readonly collapsed: boolean;
  readonly setCollapsed: (collapsed: boolean) => void;
  readonly toggleCollapsed: () => void;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

function useSidebar(): SidebarContextValue {
  const value = React.useContext(SidebarContext);
  if (!value) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return value;
}

type SidebarProviderProps = React.ComponentProps<"div"> & {
  readonly collapsed?: boolean;
  readonly defaultCollapsed?: boolean;
  readonly onCollapsedChange?: (collapsed: boolean) => void;
};

const styles = stylex.create({
  provider: {
    display: "flex",
    height: "100svh",
    width: "100%",
    overflow: "hidden",
    backgroundColor: colors.background,
    color: colors.foreground,
  },
  sidebar: {
    display: {
      default: "none",
      [media.md]: "flex",
    },
    height: "100%",
    minHeight: 0,
    flexShrink: 0,
    flexDirection: "column",
    borderRightWidth: 1,
    borderRightStyle: "solid",
    borderRightColor: colors.border,
    backgroundColor: colors.surface,
  },
  sidebarExpanded: {
    width: "16rem",
  },
  sidebarCollapsed: {
    width: "3.5rem",
  },
  header: {
    display: "flex",
    flexShrink: 0,
    flexDirection: "column",
    gap: "0.75rem",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.borderSubtle,
    padding: "0.75rem",
  },
  content: {
    display: "flex",
    minHeight: 0,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "0%",
    flexDirection: "column",
    gap: "1rem",
    overflowY: "auto",
    padding: "0.75rem",
  },
  footer: {
    marginTop: "auto",
    flexShrink: 0,
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.borderSubtle,
    padding: "0.75rem",
  },
  group: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  groupLabel: {
    paddingInline: "0.625rem",
    paddingBlock: "0.375rem",
    color: colors.mutedForeground,
  },
  menu: {
    display: "flex",
    flexDirection: "column",
    gap: "0.125rem",
  },
  menuItem: {
    minWidth: 0,
  },
  menuButton: {
    display: "flex",
    width: "100%",
    cursor: "pointer",
    alignItems: "center",
    gap: "0.5rem",
    borderRadius: "var(--corner-lg)",
    paddingInline: "0.625rem",
    textAlign: "left",
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    fontWeight: 500,
    outlineWidth: 0,
    outlineStyle: "none",
    transitionProperty: "color, background-color",
    transitionDuration: "var(--duration-normal)",
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
  menuButtonActive: {
    backgroundColor: colors.muted,
    color: colors.foreground,
  },
  menuButtonInactive: {
    color: colors.foreground,
    backgroundColor: {
      default: "transparent",
      ":hover": "color-mix(in oklab, var(--muted) 70%, transparent)",
    },
  },
  menuButtonDense: {
    minHeight: {
      default: "var(--control-height-dense)",
      [media.maxSm]: "var(--control-height-touch)",
    },
  },
  menuButtonDefault: {
    minHeight: "var(--control-height)",
  },
  menuButtonCompact: {
    justifyContent: "center",
    paddingInline: 0,
  },
  inset: {
    display: "flex",
    minHeight: 0,
    minWidth: 0,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "0%",
    flexDirection: "column",
    overflow: "hidden",
  },
  rail: {
    display: {
      default: "flex",
      [media.md]: "none",
    },
    height: "3.5rem",
    flexShrink: 0,
    alignItems: "center",
    gap: "0.5rem",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.border,
    paddingInline: "1.5rem",
  },
});

export const sidebarMenuButtonStyles = {
  base: styles.menuButton,
  active: styles.menuButtonActive,
  inactive: styles.menuButtonInactive,
  dense: styles.menuButtonDense,
  defaultDensity: styles.menuButtonDefault,
  compact: styles.menuButtonCompact,
} as const;

/** StyleX map for menu-button variants. Prefer `sidebarMenuButtonStyles` + `applyHost`. */
export const sidebarMenuButtonVariants = {
  active: styles.menuButtonActive,
  dense: styles.menuButtonDense,
} as const;

function SidebarProvider({
  children,
  className,
  style,
  collapsed: collapsedProp,
  defaultCollapsed = false,
  onCollapsedChange,
  ...props
}: SidebarProviderProps) {
  const [openMobile, setOpenMobile] = React.useState(false);
  const [collapsedUncontrolled, setCollapsedUncontrolled] = React.useState(defaultCollapsed);
  const collapsed = collapsedProp ?? collapsedUncontrolled;

  const setCollapsed = React.useCallback(
    (next: boolean) => {
      if (collapsedProp === undefined) {
        setCollapsedUncontrolled(next);
      }
      onCollapsedChange?.(next);
    },
    [collapsedProp, onCollapsedChange],
  );

  const value = React.useMemo(
    () => ({
      openMobile,
      setOpenMobile,
      toggleMobile: () => setOpenMobile((current) => !current),
      collapsed,
      setCollapsed,
      toggleCollapsed: () => setCollapsed(!collapsed),
    }),
    [openMobile, collapsed, setCollapsed],
  );

  return (
    <SidebarContext.Provider value={value}>
      <div
        data-slot="sidebar-provider"
        data-collapsed={collapsed ? "true" : undefined}
        {...applyHost(className, style, styles.provider)}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

function Sidebar({ className, style, ...props }: React.ComponentProps<"aside">) {
  const { collapsed } = useSidebar();

  return (
    <aside
      data-slot="sidebar"
      data-collapsed={collapsed ? "true" : undefined}
      {...applyHost(
        className,
        style,
        styles.sidebar,
        collapsed ? styles.sidebarCollapsed : styles.sidebarExpanded,
      )}
      {...props}
    />
  );
}

function SidebarHeader({ className, style, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="sidebar-header" {...applyHost(className, style, styles.header)} {...props} />
  );
}

function SidebarContent({ className, style, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="sidebar-content" {...applyHost(className, style, styles.content)} {...props} />
  );
}

function SidebarFooter({ className, style, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="sidebar-footer" {...applyHost(className, style, styles.footer)} {...props} />
  );
}

function SidebarGroup({ className, style, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="sidebar-group" {...applyHost(className, style, styles.group)} {...props} />
  );
}

function SidebarGroupLabel({ className, style, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="sidebar-group-label"
      {...applyHost(className, style, typography.label, styles.groupLabel)}
      {...props}
    />
  );
}

function SidebarMenu({ className, style, ...props }: React.ComponentProps<"ul">) {
  return <ul data-slot="sidebar-menu" {...applyHost(className, style, styles.menu)} {...props} />;
}

function SidebarMenuItem({ className, style, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="sidebar-menu-item"
      {...applyHost(className, style, styles.menuItem)}
      {...props}
    />
  );
}

type SidebarMenuButtonProps = React.ComponentProps<"button"> & {
  active?: boolean;
  dense?: boolean;
};

function SidebarMenuButton({
  active = false,
  dense = false,
  className,
  style,
  ...props
}: SidebarMenuButtonProps) {
  return (
    <button
      data-slot="sidebar-menu-button"
      data-active={active ? "true" : undefined}
      data-density={dense ? "dense" : "default"}
      type="button"
      {...applyHost(
        className,
        style,
        styles.menuButton,
        active ? styles.menuButtonActive : styles.menuButtonInactive,
        dense ? styles.menuButtonDense : styles.menuButtonDefault,
      )}
      {...props}
    />
  );
}

type SidebarMenuLinkProps = React.ComponentProps<"a"> & {
  active?: boolean;
  dense?: boolean;
};

function SidebarMenuLink({
  active = false,
  dense = false,
  className,
  style,
  ...props
}: SidebarMenuLinkProps) {
  return (
    <a
      data-slot="sidebar-menu-link"
      data-active={active ? "true" : undefined}
      data-density={dense ? "dense" : "default"}
      {...applyHost(
        className,
        style,
        styles.menuButton,
        active ? styles.menuButtonActive : styles.menuButtonInactive,
        dense ? styles.menuButtonDense : styles.menuButtonDefault,
      )}
      {...props}
    />
  );
}

function SidebarInset({ className, style, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="sidebar-inset" {...applyHost(className, style, styles.inset)} {...props} />
  );
}

function SidebarRail({ className, style, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-rail" {...applyHost(className, style, styles.rail)} {...props} />;
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
  useSidebar,
};
