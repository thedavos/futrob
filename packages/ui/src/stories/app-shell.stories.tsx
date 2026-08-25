import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  CaretDownIcon,
  CheckSquareOffsetIcon,
  GameControllerIcon,
  HouseIcon,
  PlusIcon,
  SidebarIcon as SidebarExpandIcon,
  SidebarSimpleIcon,
  TicketIcon,
  TrophyIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { applyHost, colors, media, typography } from "@futrob/ui";

import { ActionBar, ActionBarEnd, ActionBarStart } from "../components/action-bar";
import { Avatar, AvatarFallback } from "../components/avatar";
import { Button } from "../components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/dropdown-menu";
import {
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
  SidebarProvider,
  useSidebar,
} from "../components/sidebar";

const styles = stylex.create({
  collapseExpanded: {
    marginInlineStart: "auto",
    flexShrink: 0,
  },
  accountRow: {
    display: "flex",
    width: "100%",
    alignItems: "center",
    gap: "0.25rem",
  },
  accountRowCompact: {
    flexDirection: "column",
  },
  accountTriggerCompact: {
    justifyContent: "center",
    paddingInline: 0,
  },
  accountTrigger: {
    width: "auto",
    maxWidth: "100%",
    justifyContent: "flex-start",
    paddingInline: "0.375rem",
  },
  accountInner: {
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    gap: "0.5rem",
  },
  accountInnerCompact: {
    gap: 0,
  },
  avatar: {
    width: "1.5rem",
    height: "1.5rem",
    flexShrink: 0,
  },
  avatarFallback: {
    fontSize: "var(--text-xs)",
    lineHeight: 1,
  },
  nameRow: {
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    gap: "0.25rem",
  },
  name: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: "var(--text-sm)",
    fontWeight: 500,
  },
  caretSm: {
    width: "0.75rem",
    height: "0.75rem",
    flexShrink: 0,
    color: colors.mutedForeground,
    transitionProperty: "transform",
    transitionDuration: "var(--duration-normal)",
    transitionTimingFunction: "var(--ease-emphasized)",
    transform: {
      default: null,
      ":where([aria-expanded=true] *)": "rotate(180deg)",
    },
  },
  menu: {
    width: "14rem",
  },
  sectionRow: {
    display: "flex",
    alignItems: "center",
  },
  sectionLabel: {
    minWidth: 0,
    flex: 1,
    paddingBlock: "0.375rem",
    paddingInlineEnd: "0.25rem",
  },
  sectionAction: {
    width: {
      default: "var(--control-height-dense)",
      [media.maxSm]: "var(--control-height-touch)",
    },
    height: {
      default: "var(--control-height-dense)",
      [media.maxSm]: "var(--control-height-touch)",
    },
    minHeight: {
      default: "var(--control-height-dense)",
      [media.maxSm]: "var(--control-height-touch)",
    },
    flexShrink: 0,
    justifyContent: "center",
    padding: 0,
    color: colors.mutedForeground,
  },
  iconSm: {
    width: "1rem",
    height: "1rem",
  },
  workspaceTrigger: {
    width: "100%",
    justifyContent: "space-between",
    fontWeight: 500,
  },
  workspaceInner: {
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    gap: "0.5rem",
  },
  iconShrink: {
    width: "1rem",
    height: "1rem",
    flexShrink: 0,
  },
  truncate: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  caret: {
    width: "1rem",
    height: "1rem",
    flexShrink: 0,
    transitionProperty: "transform",
    transitionDuration: "var(--duration-normal)",
    transitionTimingFunction: "var(--ease-emphasized)",
    transform: {
      default: null,
      ":where([aria-expanded=true] *)": "rotate(180deg)",
    },
  },
  provider: {
    height: "100svh",
  },
  headerExpanded: {
    gap: "0.75rem",
  },
  headerCompact: {
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.5rem",
  },
  emptyQueue: {
    borderRadius: "var(--corner-lg)",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.borderStrong,
    paddingInline: "0.75rem",
    paddingBlock: "1rem",
    textAlign: "center",
  },
  emptyTitle: {
    fontSize: "var(--text-sm)",
    fontWeight: 500,
  },
  muted: { color: colors.mutedForeground },
  pageHeader: {
    display: "flex",
    height: "3.5rem",
    flexShrink: 0,
    alignItems: "center",
    gap: "0.75rem",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.border,
    paddingInline: "1.5rem",
  },
  pageHeaderCompact: {
    display: "flex",
    height: "3.5rem",
    flexShrink: 0,
    alignItems: "center",
    gap: "0.75rem",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.border,
    paddingInline: "1.25rem",
  },
  pageTitle: {
    flex: 1,
    fontSize: "var(--text-lg)",
  },
  pageTitlePlain: {
    fontSize: "var(--text-lg)",
  },
  pageBody: {
    minHeight: 0,
    flex: 1,
    overflowY: "auto",
    padding: "1.25rem",
    fontSize: "var(--text-sm)",
    color: colors.mutedForeground,
  },
  pageLines: {
    marginTop: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  contentCompact: {
    alignItems: "center",
    padding: "0.5rem",
  },
  iconOnly: {
    justifyContent: "center",
    paddingInline: 0,
  },
  footerCompact: {
    alignItems: "center",
    padding: "0.5rem",
  },
  insetPad: {
    flex: 1,
    padding: "1.25rem",
    fontSize: "var(--text-sm)",
    color: colors.mutedForeground,
  },
});

