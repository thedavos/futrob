import { Link } from "@tanstack/react-router";
import {
  Button,
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
  cn,
  sidebarMenuButtonVariants,
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

  return (
    <>
      <Sheet onOpenChange={setOpenMobile} open={openMobile}>
        <SheetTrigger
          render={<Button aria-label="Abrir navegación" size="icon" variant="outline" />}
        >
          <ListIcon aria-hidden="true" />
        </SheetTrigger>
        <SheetContent className="w-[min(20rem,90vw)] p-0" side="left">
          <SheetHeader>
            <SheetTitle>Navegación</SheetTitle>
          </SheetHeader>
          <SheetBody className="p-0">
            <div className="flex h-full min-h-0 flex-col">
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
      <span className="truncate text-sm font-medium">{props.title}</span>
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

  return (
    <>
      <SidebarHeader className={compact ? "items-center gap-2 p-2" : "gap-3"}>
        <div className={cn("flex w-full items-center gap-1", compact && "flex-col")}>
          <AccountMenu compact={compact} />
          {showCollapseControl ? (
            <Button
              aria-label={collapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
              className={compact ? undefined : "ml-auto shrink-0"}
              dense
              onClick={toggleCollapsed}
              size="icon"
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
        <SidebarContent className="items-center p-2">
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
      <SidebarFooter className={compact ? "items-center p-2" : undefined}>
        <NavItemList compact={compact} items={footerItems} pathname={pathname} />
      </SidebarFooter>
    </>
  );
}

function QueuePlaceholder() {
  const { t } = useI18n();

  return (
    <div className="rounded-lg border border-dashed border-border-strong px-3 py-4 text-center">
      <p className="text-sm font-medium text-foreground">{t("shell.queue.empty.title")}</p>
      <p className="typo-caption text-muted-foreground">{t("shell.queue.empty.description")}</p>
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

  return (
    <SidebarMenu>
      {items.map((item) => {
        const active = item.href === activeHref;
        const Icon = item.icon ? SHELL_NAV_ICONS[item.icon] : null;
        const label = (
          <>
            {Icon ? <Icon aria-hidden="true" className="size-4 shrink-0" /> : null}
            {compact ? null : <span className="truncate">{item.label}</span>}
          </>
        );
        return (
          <SidebarMenuItem key={item.id}>
            {item.stub ? (
              <SidebarMenuButton
                active={active}
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                className={compact ? "justify-center px-0" : undefined}
                dense
                disabled
                title={item.label}
              >
                {label}
              </SidebarMenuButton>
            ) : (
              <Link
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                className={cn(
                  sidebarMenuButtonVariants({ active, dense: true }),
                  compact && "justify-center px-0",
                )}
                title={item.label}
                to={item.href}
              >
                {label}
              </Link>
            )}
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
