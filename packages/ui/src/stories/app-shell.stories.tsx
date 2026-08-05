import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChevronDown, Gamepad2, Home, Settings, TicketCheck, Trophy } from "lucide-react";

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
} from "../components/sidebar";
import { Logo } from "../logo";

const meta = {
  title: "Patterns/App shell",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const SidebarWithGroups: Story = {
  render: () => (
    <SidebarProvider className="h-svh min-h-svh">
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2.5 px-1">
            <Logo className="h-7 w-auto" />
            <span className="font-semibold tracking-wide">Futrob</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>General</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton active dense>
                  <Home aria-hidden="true" className="size-4" />
                  Inicio
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton dense>
                  <Trophy aria-hidden="true" className="size-4" />
                  Competiciones
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton dense>
                  <Gamepad2 aria-hidden="true" className="size-4" />
                  Clubes EA
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton dense>
                  <TicketCheck aria-hidden="true" className="size-4" />
                  Invitaciones
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>Mi Competición</SidebarGroupLabel>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button className="w-full justify-between" dense variant="outline" />}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Trophy aria-hidden="true" className="size-4 shrink-0" />
                  <span className="truncate">La Copa del Barrio</span>
                </span>
                <ChevronDown aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
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
                    <Gamepad2 aria-hidden="true" className="size-4" />
                    Asociar club
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Organizaciones</DropdownMenuLabel>
                  <DropdownMenuItem>Crear organización</DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenuButton className="justify-between" dense>
            <span>Cuenta</span>
            <Settings aria-hidden="true" />
          </SidebarMenuButton>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div className="border-b border-border px-5 py-4">
          <h1 className="typo-heading text-xl">Inicio</h1>
        </div>
        <div className="flex-1 p-5 text-sm text-muted-foreground">Contenido de la página.</div>
      </SidebarInset>
    </SidebarProvider>
  ),
};
