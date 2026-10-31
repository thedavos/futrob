"use client";

import { Activity, useCallback, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, hasBrowserWindow, useExternalSync } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { authClient } from "@/modules/identity/auth-client.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { listenForIdentityChanges } from "@/shared/presentation/query/identity-change.ts";
import { FailedScreen, PendingScreen } from "@/shared/presentation/status-screen.tsx";

const styles = stylex.create({
  // Nothing to read while the tab is hidden: covers the content without a message, so the
  // pending screen mounts (and starts its reveal delay) only once the tab is visible again.
  veil: {
    position: "fixed",
    inset: 0,
    zIndex: 100,
    backgroundColor: colors.background,
  },
});

/** Whose answers the cache holds, or `null` once the session is gone. */
type CacheOwner = string | null;

/** `hidden` is a hidden tab; `confirming` a visible one waiting for `get-session`. */
type GateStatus = "open" | "hidden" | "confirming" | "failed";

function initialStatus(): GateStatus {
  return hasBrowserWindow() && document.visibilityState === "hidden" ? "hidden" : "open";
}

/**
 * Shows private content only after this tab confirmed who the session belongs to.
 *
 * Another tab can sign in, sign up or sign out while this one is hidden, and the identity
 * notice may never reach a suspended tab. So hiding the tab hides private content, and
 * coming back (or hearing the notice) asks `get-session` before showing it again. The same
 * user gets the screen back as it was; a different user, or none, gets an empty cache and a
 * fresh tree.
 */
export function PrivateContentGate({ children }: Readonly<{ children: ReactNode }>) {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const session = authClient.useSession();
  const sessionUserId = session.data?.user.id ?? null;
  const [owner, setOwner] = useState<CacheOwner>(sessionUserId);
  const ownerRef = useRef<CacheOwner>(sessionUserId);
  const [status, setStatus] = useState<GateStatus>(initialStatus);
  // Closed because the tab was hidden, and no check started since.
  const awaitingVisible = useRef(status === "hidden");
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
    awaitingVisible.current = false;
    // A notice heard while hidden still checks, but behind the veil.
    setStatus(document.visibilityState === "visible" ? "confirming" : "hidden");
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
    setStatus(document.visibilityState === "visible" ? "open" : "hidden");
  }, [adopt]);

  useExternalSync(() => {
    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        void confirm();
        return;
      }
      attempt.current++;
      awaitingVisible.current = true;
      const active = document.activeElement;
      focusBeforeHide.current = active instanceof HTMLElement ? active : null;
      // Commit now: the frame shown when the tab comes back must already hide the content.
      flushSync(() => setStatus("hidden"));
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    const stopListening = listenForIdentityChanges(() => void confirm());
    // The tab may have come forward before this listener existed, and that event is gone.
    if (awaitingVisible.current && document.visibilityState === "visible") void confirm();
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      stopListening();
    };
  }, [confirm]);

  // The session can also move on its own, e.g. after a sign-out broadcast from another tab.
  useExternalSync(() => {
    if (sessionUserId !== null) adopt(sessionUserId);
  }, [adopt, sessionUserId]);

  const open = status === "open" && sessionUserId !== null && sessionUserId === owner;

  useExternalSync(() => {
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
        <FailedScreen
          description={t("auth.session.checkFailedDescription")}
          onRetry={() => void confirm()}
          placement="overlay"
          retryLabel={t("common.retry")}
          title={t("auth.session.checkFailed")}
        />
      ) : status === "hidden" ? (
        <div {...applyStyles(styles.veil)} />
      ) : open ? null : (
        <PendingScreen message={t("auth.session.checking")} placement="overlay" />
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
