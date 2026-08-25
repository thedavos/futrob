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
import { useState, type ReactNode } from "react";
import * as stylex from "@stylexjs/stylex";
import { applyHost, colors, media, typography } from "@futrob/ui";

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
  SidebarMenuLink,
  SidebarProvider,
  SidebarRail,
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
  menuWide: {
    minWidth: "14rem",
  },
  provider: {
    height: "100svh",
  },
  sidebar: {
    display: "flex",
  },
  rail: {
    display: "flex",
  },
  railLabel: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: "var(--text-sm)",
    fontWeight: 500,
  },
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
  pageTitle: {
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
  pageLine: {
    marginTop: "0.5rem",
  },
  headerExpanded: {
    gap: "0.75rem",
  },
  headerCompact: {
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.5rem",
  },
  contentCompact: {
    alignItems: "center",
    padding: "0.5rem",
  },
  iconOnly: {
    justifyContent: "center",
    paddingInline: 0,
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
    color: colors.foreground,
  },
  emptyTitlePlain: {
    fontSize: "var(--text-sm)",
    fontWeight: 500,
  },
  muted: { color: colors.mutedForeground },
  footerCompact: {
    alignItems: "center",
    padding: "0.5rem",
  },
  providerAuto: {
    height: "auto",
    overflow: "visible",
  },
  insetCenter: {
    display: "flex",
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: "1.25rem",
    fontSize: "var(--text-sm)",
    color: colors.mutedForeground,
  },
  sample: {
    marginInline: "auto",
    width: "16rem",
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: "0.75rem",
  },
  sampleStack: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  states: {
    marginInline: "auto",
    display: "flex",
    maxWidth: "24rem",
    flexDirection: "column",
    gap: "1.5rem",
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: "1.5rem",
  },
  group: {
    display: "grid",
    gap: "0.5rem",
  },
  iconOnlyWide: {
    width: "2.5rem",
    justifyContent: "center",
    paddingInline: 0,
  },
  disabledLink: {
    pointerEvents: "none",
    opacity: 0.5,
  },
  density: {
    display: "grid",
    gap: "2rem",
    padding: "1.5rem",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.md]: "repeat(2, minmax(0, 1fr))",
    },
  },
  densityPanel: {
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: "1rem",
  },
  densityLabel: {
    marginBottom: "0.75rem",
    color: colors.mutedForeground,
  },
  captionPad: {
    paddingInline: "0.625rem",
    color: colors.mutedForeground,
  },
  insetPad: {
    padding: "1.25rem",
    fontSize: "var(--text-sm)",
    color: colors.mutedForeground,
  },
});

const meta = {
  title: "Primitives/Sidebar",
  component: Sidebar,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    "aria-label": "Navegación principal",
  },
  argTypes: {
    className: { control: false },
  },
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

