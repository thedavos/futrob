import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  CaretDown,
  CheckSquareOffset,
  GameController,
  House,
  Plus,
  Sidebar as SidebarExpandIcon,
  SidebarSimple,
  Ticket,
  Trophy,
} from "@phosphor-icons/react";
import { useState, type ReactNode } from "react";

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
      className={collapsed ? undefined : "ml-auto shrink-0"}
      dense
      onClick={toggleCollapsed}
      size="icon"
      variant="ghost"
    >
      {collapsed ? <SidebarExpandIcon aria-hidden="true" /> : <SidebarSimple aria-hidden="true" />}
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
    <div className={`flex w-full items-center gap-1 ${compact ? "flex-col" : ""}`}>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Abrir menú de cuenta"
          render={
            <Button
              className={
                compact
                  ? "group justify-center px-0"
                  : "group w-auto max-w-full justify-start px-1.5"
              }
              dense={dense}
              size={compact ? "icon" : "default"}
              variant="ghost"
            />
          }
        >
          <span className={`flex min-w-0 items-center gap-2 ${compact ? "gap-0" : ""}`}>
            <Avatar className="size-6 shrink-0">
              <AvatarFallback className="text-xs! leading-none">DV</AvatarFallback>
            </Avatar>
            {compact ? null : (
              <span className="flex min-w-0 items-center gap-1">
                <span className="truncate text-sm font-medium" title="David Vargas">
                  {shortName}
                </span>
                <CaretDown
                  aria-hidden="true"
                  className="size-3 shrink-0 text-muted-foreground transition-transform duration-(--duration-normal) ease-(--ease-emphasized) group-aria-expanded:rotate-180"
                  weight="bold"
                />
              </span>
            )}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
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

