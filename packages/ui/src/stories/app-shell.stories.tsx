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
      className={collapsed ? undefined : "ml-auto shrink-0"}
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
  );
}

function AccountAndCollapseRow({ compact = false }: { readonly compact?: boolean }) {
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
              dense
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
                <span className="truncate text-sm font-medium">David</span>
                <CaretDownIcon
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
    <div className="flex items-center">
      <DropdownMenuLabel className="min-w-0 flex-1 py-1.5 pe-1">{title}</DropdownMenuLabel>
      <DropdownMenuItem
        aria-label={actionLabel}
        className="size-(--control-height-dense) min-h-(--control-height-dense) shrink-0 justify-center p-0 text-muted-foreground max-sm:size-(--control-height-touch) max-sm:min-h-(--control-height-touch)"
      >
        <PlusIcon aria-hidden="true" className="size-4" />
      </DropdownMenuItem>
    </div>
  );
}

function WorkspaceSelectorDemo() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button className="group w-full justify-between font-medium" dense variant="outline" />
        }
      >
        <span className="flex min-w-0 items-center gap-2">
          <TrophyIcon aria-hidden="true" className="size-4 shrink-0" />
          <span className="truncate">La Copa del Barrio</span>
        </span>
        <CaretDownIcon
          aria-hidden="true"
          className="size-4 shrink-0 transition-transform duration-(--duration-normal) ease-(--ease-emphasized) group-aria-expanded:rotate-180"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuGroup>
          <WorkspaceSectionHeader actionLabel="Crear competición" title="Competiciones" />
          <DropdownMenuItem>
            <TrophyIcon aria-hidden="true" className="size-4" />
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
    <SidebarProvider className="h-svh" data-density="dense" defaultCollapsed={false}>
      <Sidebar>
        <SidebarHeader className="gap-3">
          <AccountAndCollapseRow />
          <WorkspaceSelectorDemo />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Tareas</SidebarGroupLabel>
            <div className="rounded-lg border border-dashed border-border-strong px-3 py-4 text-center">
              <p className="text-sm font-medium">Sin tareas pendientes</p>
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
                <HouseIcon aria-hidden="true" className="size-4" />
                Inicio
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton dense>
                <TrophyIcon aria-hidden="true" className="size-4" />
                Competiciones
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton dense>
                <GameControllerIcon aria-hidden="true" className="size-4" />
                Clubes EA
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton dense>
                <TicketIcon aria-hidden="true" className="size-4" />
                Invitaciones
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-6">
          <h1 className="typo-heading flex-1 text-lg">Inicio</h1>
          <Button dense disabled variant="outline">
            Sync EA
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5 text-sm text-muted-foreground">
          <p>Contenido de la página con scroll independiente.</p>
          <div className="mt-4 space-y-2">
            {Array.from({ length: 24 }, (_, index) => (
              <p key={index}>Fila de contenido {index + 1}</p>
            ))}
          </div>
        </div>
        {showActionBar ? (
          <ActionBar>
            <ActionBarStart>
              <span className="typo-caption text-muted-foreground">Cambios sin guardar</span>
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
        className="h-svh"
        collapsed={collapsed}
        data-density="dense"
        onCollapsedChange={setCollapsed}
      >
        <Sidebar>
          <SidebarHeader className="items-center gap-2 p-2">
            <AccountAndCollapseRow compact />
          </SidebarHeader>
          <SidebarContent className="items-center p-2">
            <SidebarMenuButton aria-label="Tareas" className="justify-center px-0" dense>
              <CheckSquareOffsetIcon aria-hidden="true" />
            </SidebarMenuButton>
          </SidebarContent>
          <SidebarFooter className="items-center p-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton active aria-label="Inicio" className="justify-center px-0" dense>
                  <HouseIcon aria-hidden="true" />
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton aria-label="Competiciones" className="justify-center px-0" dense>
                  <TrophyIcon aria-hidden="true" />
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-5">
            <h1 className="typo-heading text-lg">Focus mode</h1>
          </header>
          <div className="flex-1 p-5 text-sm text-muted-foreground">
            Icon rail colapsado. Expandir restaura el selector y las tareas.
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  },
};
