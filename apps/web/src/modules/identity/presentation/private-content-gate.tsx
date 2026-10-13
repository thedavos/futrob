"use client";

import { Activity, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, Button, hasBrowserWindow } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { authClient } from "@/modules/identity/auth-client.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";

const styles = stylex.create({
  notice: {
    position: "fixed",
    inset: 0,
    zIndex: 100,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "1rem",
    paddingInline: "1.25rem",
    backgroundColor: colors.background,
    textAlign: "center",
  },
  message: {
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    color: colors.mutedForeground,
  },
});

/** Whose answers the cache holds, or `null` once the session is gone. */
type CacheOwner = string | null;

/** `confirming` covers a hidden tab and a visible one waiting for `get-session`. */
type GateStatus = "open" | "confirming" | "failed";

function initialStatus(): GateStatus {
  return hasBrowserWindow() && document.visibilityState === "hidden" ? "confirming" : "open";
}

/**
 * Shows private content only after this tab confirmed who the session belongs to.
 *
 * Another tab can sign in, sign up or sign out while this one is hidden, and the identity
 * notice may never reach a suspended tab. So hiding the tab hides private content, and
 * coming back asks `get-session` before showing it again. The same user gets the screen
 * back as it was; a different user, or none, gets an empty cache and a fresh tree.
 */
export function PrivateContentGate({ children }: Readonly<{ children: ReactNode }>) {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const session = authClient.useSession();
  const sessionUserId = session.data?.user.id ?? null;
  const [owner, setOwner] = useState<CacheOwner>(sessionUserId);
  const ownerRef = useRef<CacheOwner>(sessionUserId);
  const [status, setStatus] = useState<GateStatus>(initialStatus);
  const attempt = useRef(0);
  const focusBeforeHide = useRef<HTMLElement | null>(null);

  // Resets before the owner changes so the next tree never reads the previous user's answers.
  const adopt = useCallback(
    (next: CacheOwner) => {
      if (ownerRef.current === next) return;
      ownerRef.current = next;
      void queryClient.resetQueries();
      setOwner(next);
    },
    [queryClient],
  );

  const confirm = useCallback(async () => {
    const current = ++attempt.current;
    setStatus("confirming");
    const confirmed = await readSessionUserId();
    if (current !== attempt.current) return;
    if (confirmed === undefined) {
      setStatus("failed");
      return;
    }
    if (confirmed !== ownerRef.current) {
      adopt(confirmed);
      authClient.$store.notify("$sessionSignal");
    }
    setStatus("open");
  }, [adopt]);

  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        void confirm();
        return;
      }
      attempt.current++;
      const active = document.activeElement;
      focusBeforeHide.current = active instanceof HTMLElement ? active : null;
      // Commit now: the frame shown when the tab comes back must already hide the content.
      flushSync(() => setStatus("confirming"));
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [confirm]);

  // The session can also move on its own, e.g. after a sign-out broadcast from another tab.
  useEffect(() => {
    if (sessionUserId !== null) adopt(sessionUserId);
  }, [adopt, sessionUserId]);

  const open = status === "open" && sessionUserId !== null && sessionUserId === owner;

  useEffect(() => {
    if (!open) return;
    const previous = focusBeforeHide.current;
    focusBeforeHide.current = null;
    if (previous?.isConnected && document.activeElement === document.body) previous.focus();
  }, [open]);

  return (
    <>
      <Activity key={owner ?? "signed-out"} mode={open ? "visible" : "hidden"}>
        {children}
      </Activity>
      {status === "failed" ? (
        <div {...applyStyles(styles.notice)}>
          <p role="alert" {...applyStyles(styles.message)}>
            {t("auth.session.checkFailed")}
          </p>
          <Button type="button" variant="outline" onClick={() => void confirm()}>
            {t("common.retry")}
          </Button>
        </div>
      ) : open ? null : (
        <div aria-live="polite" {...applyStyles(styles.notice)}>
          <p {...applyStyles(styles.message)}>{t("auth.session.checking")}</p>
        </div>
      )}
    </>
  );
}

/** The confirmed user, `null` when signed out, `undefined` when the check itself failed. */
async function readSessionUserId(): Promise<string | null | undefined> {
  try {
    const { data, error } = await authClient.getSession();
    if (error) return error.status === 401 ? null : undefined;
    return data?.user.id ?? null;
  } catch {
    return undefined;
  }
}
