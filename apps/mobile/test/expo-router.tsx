import { useEffect, useSyncExternalStore, type ComponentType } from "react";

/**
 * In-memory stand-in for the subset of Expo Router the app uses. Screen tests mount the real
 * `app/` route files through `TestRouter`; navigation changes which route file is rendered.
 */

type RouteParams = Record<string, string>;
type Location = { readonly pathname: string; readonly params: RouteParams };
type RouteEntry = {
  readonly segments: readonly string[];
  readonly grouped: boolean;
  readonly component: ComponentType;
};

let routes: readonly RouteEntry[] = [];
let stack: Location[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function splitPath(path: string): string[] {
  return path.split("/").filter(Boolean);
}

function withoutGroups(segments: readonly string[]): string[] {
  return segments.filter((segment) => !/^\(.+\)$/.test(segment));
}

/** `files` keys are paths relative to `app/`, such as `(auth)/login.tsx` or `orgs/[orgId]/index.tsx`. */
export function registerRoutes(files: Record<string, { default: ComponentType }>) {
  routes = Object.entries(files)
    .filter(([file]) => !file.startsWith("_"))
    .map(([file, module]) => {
      const segments = splitPath(file.replace(/\.tsx$/, ""));
      if (segments.at(-1) === "index") segments.pop();
      return {
        segments,
        grouped: segments.some((s) => s.startsWith("(")),
        component: module.default,
      };
    });
}

function match(entry: RouteEntry, wanted: readonly string[], keepGroups: boolean) {
  const pattern = keepGroups ? entry.segments : withoutGroups(entry.segments);
  if (pattern.length !== wanted.length) return null;
  const params: RouteParams = {};
  for (const [index, segment] of pattern.entries()) {
    const value = wanted[index]!;
    const dynamic = /^\[(.+)\]$/.exec(segment);
    if (dynamic) params[dynamic[1]!] = decodeURIComponent(value);
    else if (segment !== value) return null;
  }
  return params;
}

function resolve(pathname: string) {
  const segments = splitPath(pathname);
  for (const keepGroups of [true, false]) {
    const candidates = keepGroups ? routes : [...routes].sort((a, b) => +a.grouped - +b.grouped);
    for (const entry of candidates) {
      const params = match(entry, keepGroups ? segments : withoutGroups(segments), keepGroups);
      if (params) return { component: entry.component, params };
    }
  }
  throw new Error(`No app route matches ${pathname}`);
}

/** The app only navigates with string hrefs (see `nativeRoute`). */
function parseHref(href: string): Location {
  const url = new URL(href, "app://futrob");
  return { pathname: url.pathname, params: Object.fromEntries(url.searchParams) };
}

const router = {
  push(href: string) {
    stack = [...stack, parseHref(href)];
    emit();
  },
  replace(href: string) {
    stack = [...stack.slice(0, -1), parseHref(href)];
    emit();
  },
  back() {
    stack = stack.slice(0, -1);
    emit();
  },
  setParams(params: Record<string, string | undefined>) {
    const current = stack.at(-1)!;
    const next = { ...current.params };
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined) delete next[key];
      else next[key] = value;
    }
    stack = [...stack.slice(0, -1), { ...current, params: next }];
    emit();
  },
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function useLocation(): Location {
  return useSyncExternalStore(subscribe, () => stack.at(-1)!);
}

export function useRouter() {
  return router;
}

export function useLocalSearchParams() {
  const location = useLocation();
  return { ...resolve(location.pathname).params, ...location.params };
}

export function useFocusEffect(effect: () => void | (() => void)) {
  useEffect(effect, [effect]);
}

export function Stack() {
  return null;
}
Stack.Screen = function StackScreen() {
  return null;
};

/** Renders the route on top of the stack; a new stack entry mounts a fresh screen. */
export function TestRouter({ initialHref }: { initialHref: string }) {
  if (stack.length === 0) stack = [parseHref(initialHref)];
  const location = useLocation();
  const { component: Screen } = resolve(location.pathname);
  return <Screen key={`${stack.length}:${location.pathname}`} />;
}

export function currentLocation(): Location | undefined {
  return stack.at(-1);
}

export function resetTestRouter() {
  stack = [];
  emit();
}
