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

/**
 * Runs `listener` when another tab announces an identity change. Delivery is best effort:
 * a hidden or suspended tab may hear it late or never.
 */
export function listenForIdentityChanges(listener: () => void): () => void {
  const channel = new BroadcastChannel(IDENTITY_CHANNEL);
  channel.onmessage = () => listener();
  return () => channel.close();
}

/** Keeps this tab's cache in step with identity changes made in other tabs. */
export function useForgetIdentityFromOtherTabs(queryClient: QueryClient): void {
  useEffect(() => listenForIdentityChanges(() => forgetCachedIdentity(queryClient)), [queryClient]);
}
