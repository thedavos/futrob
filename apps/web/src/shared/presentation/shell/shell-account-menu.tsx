"use client";

import { useNavigate } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  Avatar,
  AvatarFallback,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/public.stylex";
import { CaretDownIcon } from "@phosphor-icons/react";
import { authClient } from "@/modules/identity/auth-client.ts";
import { initialsFromName } from "@/shared/presentation/initials-from-name.ts";
import { accountNavItems } from "@/shared/presentation/shell/nav-registry.ts";

const styles = stylex.create({
  triggerCompact: {
    minWidth: 0,
    justifyContent: "center",
    paddingInline: 0,
  },
  triggerExpanded: {
    minWidth: 0,
    width: "auto",
    maxWidth: "100%",
    justifyContent: "flex-start",
    paddingInline: "0.375rem",
  },
  row: {
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    gap: "0.5rem",
  },
  rowCompact: {
    gap: 0,
  },
  avatar: {
    width: "1.5rem",
    height: "1.5rem",
    flexShrink: 0,
  },
  fallback: {
    fontSize: "0.75rem",
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
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    fontWeight: 500,
  },
  caret: {
    width: "0.75rem",
    height: "0.75rem",
    flexShrink: 0,
    color: colors.mutedForeground,
    transitionProperty: "transform",
    transitionDuration: "var(--duration-normal)",
    transitionTimingFunction: "var(--ease-emphasized)",
  },
  menu: {
    width: "14rem",
  },
});

export function AccountMenu({ compact = false }: { readonly compact?: boolean }) {
  const session = authClient.useSession();
  const navigate = useNavigate();
  const user = session.data?.user;
  const name = user?.name?.trim() || user?.email || "Cuenta";
  const shortName = abbreviatedDisplayName(name);
  const items = accountNavItems();
  const trigger = applyStyles(compact ? styles.triggerCompact : styles.triggerExpanded);
  const avatar = applyStyles(styles.avatar);
  const fallback = applyStyles(styles.fallback);
  const caret = applyStyles(styles.caret);
  const menu = applyStyles(styles.menu);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Abrir menú de cuenta"
        render={
          <Button
            className={trigger.className}
            dense
            size={compact ? "icon" : "default"}
            style={trigger.style}
            variant="ghost"
          />
        }
      >
        <span {...applyStyles(styles.row, compact && styles.rowCompact)}>
          <Avatar className={avatar.className} style={avatar.style}>
            <AvatarFallback className={fallback.className} style={fallback.style}>
              {initialsFromName(name)}
            </AvatarFallback>
          </Avatar>
          {compact ? null : (
            <span {...applyStyles(styles.nameRow)}>
              <span title={name} {...applyStyles(styles.name)}>
                {shortName}
              </span>
              <CaretDownIcon
                aria-hidden="true"
                className={caret.className}
                data-caret="expand"
                style={caret.style}
                weight="bold"
              />
            </span>
          )}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className={menu.className}
        side="bottom"
        style={menu.style}
      >
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
