// @vitest-environment jsdom

import { QueryClient, QueryClientProvider, useQueries } from "@tanstack/react-query";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type { OnboardingPathDto } from "@futrob/api-contracts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { OnboardingFlowProvider } from "./onboarding-flow.tsx";
import { storyResumeDraftStore } from "./onboarding-story-draft.ts";
import { createFakeOnboardingGateway } from "./onboarding-story-router.tsx";
import { OnboardingReview } from "./steps/review-step.tsx";

const workspaceReads = [
  { queryKey: queryKeys.organizations.mine(), updated: "Membresía de Liga Norte" },
  { queryKey: queryKeys.players.me(), updated: "Cuenta de juego actualizada" },
  { queryKey: queryKeys.players.meTeams(), updated: "Equipo de la invitación" },
  { queryKey: queryKeys.competitions.mine(), updated: "Competición de la invitación" },
  {
    queryKey: queryKeys.authorization.effectiveAccess({ organizationId: "org-story" }),
    updated: "Acceso autorizado",
  },
];

const clients: QueryClient[] = [];

beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  for (const client of clients.splice(0)) client.clear();
  Reflect.deleteProperty(document, "startViewTransition");
  vi.restoreAllMocks();
});

function renderCompletion({
  path = "organization",
  failCompletion = false,
  readWorkspace = async (updated: string) => updated,
  readBeforeCompletion = false,
}: {
  path?: OnboardingPathDto;
  failCompletion?: boolean;
  readWorkspace?: (updated: string) => Promise<string>;
  readBeforeCompletion?: boolean;
} = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: false } },
  });
  clients.push(client);
  for (const { queryKey } of workspaceReads) client.setQueryData(queryKey, "Datos anteriores");
  const gateway = createFakeOnboardingGateway({
    path,
    currentStep: "review",
    failComplete: failCompletion,
  });
  const draftStore = storyResumeDraftStore(gateway.initialStatus);

  function WorkspaceReadback() {
    const reads = useQueries({
      queries: workspaceReads.map(({ queryKey, updated }) => ({
        queryKey,
        queryFn: () => readWorkspace(updated),
      })),
    });
    return (
      <ul aria-label="Datos del espacio">
        {reads.map((query, index) => (
          <li key={index}>
            {query.isError
              ? "No se pudo cargar el espacio"
              : typeof query.data === "string"
                ? query.data
                : null}
          </li>
        ))}
      </ul>
    );
  }

  const root = createRootRoute({
    component: () => (
      <I18nProvider initialLocale="es" persistLocale={async () => undefined}>
        <QueryClientProvider client={client}>
          <OnboardingFlowProvider
            gateway={gateway}
            initialStatus={gateway.initialStatus}
            draftStore={draftStore}
          >
            {readBeforeCompletion ? <WorkspaceReadback /> : null}
            <Outlet />
          </OnboardingFlowProvider>
        </QueryClientProvider>
      </I18nProvider>
    ),
  });
  const review = createRoute({
    getParentRoute: () => root,
    path: "/onboarding/review",
    component: OnboardingReview,
  });
  function Dashboard() {
    return (
      <main>
        <h1>Panel del espacio</h1>
        {!readBeforeCompletion ? <WorkspaceReadback /> : null}
      </main>
    );
  }
  const destinations = ["/orgs/$orgId", "/player", "/orgs/$orgId/competitions/$competitionId"].map(
    (routePath) =>
      createRoute({ getParentRoute: () => root, path: routePath, component: Dashboard }),
  );
  const router = createRouter({
    routeTree: root.addChildren([review, ...destinations]),
    history: createMemoryHistory({ initialEntries: ["/onboarding/review"] }),
  });
  render(<RouterProvider router={router} />);
  return { client, router, draftStore };
}

describe("leaving onboarding", () => {
  it.each([
    ["organization", "Crear organización", "/orgs/org-story"],
    ["player", "Entrar a mi espacio", "/player"],
    ["invitation", "Aceptar invitación", "/orgs/org-invited/competitions/competition-invited"],
  ] as const)("shows current workspace data after completing %s", async (path, label, pathname) => {
    const { router, draftStore } = renderCompletion({ path });
    fireEvent.click(await screen.findByRole("button", { name: label }));

    await screen.findByRole("heading", { name: "Panel del espacio" });
    for (const { updated } of workspaceReads) expect(await screen.findByText(updated)).toBeTruthy();
    expect(screen.queryByText("Datos anteriores")).toBeNull();
    expect(router.state.location.pathname).toBe(pathname);
    expect(draftStore.load()).toBeNull();
  });

  it("hands the old and new screens to the browser page transition", async () => {
    const captures: Array<{ before: boolean; after: boolean }> = [];
    const startViewTransition: Document["startViewTransition"] = (options) => {
      const update = typeof options === "function" ? options : options?.update;
      const before = screen.queryByRole("heading", { name: "Confirma tu configuración" }) !== null;
      const done = Promise.resolve()
        .then(update)
        .then(() => {
          captures.push({
            before,
            after: screen.queryByRole("heading", { name: "Panel del espacio" }) !== null,
          });
        });
      return {
        updateCallbackDone: done,
        ready: done,
        finished: done,
        skipTransition() {},
        types: new Set<string>(),
      };
    };
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value: startViewTransition,
    });
    renderCompletion();
    fireEvent.click(await screen.findByRole("button", { name: "Crear organización" }));

    await waitFor(() => expect(captures).toEqual([{ before: true, after: true }]));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("opens the dashboard while a previously mounted workspace refresh is still pending", async () => {
    const resolvers: Array<() => void> = [];
    renderCompletion({
      readBeforeCompletion: true,
      readWorkspace: (updated) => new Promise((resolve) => resolvers.push(() => resolve(updated))),
    });
    fireEvent.click(await screen.findByRole("button", { name: "Crear organización" }));

    expect(await screen.findByRole("heading", { name: "Panel del espacio" })).toBeTruthy();
    for (const resolve of resolvers) resolve();
    for (const { updated } of workspaceReads) expect(await screen.findByText(updated)).toBeTruthy();
  });

  it("keeps completion successful when a background workspace refresh fails", async () => {
    renderCompletion({
      readBeforeCompletion: true,
      readWorkspace: async () => {
        throw new Error("workspace unavailable");
      },
    });
    fireEvent.click(await screen.findByRole("button", { name: "Crear organización" }));

    expect(await screen.findByRole("heading", { name: "Panel del espacio" })).toBeTruthy();
    expect(await screen.findAllByText("No se pudo cargar el espacio")).toHaveLength(5);
    expect(screen.queryByRole("button", { name: "Crear organización" })).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("keeps the review and draft available when creation fails", async () => {
    const { client, draftStore } = renderCompletion({ failCompletion: true });
    fireEvent.click(await screen.findByRole("button", { name: "Crear organización" }));

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Panel del espacio" })).toBeNull();
    expect(screen.getByRole("button", { name: "Crear organización" })).not.toBeDisabled();
    expect(draftStore.load()?.draft.organizationName).toBe("Liga Norte");
    expect(client.getQueryData(queryKeys.organizations.mine())).toBe("Datos anteriores");
  });
});
