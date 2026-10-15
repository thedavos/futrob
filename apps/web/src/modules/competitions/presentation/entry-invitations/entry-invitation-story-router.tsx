import { useMemo } from "react";
import type { Decorator } from "@storybook/react-vite";
import {
  RouterContextProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";

/**
 * Router context for the invitation views' links (`/`, `/signup`, `/login`, `/player`). The
 * story renders synchronously inside it, so plays can query the DOM right away.
 */
export const withEntryInvitationRouter: Decorator = (Story) => {
  const router = useMemo(() => {
    const rootRoute = createRootRoute();
    const stub = (path: string) => createRoute({ getParentRoute: () => rootRoute, path });
    return createRouter({
      routeTree: rootRoute.addChildren([
        stub("/"),
        stub("/signup"),
        stub("/login"),
        stub("/player"),
      ]),
      history: createMemoryHistory({ initialEntries: ["/"] }),
    });
  }, []);
  return (
    <RouterContextProvider router={router}>
      <Story />
    </RouterContextProvider>
  );
};
