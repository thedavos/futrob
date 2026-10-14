"use client";

import { useEffect, type DependencyList, type EffectCallback } from "react";

/**
 * Synchronize with an external system only — DOM APIs, subscriptions, timers, and
 * imperative third-party widgets.
 *
 * Raw `useEffect` / `useLayoutEffect` are banned in apps/web, apps/mobile, and
 * packages/ui. Prefer, in order: derive during render, event handlers, `key` to
 * reset state, `useSyncExternalStore` for external stores, and TanStack Query
 * for server data. This module is the only allowed effect wrapper.
 *
 * Always pass the full reactive dependency list. Do not wrap this as a
 * mount-only helper that drops `deps` (the `useMountEffect` bug).
 */
export function useExternalSync(effect: EffectCallback, deps: DependencyList): void {
  useEffect(effect, deps);
}
