import {
  createContext,
  Fragment,
  useContext,
  useSyncExternalStore,
  type ComponentType,
  type ReactNode,
} from "react";
import { useExternalSync } from "@futrob/ui/hooks/use-external-sync";

export type Href = string;

/**
 * In-memory stand-in for the subset of Expo Router the app uses. Screen tests mount the real
 * `app/` route files through `TestRouter`; navigation changes which route file is rendered.
 * Nested `_layout.tsx` files (not the root one) wrap the routes below their folder and render
 * the route where they place a slot (`TabSlot` in `test/expo-router-ui.tsx`).
 */

type RouteParams = Record<string, string>;
type Location = { readonly pathname: string; readonly params: RouteParams };
type RouteEntry = {
  readonly segments: readonly string[];
  readonly grouped: boolean;
  readonly component: ComponentType;
};

type LayoutEntry = { readonly segments: readonly string[]; readonly component: ComponentType };

let routes: readonly RouteEntry[] = [];
let layouts: readonly LayoutEntry[] = [];
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
  layouts = Object.entries(files)
    .filter(([file]) => file !== "_layout.tsx" && file.endsWith("/_layout.tsx"))
    .map(([file, module]) => ({
      segments: splitPath(file).slice(0, -1),
      component: module.default,
    }));
  routes = Object.entries(files)
    .filter(([file]) => !file.split("/").some((segment) => segment.startsWith("_")))
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

function dynamicCount(entry: RouteEntry): number {
  return entry.segments.filter((segment) => /^\[.+\]$/.test(segment)).length;
}

function resolve(pathname: string) {
  const segments = splitPath(pathname);
  for (const keepGroups of [true, false]) {
    // Like Expo Router, a static segment beats a dynamic one (`player/(tabs)` over `(onboarding)/[step]`).
    const candidates = keepGroups
      ? routes
      : [...routes].sort((a, b) => dynamicCount(a) - dynamicCount(b) || +a.grouped - +b.grouped);
    for (const entry of candidates) {
      const params = match(entry, keepGroups ? segments : withoutGroups(segments), keepGroups);
      if (params) return { component: entry.component, params, segments: entry.segments };
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
  canGoBack() {
    return stack.length > 1;
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

/** In the test router the focused route is the only route, so global params equal local ones. */
export function useGlobalSearchParams() {
  return useLocalSearchParams();
}

export function useFocusEffect(effect: () => void | (() => void)) {
  useExternalSync(effect, [effect]);
}

export function Redirect({ href }: { href: string }) {
  const path = href;
  useExternalSync(() => {
    router.replace(path);
  }, [path]);
  return null;
}

export function Stack() {
  return null;
}
Stack.Screen = function StackScreen() {
  return null;
};

const SlotContext = createContext<ReactNode>(null);

/** What a layout's slot renders: the route (or inner layout) below it. */
export function useTestSlot(): ReactNode {
  return useContext(SlotContext);
}

export function usePathname(): string {
  return useLocation().pathname;
}

/** Renders the route on top of the stack; a new stack entry mounts a fresh screen. */
export function TestRouter({ initialHref }: { initialHref: string }) {
  if (stack.length === 0) stack = [parseHref(initialHref)];
  const location = useLocation();
  const { component: Screen, segments } = resolve(location.pathname);
  const wrapping = layouts
    .filter((layout) => layout.segments.every((segment, index) => segments[index] === segment))
    .sort((a, b) => b.segments.length - a.segments.length);
  const tree = wrapping.reduce<ReactNode>(
    (inner, { component: Layout }) => (
      <SlotContext.Provider value={inner}>
        <Layout />
      </SlotContext.Provider>
    ),
    <Screen />,
  );
  return <Fragment key={`${stack.length}:${location.pathname}`}>{tree}</Fragment>;
}

export function currentLocation(): Location | undefined {
  return stack.at(-1);
}

export function resetTestRouter() {
  stack = [];
  emit();
}
