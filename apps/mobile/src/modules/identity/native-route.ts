import type { Href } from "expo-router";

export function nativeRoute(route: string): Href {
  // SAFETY: Expo typedRoutes is disabled; callers use fixed app routes or encoded resource IDs.
  return route as Href;
}