function DemoWorkspaceSelector({ dense = true }: { readonly dense?: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            className="group w-full justify-between font-medium"
            dense={dense}
            variant="outline"
          />
        }
      >
        <span className="flex min-w-0 items-center gap-2">
          <Trophy aria-hidden="true" className="size-4 shrink-0" />
          <span className="truncate">La Copa del Barrio</span>
        </span>
        <CaretDown
          aria-hidden="true"
          className="size-4 shrink-0 transition-transform duration-(--duration-normal) ease-(--ease-emphasized) group-aria-expanded:rotate-180"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Competiciones</DropdownMenuLabel>
          <DropdownMenuItem>
            <Trophy aria-hidden="true" className="size-4" />
            La Copa del Barrio
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Clubes EA</DropdownMenuLabel>
          <DropdownMenuItem>
            <Plus aria-hidden="true" className="size-4" />
            Asociar club
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Organizaciones</DropdownMenuLabel>
          <DropdownMenuItem>
            <Plus aria-hidden="true" className="size-4" />
            Crear organización
          </DropdownMenuItem>
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
      className="h-svh"
      collapsed={controlled ? collapsed : undefined}
      data-density={dense ? "dense" : undefined}
      defaultCollapsed={defaultCollapsed}
      onCollapsedChange={controlled ? setCollapsed : undefined}
    >
      {children ?? (
        <>
          <DemoSidebar dense={dense} longContent={longContent} />
          <SidebarInset>
            {showRail ? (
              <SidebarRail className="flex">
                <Button aria-label="Abrir navegación" dense size="icon" variant="outline">
                  <House aria-hidden="true" />
                </Button>
                <span className="truncate text-sm font-medium">Inicio</span>
              </SidebarRail>
            ) : null}
            <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
              <h1 className="typo-heading text-lg">Espacio personal</h1>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-5 text-sm text-muted-foreground">
              Contenido principal con scroll independiente.
              {longContent
                ? Array.from({ length: 30 }, (_, index) => (
                    <p className="mt-2" key={index}>
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
    <Sidebar aria-label="Navegación principal" className="flex">
      <SidebarHeader className={compact ? "items-center gap-2 p-2" : "gap-3"}>
        <DemoAccountRow compact={compact} dense={dense} />
        {compact ? null : <DemoWorkspaceSelector dense={dense} />}
      </SidebarHeader>
      {compact ? (
        <SidebarContent className="items-center p-2">
          <SidebarMenuButton
            aria-label="Cola de tareas"
            className="justify-center px-0"
            dense={dense}
          >
            <CheckSquareOffset aria-hidden="true" />
          </SidebarMenuButton>
        </SidebarContent>
      ) : (
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Cola</SidebarGroupLabel>
            <div className="rounded-lg border border-dashed border-border-strong px-3 py-4 text-center">
              <p className="text-sm font-medium text-foreground">Sin tareas pendientes</p>
              <p className="typo-caption text-muted-foreground">
                Las tareas del espacio activo aparecerán aquí.
              </p>
            </div>
            {longContent
              ? Array.from({ length: 20 }, (_, index) => (
                  <SidebarMenuButton dense={dense} key={index}>
                    <CheckSquareOffset aria-hidden="true" />
                    Tarea {index + 1}
                  </SidebarMenuButton>
                ))
              : null}
          </SidebarGroup>
        </SidebarContent>
      )}
      <SidebarFooter className={compact ? "items-center p-2" : undefined}>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              active
              aria-label="Inicio"
              className={compact ? "justify-center px-0" : undefined}
              dense={dense}
            >
              <House aria-hidden="true" />
              {compact ? null : "Inicio"}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              aria-label="Competiciones"
              className={compact ? "justify-center px-0" : undefined}
              dense={dense}
            >
              <Trophy aria-hidden="true" />
              {compact ? null : "Competiciones"}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              aria-label="Clubes EA"
              className={compact ? "justify-center px-0" : undefined}
              dense={dense}
            >
              <GameController aria-hidden="true" />
              {compact ? null : "Clubes EA"}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              aria-label="Invitaciones"
              className={compact ? "justify-center px-0" : undefined}
              dense={dense}
            >
              <Ticket aria-hidden="true" />
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
    <SidebarProvider className="h-svh" data-density="dense">
      <Sidebar aria-label="Regiones de la barra lateral" className="flex">
        <SidebarHeader className="gap-3">
          <p className="typo-caption text-muted-foreground">Header sticky</p>
          <DemoAccountRow dense />
          <DemoWorkspaceSelector dense />
        </SidebarHeader>
        <SidebarContent>
          <p className="typo-caption text-muted-foreground">Content con scroll</p>
          <SidebarGroup>
            <SidebarGroupLabel>Cola</SidebarGroupLabel>
            <div className="rounded-lg border border-dashed border-border-strong px-3 py-4 text-center">
              <p className="text-sm font-medium">Sin tareas pendientes</p>
            </div>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <p className="typo-caption px-2.5 text-muted-foreground">Footer sticky</p>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton active dense>
                <House aria-hidden="true" />
                Inicio
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div className="flex flex-1 items-center justify-center p-5 text-sm text-muted-foreground">
          Inset: header y footer de la sidebar no scrollean con el content.
        </div>
      </SidebarInset>
    </SidebarProvider>
  ),
};

export const HeaderAccountRow: Story = {
  name: "Header account and collapse",
  render: () => (
    <div className="mx-auto w-64 rounded-xl border border-border bg-surface p-3">
      <SidebarProvider className="h-auto overflow-visible" data-density="dense">
        <DemoAccountRow dense shortName="David" />
      </SidebarProvider>
    </div>
  ),
  parameters: { layout: "centered" },
};

export const HeaderWithSelector: Story = {
  name: "Header with context selector",
  render: () => (
    <div className="mx-auto w-64 rounded-xl border border-border bg-surface p-3">
      <SidebarProvider className="h-auto overflow-visible" data-density="dense">
        <div className="flex flex-col gap-3">
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
    <div className="mx-auto flex max-w-sm flex-col gap-6 rounded-xl border border-border bg-surface p-6">
      <div className="grid gap-2">
        <p className="typo-label text-muted-foreground">Default</p>
        <SidebarMenuButton>
          <House aria-hidden="true" />
          Inicio
        </SidebarMenuButton>
      </div>
      <div className="grid gap-2">
        <p className="typo-label text-muted-foreground">Active</p>
        <SidebarMenuButton active>
          <Trophy aria-hidden="true" />
          Competiciones
        </SidebarMenuButton>
      </div>
      <div className="grid gap-2">
        <p className="typo-label text-muted-foreground">Disabled</p>
        <SidebarMenuButton disabled title="Próximamente">
          <GameController aria-hidden="true" />
          Clubes EA
        </SidebarMenuButton>
      </div>
      <div className="grid gap-2">
        <p className="typo-label text-muted-foreground">Icon-only · aria-label</p>
        <SidebarMenuButton aria-label="Invitaciones" className="w-10 justify-center px-0" dense>
          <Ticket aria-hidden="true" />
        </SidebarMenuButton>
      </div>
    </div>
  ),
  parameters: { layout: "centered" },
};

export const MenuLink: Story = {
  name: "Menu link",
  render: () => (
    <div className="mx-auto w-64 rounded-xl border border-border bg-surface p-3">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuLink active dense href="#inicio">
            <House aria-hidden="true" />
            Inicio
          </SidebarMenuLink>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuLink dense href="#competiciones">
            <Trophy aria-hidden="true" />
            Competiciones
          </SidebarMenuLink>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuLink
            aria-disabled="true"
            className="pointer-events-none opacity-50"
            dense
            href="#stub"
          >
            <Ticket aria-hidden="true" />
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
    <div className="grid gap-8 p-6 md:grid-cols-2">
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="typo-label mb-3 text-muted-foreground">Universal · 44 px</p>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton active>
              <House aria-hidden="true" />
              Inicio
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <Trophy aria-hidden="true" />
              Competiciones
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </div>
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="typo-label mb-3 text-muted-foreground">Dense · 36 px en desktop</p>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton active dense>
              <House aria-hidden="true" />
              Inicio
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton dense>
              <Trophy aria-hidden="true" />
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
    <SidebarProvider className="h-svh" data-density="dense">
      <Sidebar aria-label="Cola vacía" className="flex">
        <SidebarHeader className="gap-3">
          <DemoAccountRow dense shortName="David" />
          <DemoWorkspaceSelector dense />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Cola</SidebarGroupLabel>
            <div className="rounded-lg border border-dashed border-border-strong px-3 py-4 text-center">
              <p className="text-sm font-medium text-foreground">Sin tareas pendientes</p>
              <p className="typo-caption text-muted-foreground">
                Las tareas del espacio activo aparecerán aquí.
              </p>
            </div>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton active dense>
                <House aria-hidden="true" />
                Inicio
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div className="p-5 text-sm text-muted-foreground">Estado vacío de la cola en content.</div>
      </SidebarInset>
    </SidebarProvider>
  ),
};