const meta = {
  title: "Patterns/App shell",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function HeaderCollapseToggle() {
  const { collapsed, toggleCollapsed } = useSidebar();
  return (
    <Button
      aria-label={collapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
      dense
      onClick={toggleCollapsed}
      size="icon"
      variant="ghost"
      {...applyHost(undefined, undefined, !collapsed && styles.collapseExpanded)}
    >
      {collapsed ? (
        <SidebarExpandIcon aria-hidden="true" />
      ) : (
        <SidebarSimpleIcon aria-hidden="true" />
      )}
    </Button>
  );
}

function AccountAndCollapseRow({ compact = false }: { readonly compact?: boolean }) {
  return (
    <div {...applyHost(undefined, undefined, styles.accountRow, compact && styles.accountRowCompact)}>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Abrir menú de cuenta"
          render={
            <Button
              dense
              size={compact ? "icon" : "default"}
              variant="ghost"
              {...applyHost(
                undefined,
                undefined,
                compact ? styles.accountTriggerCompact : styles.accountTrigger,
              )}
            />
          }
        >
          <span
            {...applyHost(
              undefined,
              undefined,
              styles.accountInner,
              compact && styles.accountInnerCompact,
            )}
          >
            <Avatar {...applyHost(undefined, undefined, styles.avatar)}>
              <AvatarFallback {...applyHost(undefined, undefined, styles.avatarFallback)}>
                DV
              </AvatarFallback>
            </Avatar>
            {compact ? null : (
              <span {...applyHost(undefined, undefined, styles.nameRow)}>
                <span {...applyHost(undefined, undefined, styles.name)}>David</span>
                <CaretDownIcon
                  aria-hidden="true"
                  weight="bold"
                  {...applyHost(undefined, undefined, styles.caretSm)}
                />
              </span>
            )}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" {...applyHost(undefined, undefined, styles.menu)}>
          <DropdownMenuItem>Perfil</DropdownMenuItem>
          <DropdownMenuItem>Configuración</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Cerrar sesión</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <HeaderCollapseToggle />
    </div>
  );
}

function WorkspaceSectionHeader({
  actionLabel,
  title,
}: {
  readonly actionLabel: string;
  readonly title: string;
}) {
  return (
    <div {...applyHost(undefined, undefined, styles.sectionRow)}>
      <DropdownMenuLabel {...applyHost(undefined, undefined, styles.sectionLabel)}>
        {title}
      </DropdownMenuLabel>
      <DropdownMenuItem
        aria-label={actionLabel}
        {...applyHost(undefined, undefined, styles.sectionAction)}
      >
        <PlusIcon aria-hidden="true" {...applyHost(undefined, undefined, styles.iconSm)} />
      </DropdownMenuItem>
    </div>
  );
}

function WorkspaceSelectorDemo() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            dense
            variant="outline"
            {...applyHost(undefined, undefined, styles.workspaceTrigger)}
          />
        }
      >
        <span {...applyHost(undefined, undefined, styles.workspaceInner)}>
          <TrophyIcon aria-hidden="true" {...applyHost(undefined, undefined, styles.iconShrink)} />
          <span {...applyHost(undefined, undefined, styles.truncate)}>La Copa del Barrio</span>
        </span>
        <CaretDownIcon aria-hidden="true" {...applyHost(undefined, undefined, styles.caret)} />
      </DropdownMenuTrigger>
      <DropdownMenuContent {...applyHost(undefined, undefined, styles.menu)}>
        <DropdownMenuGroup>
          <WorkspaceSectionHeader actionLabel="Crear competición" title="Competiciones" />
          <DropdownMenuItem>
            <TrophyIcon aria-hidden="true" {...applyHost(undefined, undefined, styles.iconSm)} />
            La Copa del Barrio
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <WorkspaceSectionHeader actionLabel="Añadir club" title="Clubes EA" />
          <DropdownMenuItem>Night Owls</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <WorkspaceSectionHeader actionLabel="Crear organización" title="Organizaciones" />
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ShellDemo({ showActionBar = false }: { readonly showActionBar?: boolean }) {
  return (
    <SidebarProvider
      data-density="dense"
      defaultCollapsed={false}
      {...applyHost(undefined, undefined, styles.provider)}
    >
      <Sidebar>
        <SidebarHeader {...applyHost(undefined, undefined, styles.headerExpanded)}>
          <AccountAndCollapseRow />
          <WorkspaceSelectorDemo />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Tareas</SidebarGroupLabel>
            <div {...applyHost(undefined, undefined, styles.emptyQueue)}>
              <p {...applyHost(undefined, undefined, styles.emptyTitle)}>Sin tareas pendientes</p>
              <p {...applyHost(undefined, undefined, typography.caption, styles.muted)}>
                Las tareas del espacio activo aparecerán aquí.
              </p>
            </div>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton active dense>
                <HouseIcon aria-hidden="true" {...applyHost(undefined, undefined, styles.iconSm)} />
                Inicio
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton dense>
                <TrophyIcon aria-hidden="true" {...applyHost(undefined, undefined, styles.iconSm)} />
                Competiciones
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton dense>
                <GameControllerIcon
                  aria-hidden="true"
                  {...applyHost(undefined, undefined, styles.iconSm)}
                />
                Clubes EA
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton dense>
                <TicketIcon aria-hidden="true" {...applyHost(undefined, undefined, styles.iconSm)} />
                Invitaciones
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header {...applyHost(undefined, undefined, styles.pageHeader)}>
          <h1 {...applyHost(undefined, undefined, typography.heading, styles.pageTitle)}>Inicio</h1>
          <Button dense disabled variant="outline">
            Sync EA
          </Button>
        </header>
        <div {...applyHost(undefined, undefined, styles.pageBody)}>
          <p>Contenido de la página con scroll independiente.</p>
          <div {...applyHost(undefined, undefined, styles.pageLines)}>
            {Array.from({ length: 24 }, (_, index) => (
              <p key={index}>Fila de contenido {index + 1}</p>
            ))}
          </div>
        </div>
        {showActionBar ? (
          <ActionBar>
            <ActionBarStart>
              <span {...applyHost(undefined, undefined, typography.caption, styles.muted)}>
                Cambios sin guardar
              </span>
            </ActionBarStart>
            <ActionBarEnd>
              <Button dense variant="outline">
                Cancelar
              </Button>
              <Button dense>Guardar</Button>
            </ActionBarEnd>
          </ActionBar>
        ) : null}
      </SidebarInset>
    </SidebarProvider>
  );
}

export const SidebarWithGroups: Story = {
  render: () => <ShellDemo />,
};

export const WithActionBar: Story = {
  render: () => <ShellDemo showActionBar />,
};

export const CollapsedRail: Story = {
  render: () => {
    const [collapsed, setCollapsed] = useState(true);
    return (
      <SidebarProvider
        collapsed={collapsed}
        data-density="dense"
        onCollapsedChange={setCollapsed}
        {...applyHost(undefined, undefined, styles.provider)}
      >
        <Sidebar>
          <SidebarHeader {...applyHost(undefined, undefined, styles.headerCompact)}>
            <AccountAndCollapseRow compact />
          </SidebarHeader>
          <SidebarContent {...applyHost(undefined, undefined, styles.contentCompact)}>
            <SidebarMenuButton
              aria-label="Tareas"
              dense
              {...applyHost(undefined, undefined, styles.iconOnly)}
            >
              <CheckSquareOffsetIcon aria-hidden="true" />
            </SidebarMenuButton>
          </SidebarContent>
          <SidebarFooter {...applyHost(undefined, undefined, styles.footerCompact)}>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  active
                  aria-label="Inicio"
                  dense
                  {...applyHost(undefined, undefined, styles.iconOnly)}
                >
                  <HouseIcon aria-hidden="true" />
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  aria-label="Competiciones"
                  dense
                  {...applyHost(undefined, undefined, styles.iconOnly)}
                >
                  <TrophyIcon aria-hidden="true" />
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header {...applyHost(undefined, undefined, styles.pageHeaderCompact)}>
            <h1 {...applyHost(undefined, undefined, typography.heading, styles.pageTitlePlain)}>
              Focus mode
            </h1>
          </header>
          <div {...applyHost(undefined, undefined, styles.insetPad)}>
            Icon rail colapsado. Expandir restaura el selector y las tareas.
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  },
};
