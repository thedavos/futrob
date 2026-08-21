"use client";

import { useNavigate } from "@tanstack/react-router";
import {
  Avatar,
  AvatarFallback,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  cn,
} from "@futrob/ui";
import { CaretDownIcon } from "@phosphor-icons/react";
import { authClient } from "@/modules/identity/auth-client.ts";
import { initialsFromName } from "@/shared/presentation/initials-from-name.ts";
import { accountNavItems } from "@/shared/presentation/shell/nav-registry.ts";

export function AccountMenu({ compact = false }: { readonly compact?: boolean }) {
  const session = authClient.useSession();
  const navigate = useNavigate();
  const user = session.data?.user;
  const name = user?.name?.trim() || user?.email || "Cuenta";
  const shortName = abbreviatedDisplayName(name);
  const items = accountNavItems();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Abrir menú de cuenta"
        render={
          <Button
            className={cn(
              "group min-w-0",
              compact ? "justify-center px-0" : "w-auto max-w-full justify-start px-1.5",
            )}
            dense
            size={compact ? "icon" : "default"}
            variant="ghost"
          />
        }
      >
        <span className={cn("flex min-w-0 items-center gap-2", compact && "gap-0")}>
          <Avatar className="size-6 shrink-0">
            <AvatarFallback className="text-xs! leading-none">
              {initialsFromName(name)}
            </AvatarFallback>
          </Avatar>
          {compact ? null : (
            <span className="flex min-w-0 items-center gap-1">
              <span className="truncate text-sm font-medium" title={name}>
                {shortName}
              </span>
              <CaretDownIcon
                aria-hidden="true"
                className="size-3 shrink-0 text-muted-foreground transition-transform duration-(--duration-normal) ease-(--ease-emphasized) group-aria-expanded:rotate-180"
                weight="bold"
              />
            </span>
          )}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56" side="bottom">
        {items.map((item) => (
          <DropdownMenuItem
            disabled={item.stub}
            key={item.id}
            onClick={() => {
              if (!item.stub) void navigate({ to: item.href });
            }}
          >
            {item.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            void authClient.signOut().then(() => {
              void navigate({ to: "/login", replace: true });
            });
          }}
        >
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
function abbreviatedDisplayName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "Cuenta";
  if (trimmed.includes("@")) {
    const local = trimmed.slice(0, trimmed.indexOf("@")) || trimmed;
    return local.length > 12 ? `${local.slice(0, 10)}…` : local;
  }
  const first = trimmed.split(/\s+/).find(Boolean) ?? trimmed;
  return first.length > 14 ? `${first.slice(0, 12)}…` : first;
}