function HeaderCollapseControl() {
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

function DemoAccountRow({
  compact = false,
  dense = true,
  shortName = "David",
}: {
  readonly compact?: boolean;
  readonly dense?: boolean;
  readonly shortName?: string;
}) {
  return (
    <div {...applyHost(undefined, undefined, styles.accountRow, compact && styles.accountRowCompact)}>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Abrir menú de cuenta"
          render={
            <Button
              dense={dense}
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
                <span title="David Vargas" {...applyHost(undefined, undefined, styles.name)}>
                  {shortName}
                </span>
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
      <HeaderCollapseControl />
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

function DemoWorkspaceSelector({ dense = true }: { readonly dense?: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            dense={dense}
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
      <DropdownMenuContent align="start" {...applyHost(undefined, undefined, styles.menuWide)}>
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

function DemoShell({
  collapsed: collapsedProp,
  defaultCollapsed = false,
  dense = true,
  longContent = false,
  showRail = false,
  children,
}: {
  readonly collapsed?: boolean;
  readonly defaultCollapsed?: boolean;
  readonly dense?: boolean;
  readonly longContent?: boolean;
  readonly showRail?: boolean;
  readonly children?: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(collapsedProp ?? defaultCollapsed);
  const controlled = collapsedProp !== undefined;

  return (
    <SidebarProvider
      collapsed={controlled ? collapsed : undefined}
      data-density={dense ? "dense" : undefined}
      defaultCollapsed={defaultCollapsed}
      onCollapsedChange={controlled ? setCollapsed : undefined}
      {...applyHost(undefined, undefined, styles.provider)}
    >
      {children ?? (
        <>
          <DemoSidebar dense={dense} longContent={longContent} />
          <SidebarInset>
            {showRail ? (
              <SidebarRail {...applyHost(undefined, undefined, styles.rail)}>
                <Button aria-label="Abrir navegación" dense size="icon" variant="outline">
                  <HouseIcon aria-hidden="true" />
                </Button>
                <span {...applyHost(undefined, undefined, styles.railLabel)}>Inicio</span>
              </SidebarRail>
            ) : null}
            <header {...applyHost(undefined, undefined, styles.pageHeader)}>
              <h1 {...applyHost(undefined, undefined, typography.heading, styles.pageTitle)}>
                Espacio personal
              </h1>
            </header>
            <div {...applyHost(undefined, undefined, styles.pageBody)}>
              Contenido principal con scroll independiente.
              {longContent
                ? Array.from({ length: 30 }, (_, index) => (
                    <p key={index} {...applyHost(undefined, undefined, styles.pageLine)}>
                      Línea de contenido {index + 1}
                    </p>
                  ))
                : null}
            </div>
          </SidebarInset>
        </>
      )}
    </SidebarProvider>
  );
}

function DemoSidebar({
  dense = true,
  longContent = false,
  compactOverride,
}: {
  readonly dense?: boolean;
  readonly longContent?: boolean;
  readonly compactOverride?: boolean;
}) {
  const { collapsed } = useSidebar();
  const compact = compactOverride ?? collapsed;

  return (
    <Sidebar aria-label="Navegación principal" {...applyHost(undefined, undefined, styles.sidebar)}>
      <SidebarHeader
        {...applyHost(undefined, undefined, compact ? styles.headerCompact : styles.headerExpanded)}
      >
        <DemoAccountRow compact={compact} dense={dense} />
        {compact ? null : <DemoWorkspaceSelector dense={dense} />}
      </SidebarHeader>
      {compact ? (
        <SidebarContent {...applyHost(undefined, undefined, styles.contentCompact)}>
          <SidebarMenuButton
            aria-label="Tareas"
            dense={dense}
            {...applyHost(undefined, undefined, styles.iconOnly)}
          >
            <CheckSquareOffsetIcon aria-hidden="true" />
          </SidebarMenuButton>
        </SidebarContent>
      ) : (
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Tareas</SidebarGroupLabel>
            <div {...applyHost(undefined, undefined, styles.emptyQueue)}>
              <p {...applyHost(undefined, undefined, styles.emptyTitle)}>Sin tareas pendientes</p>
              <p {...applyHost(undefined, undefined, typography.caption, styles.muted)}>
                Las tareas del espacio activo aparecerán aquí.
              </p>
            </div>
            {longContent
              ? Array.from({ length: 20 }, (_, index) => (
                  <SidebarMenuButton dense={dense} key={index}>
                    <CheckSquareOffsetIcon aria-hidden="true" />
                    Tarea {index + 1}
                  </SidebarMenuButton>
                ))
              : null}
          </SidebarGroup>
        </SidebarContent>
      )}
      <SidebarFooter {...applyHost(undefined, undefined, compact && styles.footerCompact)}>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              active
              aria-label="Inicio"
              dense={dense}
              {...applyHost(undefined, undefined, compact && styles.iconOnly)}
            >
              <HouseIcon aria-hidden="true" />
              {compact ? null : "Inicio"}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              aria-label="Competiciones"
              dense={dense}
              {...applyHost(undefined, undefined, compact && styles.iconOnly)}
            >
              <TrophyIcon aria-hidden="true" />
              {compact ? null : "Competiciones"}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              aria-label="Clubes EA"
              dense={dense}
              {...applyHost(undefined, undefined, compact && styles.iconOnly)}
            >
              <GameControllerIcon aria-hidden="true" />
              {compact ? null : "Clubes EA"}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              aria-label="Invitaciones"
              dense={dense}
              {...applyHost(undefined, undefined, compact && styles.iconOnly)}
            >
              <TicketIcon aria-hidden="true" />
              {compact ? null : "Invitaciones"}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export const Playground: Story = {
  render: () => <DemoShell defaultCollapsed={false} dense />,
};

export const Regions: Story = {
  name: "Header content footer",
  render: () => (
    <SidebarProvider data-density="dense" {...applyHost(undefined, undefined, styles.provider)}>
      <Sidebar
        aria-label="Regiones de la barra lateral"
        {...applyHost(undefined, undefined, styles.sidebar)}
      >
        <SidebarHeader {...applyHost(undefined, undefined, styles.headerExpanded)}>
          <p {...applyHost(undefined, undefined, typography.caption, styles.muted)}>
            Header sticky
          </p>
          <DemoAccountRow dense />
          <DemoWorkspaceSelector dense />
        </SidebarHeader>
        <SidebarContent>
          <p {...applyHost(undefined, undefined, typography.caption, styles.muted)}>
            Content con scroll
          </p>
          <SidebarGroup>
            <SidebarGroupLabel>Tareas</SidebarGroupLabel>
            <div {...applyHost(undefined, undefined, styles.emptyQueue)}>
              <p {...applyHost(undefined, undefined, styles.emptyTitlePlain)}>
                Sin tareas pendientes
              </p>
            </div>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <p {...applyHost(undefined, undefined, typography.caption, styles.captionPad)}>
            Footer sticky
          </p>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton active dense>
                <HouseIcon aria-hidden="true" />
                Inicio
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div {...applyHost(undefined, undefined, styles.insetCenter)}>
          Inset: header y footer de la sidebar no scrollean con el content.
        </div>
      </SidebarInset>
    </SidebarProvider>
  ),
};

export const HeaderAccountRow: Story = {
  name: "Header account and collapse",
  render: () => (
    <div {...applyHost(undefined, undefined, styles.sample)}>
      <SidebarProvider data-density="dense" {...applyHost(undefined, undefined, styles.providerAuto)}>
        <DemoAccountRow dense shortName="David" />
      </SidebarProvider>
    </div>
  ),
  parameters: { layout: "centered" },
};

export const HeaderWithSelector: Story = {
  name: "Header with context selector",
  render: () => (
    <div {...applyHost(undefined, undefined, styles.sample)}>
      <SidebarProvider data-density="dense" {...applyHost(undefined, undefined, styles.providerAuto)}>
        <div {...applyHost(undefined, undefined, styles.sampleStack)}>
          <DemoAccountRow dense shortName="David" />
          <DemoWorkspaceSelector dense />
        </div>
      </SidebarProvider>
    </div>
  ),
  parameters: { layout: "centered" },
};

export const MenuButtonStates: Story = {
  name: "Menu button states",
  render: () => (
    <div {...applyHost(undefined, undefined, styles.states)}>
      <div {...applyHost(undefined, undefined, styles.group)}>
        <p {...applyHost(undefined, undefined, typography.label, styles.muted)}>Default</p>
        <SidebarMenuButton>
          <HouseIcon aria-hidden="true" />
          Inicio
        </SidebarMenuButton>
      </div>
      <div {...applyHost(undefined, undefined, styles.group)}>
        <p {...applyHost(undefined, undefined, typography.label, styles.muted)}>Active</p>
        <SidebarMenuButton active>
          <TrophyIcon aria-hidden="true" />
          Competiciones
        </SidebarMenuButton>
      </div>
      <div {...applyHost(undefined, undefined, styles.group)}>
        <p {...applyHost(undefined, undefined, typography.label, styles.muted)}>Disabled</p>
        <SidebarMenuButton disabled title="Próximamente">
          <GameControllerIcon aria-hidden="true" />
          Clubes EA
        </SidebarMenuButton>
      </div>
      <div {...applyHost(undefined, undefined, styles.group)}>
        <p {...applyHost(undefined, undefined, typography.label, styles.muted)}>
          Icon-only · aria-label
        </p>
        <SidebarMenuButton
          aria-label="Invitaciones"
          dense
          {...applyHost(undefined, undefined, styles.iconOnlyWide)}
        >
          <TicketIcon aria-hidden="true" />
        </SidebarMenuButton>
      </div>
    </div>
  ),
  parameters: { layout: "centered" },
};

export const MenuLink: Story = {
  name: "Menu link",
  render: () => (
    <div {...applyHost(undefined, undefined, styles.sample)}>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuLink active dense href="#inicio">
            <HouseIcon aria-hidden="true" />
            Inicio
          </SidebarMenuLink>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuLink dense href="#competiciones">
            <TrophyIcon aria-hidden="true" />
            Competiciones
          </SidebarMenuLink>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuLink
            aria-disabled="true"
            dense
            href="#stub"
            {...applyHost(undefined, undefined, styles.disabledLink)}
          >
            <TicketIcon aria-hidden="true" />
            Invitaciones
          </SidebarMenuLink>
        </SidebarMenuItem>
      </SidebarMenu>
    </div>
  ),
  parameters: { layout: "centered" },
};

export const Density: Story = {
  render: () => (
    <div {...applyHost(undefined, undefined, styles.density)}>
      <div {...applyHost(undefined, undefined, styles.densityPanel)}>
        <p {...applyHost(undefined, undefined, typography.label, styles.densityLabel)}>
          Universal · 44 px
        </p>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton active>
              <HouseIcon aria-hidden="true" />
              Inicio
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <TrophyIcon aria-hidden="true" />
              Competiciones
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </div>
      <div {...applyHost(undefined, undefined, styles.densityPanel)}>
        <p {...applyHost(undefined, undefined, typography.label, styles.densityLabel)}>
          Dense · 36 px en desktop
        </p>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton active dense>
              <HouseIcon aria-hidden="true" />
              Inicio
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton dense>
              <TrophyIcon aria-hidden="true" />
              Competiciones
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </div>
    </div>
  ),
  parameters: { layout: "padded" },
};

export const CollapsedRail: Story = {
  name: "Collapsed icon rail",
  render: () => <DemoShell collapsed dense />,
};

export const Expanded: Story = {
  render: () => <DemoShell collapsed={false} dense />,
};

export const IndependentScroll: Story = {
  name: "Independent scroll regions",
  render: () => <DemoShell dense longContent />,
};

export const WithMobileRail: Story = {
  name: "With SidebarRail",
  render: () => <DemoShell dense showRail />,
};

export const EmptyQueue: Story = {
  name: "Empty queue content",
  render: () => (
    <SidebarProvider data-density="dense" {...applyHost(undefined, undefined, styles.provider)}>
      <Sidebar aria-label="Tareas" {...applyHost(undefined, undefined, styles.sidebar)}>
        <SidebarHeader {...applyHost(undefined, undefined, styles.headerExpanded)}>
          <DemoAccountRow dense shortName="David" />
          <DemoWorkspaceSelector dense />
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
                <HouseIcon aria-hidden="true" />
                Inicio
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div {...applyHost(undefined, undefined, styles.insetPad)}>
          Estado vacío de la cola en content.
        </div>
      </SidebarInset>
    </SidebarProvider>
  ),
};
