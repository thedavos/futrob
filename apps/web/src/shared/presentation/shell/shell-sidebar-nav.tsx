import type { ComponentType, CSSProperties } from "react";
import type { SidebarLayoutDto } from "@futrob/api-contracts";
import * as stylex from "@stylexjs/stylex";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import {
  applyStyles,
  Button,
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  useSidebar,
  vis,
} from "@futrob/ui";
import {
  CheckSquareOffsetIcon,
  ListIcon,
  SidebarIcon as SidebarExpandIcon,
  SidebarSimpleIcon,
} from "@phosphor-icons/react";
import { contextNavFor, generalNavFor } from "@/shared/presentation/shell/nav-registry.ts";
import {
  NavItemList,
  NavItemListSkeleton,
} from "@/shared/presentation/shell/shell-nav-item-list.tsx";
import { AccountMenu } from "@/shared/presentation/shell/shell-account-menu.tsx";
import type { WorkspaceSelection } from "@/shared/presentation/shell/workspace-selection.ts";
import { WorkspaceSelector } from "@/shared/presentation/shell/workspace-selector.tsx";
import type { WorkspaceSelectorModel } from "@/shared/presentation/shell/workspace-selector-model.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { ShellPendingQueue } from "@/modules/notifications/presentation/shell-pending-queue.tsx";

