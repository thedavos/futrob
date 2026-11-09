import { createLink } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import {
  applyStyles,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuLink,
  Skeleton,
  useSidebar,
} from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { SHELL_NAV_ICONS } from "@/shared/presentation/shell/nav-icons.ts";
import {
  resolveActiveNavHref,
  type ShellNavItem,
} from "@/shared/presentation/shell/nav-registry.ts";

const SidebarNavLink = createLink(SidebarMenuLink);

const styles = stylex.create({
  navIcon: {
    width: "1rem",
    height: "1rem",
    flexShrink: 0,
  },
  navLabel: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  navCompact: {
    justifyContent: "center",
    paddingInline: 0,
  },
  navSkeletonRow: {
    display: "flex",
    minHeight: {
      default: "var(--control-height-dense)",
      [media.maxSm]: "var(--control-height-touch)",
    },
    alignItems: "center",
    gap: "0.5rem",
    paddingInline: "0.625rem",
  },
  navSkeletonRowCompact: {
    justifyContent: "center",
    paddingInline: 0,
  },
  navSkeletonIcon: {
    width: "1rem",
    height: "1rem",
    flexShrink: 0,
  },
  navSkeletonLabel: {
    width: "60%",
    height: "0.75rem",
  },
});

const NAV_SKELETON_ROWS = 4;

export function NavItemListSkeleton({ compact }: { readonly compact: boolean }) {
  const { t } = useI18n();

  return (
    <SidebarMenu aria-busy="true" aria-label={t("shell.nav.loading")}>
      {Array.from({ length: NAV_SKELETON_ROWS }, (_, index) => (
        <SidebarMenuItem key={index}>
          <div {...applyStyles(styles.navSkeletonRow, compact && styles.navSkeletonRowCompact)}>
            <Skeleton {...applyStyles(styles.navSkeletonIcon)} />
            {compact ? null : <Skeleton {...applyStyles(styles.navSkeletonLabel)} />}
          </div>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

export function NavItemList({
  items,
  pathname,
  compact = false,
}: {
  readonly items: readonly ShellNavItem[];
  readonly pathname: string;
  readonly compact?: boolean;
}) {
  const { setOpenMobile } = useSidebar();
  const activeHref = resolveActiveNavHref(pathname, items);
  const icon = applyStyles(styles.navIcon);
  const compactButton = applyStyles(styles.navCompact);

  return (
    <SidebarMenu>
      {items.map((item) => {
        const active = item.href === activeHref;
        const Icon = item.icon ? SHELL_NAV_ICONS[item.icon] : null;
        const label = (
          <>
            {Icon ? (
              <Icon aria-hidden="true" className={icon.className} style={icon.style} />
            ) : null}
            {compact ? null : <span {...applyStyles(styles.navLabel)}>{item.label}</span>}
          </>
        );
        return (
          <SidebarMenuItem key={item.id}>
            {item.stub ? (
              <SidebarMenuButton
                active={active}
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                className={compact ? compactButton.className : undefined}
                dense
                disabled
                style={compact ? compactButton.style : undefined}
                title={item.label}
              >
                {label}
              </SidebarMenuButton>
            ) : (
              <SidebarNavLink
                active={active}
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                className={compact ? compactButton.className : undefined}
                dense
                style={compact ? compactButton.style : undefined}
                title={item.label}
                onClick={() => setOpenMobile(false)}
                to={item.href}
              >
                {label}
              </SidebarNavLink>
            )}
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
