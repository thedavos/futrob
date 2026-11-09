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

interface ShellAccountDialogsValue {
  /** Opens `dialog` and returns focus to `trigger` when it closes. */
  readonly open: (dialog: ShellAccountDialog, trigger: HTMLElement | null) => void;
  /**
   * Focus returns here on close. A layout change remounts the account menu while the dialog is
   * open, so the menu that replaces a disconnected trigger adopts it.
   */
  readonly returnFocus: RefObject<HTMLElement | null>;
}

const ShellAccountDialogsContext = createContext<ShellAccountDialogsValue | null>(null);

/**
 * Owns the account dialogs above the sidebar: saving a sidebar layout remounts the account
 * menu in its new region, and an open dialog has to outlive that move.
 */
export function ShellAccountDialogsProvider({ children }: { readonly children: ReactNode }) {
  const [dialog, setDialog] = useState<ShellAccountDialog | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const value = useMemo<ShellAccountDialogsValue>(
    () => ({
      open: (next, trigger) => {
        returnFocus.current = trigger;
        setDialog(next);
      },
      returnFocus,
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
