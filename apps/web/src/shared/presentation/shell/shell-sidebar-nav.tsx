import { createLink } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  Button,
  colors,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuLink,
  typography,
  useSidebar,
} from "@futrob/ui";
import {
  CheckSquareOffsetIcon,
  ListIcon,
  SidebarIcon as SidebarExpandIcon,
  SidebarSimpleIcon,
} from "@phosphor-icons/react";
import { SHELL_NAV_ICONS } from "@/shared/presentation/shell/nav-icons.ts";
import {
  contextNavFor,
  generalNavFor,
  resolveActiveNavHref,
  type ShellNavItem,
} from "@/shared/presentation/shell/nav-registry.ts";
import { AccountMenu } from "@/shared/presentation/shell/shell-account-menu.tsx";
import type { WorkspaceSelection } from "@/shared/presentation/shell/workspace-selection.ts";
import { WorkspaceSelector } from "@/shared/presentation/shell/workspace-selector.tsx";
import type { WorkspaceSelectorModel } from "@/shared/presentation/shell/workspace-selector-model.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";

const SidebarNavLink = createLink(SidebarMenuLink);

const styles = stylex.create({
  sheet: {
    width: "min(20rem, 90vw)",
    padding: 0,
  },
  sheetBody: {
    padding: 0,
  },
  sheetColumn: {
    display: "flex",
    height: "100%",
    minHeight: 0,
    flexDirection: "column",
  },
  mobileTitle: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    fontWeight: 500,
  },
  headerCompact: {
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.5rem",
  },
  headerExpanded: {
    gap: "0.75rem",
  },
  headerRow: {
    display: "flex",
    width: "100%",
    alignItems: "center",
    gap: "0.25rem",
  },
  headerRowCompact: {
    flexDirection: "column",
  },
  collapseButton: {
    marginLeft: "auto",
    flexShrink: 0,
  },
  contentCompact: {
    alignItems: "center",
    padding: "0.5rem",
  },
  footerCompact: {
    alignItems: "center",
    padding: "0.5rem",
  },
  queueEmpty: {
    borderRadius: "var(--corner-lg)",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.borderStrong,
    paddingInline: "0.75rem",
    paddingBlock: "1rem",
    textAlign: "center",
  },
  queueTitle: {
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    fontWeight: 500,
    color: colors.foreground,
  },
  queueDescription: {
    color: colors.mutedForeground,
  },
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
});

export type ShellSidebarProps = {
  readonly selection: WorkspaceSelection;
  readonly pathname: string;
  readonly model: WorkspaceSelectorModel;
  readonly allowedPermissions: ReadonlySet<string>;
  readonly onSelect: (selection: WorkspaceSelection) => void;
  readonly onRequestAddClub: () => void;
};

export function DesktopSidebar(props: ShellSidebarProps) {
  return (
    <Sidebar aria-label="Navegación principal">
      <ShellSidebarBody {...props} />
    </Sidebar>
  );
}

export function MobileNav(props: ShellSidebarProps & { readonly title: string }) {
  const { openMobile, setOpenMobile } = useSidebar();
  const sheet = applyStyles(styles.sheet);
  const sheetBody = applyStyles(styles.sheetBody);

  return (
    <>
      <Sheet onOpenChange={setOpenMobile} open={openMobile}>
        <SheetTrigger
          render={<Button aria-label="Abrir navegación" size="icon" variant="outline" />}
        >
          <ListIcon aria-hidden="true" />
        </SheetTrigger>
        <SheetContent className={sheet.className} side="left" style={sheet.style}>
          <SheetHeader>
            <SheetTitle>Navegación</SheetTitle>
          </SheetHeader>
          <SheetBody className={sheetBody.className} style={sheetBody.style}>
            <div {...applyStyles(styles.sheetColumn)}>
              <ShellSidebarBody
                {...props}
                forceExpanded
                onSelect={(next) => {
                  props.onSelect(next);
                  setOpenMobile(false);
                }}
              />
            </div>
          </SheetBody>
        </SheetContent>
      </Sheet>
      <span {...applyStyles(styles.mobileTitle)}>{props.title}</span>
    </>
  );
}

function ShellSidebarBody({
  selection,
  pathname,
  model,
  allowedPermissions,
  onSelect,
  onRequestAddClub,
  forceExpanded = false,
}: ShellSidebarProps & { readonly forceExpanded?: boolean }) {
  const { collapsed, toggleCollapsed } = useSidebar();
  const { t } = useI18n();
  const compact = collapsed && !forceExpanded;
  const general = generalNavFor(selection, allowedPermissions, t);
  const context = contextNavFor(selection, allowedPermissions);
  const footerItems = context.items.length > 0 ? context.items : general.items;
  const showCollapseControl = !forceExpanded;
  const header = applyStyles(compact ? styles.headerCompact : styles.headerExpanded);
  const collapse = applyStyles(styles.collapseButton);
  const contentCompact = applyStyles(styles.contentCompact);
  const footerCompact = applyStyles(styles.footerCompact);

  return (
    <>
      <SidebarHeader className={header.className} style={header.style}>
        <div {...applyStyles(styles.headerRow, compact && styles.headerRowCompact)}>
          <AccountMenu compact={compact} />
          {showCollapseControl ? (
            <Button
              aria-label={collapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
              className={compact ? undefined : collapse.className}
              dense
              onClick={toggleCollapsed}
              size="icon"
              style={compact ? undefined : collapse.style}
              variant="ghost"
            >
              {collapsed ? (
                <SidebarExpandIcon aria-hidden="true" />
              ) : (
                <SidebarSimpleIcon aria-hidden="true" />
              )}
            </Button>
          ) : null}
        </div>
        {compact ? null : (
          <WorkspaceSelector
            model={model}
            onRequestAddClub={onRequestAddClub}
            onSelect={onSelect}
            selection={selection}
          />
        )}
      </SidebarHeader>
      {compact ? (
        <SidebarContent className={contentCompact.className} style={contentCompact.style}>
          <Button
            aria-label={t("shell.queue.expand")}
            dense
            onClick={toggleCollapsed}
            size="icon"
            title="Expandir barra lateral"
            variant="ghost"
          >
            <CheckSquareOffsetIcon aria-hidden="true" />
          </Button>
        </SidebarContent>
      ) : (
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>{t("shell.queue.label")}</SidebarGroupLabel>
            <QueuePlaceholder />
          </SidebarGroup>
        </SidebarContent>
      )}
      <SidebarFooter
        className={compact ? footerCompact.className : undefined}
        style={compact ? footerCompact.style : undefined}
      >
        <NavItemList compact={compact} items={footerItems} pathname={pathname} />
      </SidebarFooter>
    </>
  );
}

function QueuePlaceholder() {
  const { t } = useI18n();

  return (
    <div {...applyStyles(styles.queueEmpty)}>
      <p {...applyStyles(styles.queueTitle)}>{t("shell.queue.empty.title")}</p>
      <p {...applyStyles(typography.caption, styles.queueDescription)}>
        {t("shell.queue.empty.description")}
      </p>
    </div>
  );
}

function NavItemList({
  items,
  pathname,
  compact = false,
}: {
  readonly items: readonly ShellNavItem[];
  readonly pathname: string;
  readonly compact?: boolean;
}) {
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
