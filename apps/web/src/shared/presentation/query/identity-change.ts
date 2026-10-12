import { useEffect } from "react";
import type { QueryClient } from "@tanstack/react-query";

const IDENTITY_CHANNEL = "futrob:identity-changed";

/**
 * Drops every cached answer so no screen renders data read for another actor. Active
 * queries go back to loading and refetch under the session cookie the tab now shares.
 */
function forgetCachedIdentity(queryClient: QueryClient): void {
  void queryClient.resetQueries();
}

/** Call after sign-in, sign-up or sign-out; every open tab of the app forgets its cache. */
export function announceIdentityChange(queryClient: QueryClient): void {
  forgetCachedIdentity(queryClient);
  const channel = new BroadcastChannel(IDENTITY_CHANNEL);
  channel.postMessage("changed");
  channel.close();
}

/** Keeps this tab's cache in step with identity changes made in other tabs. */
export function useForgetIdentityFromOtherTabs(queryClient: QueryClient): void {
  useEffect(() => {
    const channel = new BroadcastChannel(IDENTITY_CHANNEL);
    channel.onmessage = () => forgetCachedIdentity(queryClient);
    return () => channel.close();
  }, [queryClient]);
}
