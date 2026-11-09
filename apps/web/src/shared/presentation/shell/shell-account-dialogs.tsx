"use client";

import { useRouterState } from "@tanstack/react-router";
import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { FeedbackDialog } from "@/modules/identity/presentation/account/feedback-dialog.tsx";
import { SettingsDialog } from "@/modules/identity/presentation/account/settings-dialog.tsx";

export type ShellAccountDialog = "feedback" | "settings";

/** Where an account menu lives: the sidebar, or the navigation sheet on mobile. */
export type ShellAccountMenuSurface = "sidebar" | "sheet";

interface ShellAccountDialogsValue {
  /** Opens `dialog` and returns focus to `trigger` on `surface` when it closes. */
  readonly open: (
    dialog: ShellAccountDialog,
    trigger: HTMLElement | null,
    surface: ShellAccountMenuSurface,
  ) => void;
  /**
   * Registers a mounted account trigger. A layout change remounts every account menu while the
   * dialog is open; the one on the surface that opened it replaces the disconnected trigger.
   */
  readonly claimTrigger: (trigger: HTMLElement | null, surface: ShellAccountMenuSurface) => void;
}

const ShellAccountDialogsContext = createContext<ShellAccountDialogsValue | null>(null);

/**
 * Owns the account dialogs above the sidebar: saving a sidebar layout remounts the account
 * menu in its new region, and an open dialog has to outlive that move.
 */
export function ShellAccountDialogsProvider({ children }: { readonly children: ReactNode }) {
  const [dialog, setDialog] = useState<ShellAccountDialog | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const returnSurface = useRef<ShellAccountMenuSurface | null>(null);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const value = useMemo<ShellAccountDialogsValue>(
    () => ({
      open: (next, trigger, surface) => {
        returnFocus.current = trigger;
        returnSurface.current = surface;
        setDialog(next);
      },
      claimTrigger: (trigger, surface) => {
        if (trigger && surface === returnSurface.current && !returnFocus.current?.isConnected) {
          returnFocus.current = trigger;
        }
      },
    }),
    [],
  );

  function onOpenChange(open: boolean) {
    if (!open) setDialog(null);
  }

  return (
    <ShellAccountDialogsContext value={value}>
      {children}
      <FeedbackDialog
        onOpenChange={onOpenChange}
        open={dialog === "feedback"}
        pathname={pathname}
        returnFocus={returnFocus}
      />
      <SettingsDialog
        onOpenChange={onOpenChange}
        open={dialog === "settings"}
        returnFocus={returnFocus}
      />
    </ShellAccountDialogsContext>
  );
}

export function useShellAccountDialogs(): ShellAccountDialogsValue {
  const value = useContext(ShellAccountDialogsContext);
  if (!value) throw new Error("useShellAccountDialogs must be used within its provider");
  return value;
}