const styles = stylex.create({
  sheet: {
    width: "min(20rem, 90vw)",
    backgroundColor: colors.surface,
  },
  sheetHeader: {
    height: "auto",
    paddingBlock: "1rem",
    paddingInlineEnd: "4rem",
  },
  mobileTitle: {
    minWidth: 0,
    flexGrow: 1,
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
  navigationHeader: {
    height: "3.5rem",
    justifyContent: "center",
    paddingBlock: 0,
  },
  navigationHeaderCompact: {
    alignItems: "center",
    paddingInline: "0.5rem",
  },
  selectorSlot: {
    minWidth: 0,
    flexGrow: 1,
  },
  navContentCompact: {
    paddingInline: "0.5rem",
  },
  accountFooterCompact: {
    display: "flex",
    justifyContent: "center",
    padding: "0.5rem",
  },
  queueGroup: {
    display: "flex",
    minHeight: 0,
    flexGrow: 1,
    flexDirection: "column",
  },
});

export type ShellSidebarProps = {
  readonly selection: WorkspaceSelection;
  readonly pathname: string;
  readonly sidebarLayout: SidebarLayoutDto;
  readonly model: WorkspaceSelectorModel;
  readonly allowedPermissions: ReadonlySet<string>;
  /** Access for the selected workspace is still resolving; nav items are not known yet. */
  readonly navPending?: boolean;
  readonly onSelect: (selection: WorkspaceSelection) => void;
  readonly onRequestAddClub: () => void;
  readonly onSelectorOpen?: () => void;
};

export function DesktopSidebar(props: ShellSidebarProps) {
  const { t } = useI18n();
  return (
    <Sidebar aria-label={t("shell.sidebar.label")}>
      <ShellSidebarBody {...props} />
    </Sidebar>
  );
}

export function MobileNav(props: ShellSidebarProps & { readonly title: string }) {
  const { t } = useI18n();
  const { openMobile, setOpenMobile } = useSidebar();

  return (
    <>
      <Sheet onOpenChange={setOpenMobile} open={openMobile}>
        <SheetTrigger
          render={<Button aria-label={t("shell.nav.open")} size="icon" variant="ghost" />}
        >
          <ListIcon aria-hidden="true" />
        </SheetTrigger>
        <SheetContent closeLabel={t("common.close")} className={styles.sheet} side="left">
          <SheetTitle className={vis.srOnly}>{t("shell.nav.title")}</SheetTitle>
          <ShellSidebarBody
            {...props}
            forceExpanded
            onSelect={(next) => {
              props.onSelect(next);
              setOpenMobile(false);
            }}
          />
        </SheetContent>
      </Sheet>
      <span {...applyStyles(styles.mobileTitle)}>{props.title}</span>
    </>
  );
}

type ShellSidebarBodyProps = ShellSidebarProps & { readonly forceExpanded?: boolean };

function ShellSidebarBody(props: ShellSidebarBodyProps) {
  const Body = SIDEBAR_BODIES[props.sidebarLayout];
  return <Body {...props} />;
}

function sidebarNavItems(
  selection: WorkspaceSelection,
  allowedPermissions: ReadonlySet<string>,
  t: Translator,
) {
  const context = contextNavFor(selection, allowedPermissions, t);
  return context.items.length > 0
    ? context.items
    : generalNavFor(selection, allowedPermissions, t).items;
}

function CollapseButton({
  className,
  style,
}: {
  readonly className?: string;
  readonly style?: CSSProperties;
}) {
  const { collapsed, toggleCollapsed } = useSidebar();
  const { t } = useI18n();
  return (
    <Button
      aria-label={collapsed ? t("shell.sidebar.expand") : t("shell.sidebar.collapse")}
      className={className}
      dense
      onClick={toggleCollapsed}
      size="icon"
      style={style}
      variant="ghost"
    >
      {collapsed ? (
        <SidebarExpandIcon aria-hidden="true" />
      ) : (
        <SidebarSimpleIcon aria-hidden="true" />
      )}
    </Button>
  );
}

function NavigationSidebarBody({
  selection,
  pathname,
  model,
  allowedPermissions,
  navPending = false,
  onSelect,
  onRequestAddClub,
  onSelectorOpen,
  forceExpanded = false,
}: ShellSidebarBodyProps) {
  const { collapsed } = useSidebar();
  const { t } = useI18n();
  const compact = collapsed && !forceExpanded;
  const items = sidebarNavItems(selection, allowedPermissions, t);

  return (
    <>
      <SidebarHeader
        className={[
          styles.navigationHeader,
          compact && styles.navigationHeaderCompact,
          forceExpanded && styles.sheetHeader,
        ]}
      >
        <div {...applyStyles(styles.headerRow)}>
          {compact ? null : (
            <div {...applyStyles(styles.selectorSlot)}>
              <WorkspaceSelector
                borderless
                model={model}
                onOpen={onSelectorOpen}
                onRequestAddClub={onRequestAddClub}
                onSelect={onSelect}
                selection={selection}
              />
            </div>
          )}
          {forceExpanded ? null : <CollapseButton />}
        </div>
      </SidebarHeader>
      <SidebarContent className={compact && styles.navContentCompact}>
        {navPending ? (
          <NavItemListSkeleton compact={compact} />
        ) : (
          <NavItemList compact={compact} items={items} pathname={pathname} />
        )}
      </SidebarContent>
      <SidebarFooter className={compact && styles.accountFooterCompact}>
        <AccountMenu
          compact={compact}
          placement="footer"
          surface={forceExpanded ? "sheet" : "sidebar"}
        />
      </SidebarFooter>
    </>
  );
}

function PendingQueueSidebarBody({
  selection,
  pathname,
  model,
  allowedPermissions,
  navPending = false,
  onSelect,
  onRequestAddClub,
  onSelectorOpen,
  forceExpanded = false,
}: ShellSidebarBodyProps) {
  const { collapsed, toggleCollapsed } = useSidebar();
  const { t } = useI18n();
  const compact = collapsed && !forceExpanded;
  const footerItems = sidebarNavItems(selection, allowedPermissions, t);
  const showCollapseControl = !forceExpanded;
  const collapse = applyStyles(styles.collapseButton);

  return (
    <>
      <SidebarHeader
        className={[
          compact ? styles.headerCompact : styles.headerExpanded,
          forceExpanded && styles.sheetHeader,
        ]}
      >
        <div {...applyStyles(styles.headerRow, compact && styles.headerRowCompact)}>
          <AccountMenu compact={compact} surface={forceExpanded ? "sheet" : "sidebar"} />
          {showCollapseControl ? (
            <CollapseButton
              className={compact ? undefined : collapse.className}
              style={compact ? undefined : collapse.style}
            />
          ) : null}
        </div>
        {compact ? null : (
          <WorkspaceSelector
            model={model}
            onOpen={onSelectorOpen}
            onRequestAddClub={onRequestAddClub}
            onSelect={onSelect}
            selection={selection}
          />
        )}
      </SidebarHeader>
      {compact ? (
        <SidebarContent className={styles.contentCompact}>
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
          <SidebarGroup className={styles.queueGroup}>
            <SidebarGroupLabel>{t("shell.queue.label")}</SidebarGroupLabel>
            <ShellPendingQueue allowedPermissions={allowedPermissions} selection={selection} />
          </SidebarGroup>
        </SidebarContent>
      )}
      <SidebarFooter className={compact && styles.footerCompact}>
        {navPending ? (
          <NavItemListSkeleton compact={compact} />
        ) : (
          <NavItemList compact={compact} items={footerItems} pathname={pathname} />
        )}
      </SidebarFooter>
    </>
  );
}

const SIDEBAR_BODIES = {
  navigation: NavigationSidebarBody,
  "pending-queue": PendingQueueSidebarBody,
} satisfies Record<SidebarLayoutDto, ComponentType<ShellSidebarBodyProps>>;
