"use client";

import { useEffect, type DependencyList, type EffectCallback } from "react";

/**
 * Synchronize with an external system only — DOM APIs, focus, timers, AppState,
 * SecureStore/SplashScreen, i18n libraries, subscriptions, and imperative widgets.
 *
 * Data loading and fetching are forbidden here. Use TanStack Query on web and
 * mobile. Prefer, in order: derive during render, event handlers, `key` to reset
 * state, `useSyncExternalStore` for external stores, then this wrapper.
 *
 * Raw `useEffect` / `useLayoutEffect` are banned in apps/web, apps/mobile, and
 * packages/ui. This module is the only allowed effect wrapper.
 *
 * Always pass the full reactive dependency list. Do not wrap this as a
 * mount-only helper that drops `deps` (the `useMountEffect` bug).
 */
export function useExternalSync(effect: EffectCallback, deps: DependencyList): void {
  useEffect(effect, deps);
}
