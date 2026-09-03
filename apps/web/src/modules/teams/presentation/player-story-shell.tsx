import { useMemo, type ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { applyProps, typography } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { configurePlayerStory, type PlayerStoryState } from "./player-story-client.ts";

const styles = stylex.create({
  stub: {
    padding: "1.5rem",
    color: colors.mutedForeground,
  },
  frame: {
    minHeight: "100svh",
    backgroundColor: colors.background,
    paddingInline: "1.5rem",
    paddingBlock: "1.5rem",
  },
});

export type PlayerStoryRoute = {
  readonly path: string;
  readonly component: () => ReactElement;
};

export function PlayerStoryStub({ label }: { readonly label: string }) {
  return <p {...applyProps(undefined, undefined, typography.body, styles.stub)}>{label}</p>;
}

function hydratePlayerStoryQueries(client: QueryClient, state: PlayerStoryState): void {
  if (state.profile !== "pending" && state.profile !== "error") {
    client.setQueryData(queryKeys.players.me(), state.profile);
  }
  if (state.teams !== "pending" && state.teams !== "error") {
    client.setQueryData(queryKeys.players.meTeams(), state.teams);
  }
}

export function PlayerStoryShell({
  state,
  initialPath,
  routes,
}: {
  readonly state: PlayerStoryState;
  readonly initialPath: string;
  readonly routes: readonly PlayerStoryRoute[];
}) {
  const client = useMemo(() => {
    configurePlayerStory(state);
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity, gcTime: Infinity },
        mutations: { retry: false },
      },
    });
    hydratePlayerStoryQueries(queryClient, state);
    return queryClient;
  }, [state]);

  const router = useMemo(() => {
    const rootRoute = createRootRoute({
      component: Outlet,
    });
    const childrenRoutes = routes.map((route) =>
      createRoute({
        getParentRoute: () => rootRoute,
        path: route.path,
        component: route.component,
      }),
    );
    return createRouter({
      routeTree: rootRoute.addChildren(childrenRoutes),
      history: createMemoryHistory({ initialEntries: [initialPath] }),
    });
  }, [initialPath, routes]);

  return (
    <QueryClientProvider client={client}>
      <I18nProvider initialLocale="es" persistLocale={async () => undefined}>
        <div {...applyProps(undefined, undefined, styles.frame)}>
          <RouterProvider router={router} />
        </div>
      </I18nProvider>
    </QueryClientProvider>
  );
}
