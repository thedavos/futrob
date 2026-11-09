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
  readonly open: (dialog: ShellAccountDialog) => void;
  /** Focus returns here on close; the account menu that remains mounted claims it. */
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
  const value = useMemo(() => ({ open: setDialog, returnFocus }), []);

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
