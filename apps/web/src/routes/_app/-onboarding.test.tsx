// @vitest-environment jsdom

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import type { ResolvedOnboardingHandoff } from "@/modules/identity/presentation/onboarding/onboarding-handoff.ts";
import type { OnboardingBootstrap } from "@/modules/identity/server/get-onboarding-bootstrap.functions.ts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";

const server = vi.hoisted(() => ({
  getOnboardingBootstrap: vi.fn<() => Promise<OnboardingBootstrap>>(),
  getOnboardingHandoffClub: vi.fn(),
}));
const mounted = vi.hoisted(() => [] as string[]);

vi.mock("@/modules/identity/server/get-onboarding-bootstrap.functions.ts", () => server);
vi.mock("@/modules/identity/auth-client.ts", () => ({
  authClient: { useSession: () => ({ data: { user: { id: "user-1" } } }) },
}));
vi.mock("@/modules/identity/presentation/onboarding/onboarding-flow.tsx", () => ({
  OnboardingFlowProvider: ({
    handoff,
    children,
  }: {
    handoff: ResolvedOnboardingHandoff | null;
    children: ReactNode;
  }) => {
    const shown =
      handoff?.kind === "club" ? `club ${handoff.club?.externalClubId ?? "none"}` : "no handoff";
    mounted.push(shown);
    return (
      <>
        <p>{shown}</p>
        {children}
      </>
    );
  },
}));

const { Route } = await import("./onboarding.tsx");

const BOOTSTRAP: OnboardingBootstrap = {
  status: { completed: false } as OnboardingBootstrap["status"],
  destination: null,
};

beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  mounted.length = 0;
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

/** The real `/_app/onboarding` loader and layout under the same route id, beside a page to leave to. */
function renderRouter() {
  const root = createRootRoute({ component: () => <Outlet /> });
  const app = createRoute({ getParentRoute: () => root, id: "_app" });
  // Typed against the app's registered tree, so loosen them for this smaller one.
  const real = Route.options as unknown as Parameters<typeof createRoute>[0];
  const onboarding = createRoute({
    getParentRoute: () => app,
    path: "onboarding",
    validateSearch: real.validateSearch,
    loader: real.loader,
    shouldReload: real.shouldReload,
    component: real.component,
  });
  const away = createRoute({
    getParentRoute: () => root,
    path: "/away",
    component: () => <p>away</p>,
  });
  const router = createRouter({
    routeTree: root.addChildren([app.addChildren([onboarding]), away]),
    history: createMemoryHistory({
      initialEntries: ["/onboarding?club=10754&platform=common-gen5&edition=fc27"],
    }),
  });
  render(
    <I18nProvider initialLocale="es">
      <RouterProvider router={router} />
    </I18nProvider>,
  );
  return router;
}

describe("/_app/onboarding", () => {
  it("does not hand a consumed club off again when the visitor comes back", async () => {
    server.getOnboardingBootstrap.mockResolvedValue(BOOTSTRAP);
    server.getOnboardingHandoffClub.mockResolvedValue({
      providerKey: "ea-clubs",
      externalClubId: "10754",
      name: "Fera Enjaulada",
      platform: "common-gen5",
      gameEdition: "fc27",
      imageUrl: null,
    });
    const router = renderRouter();
    expect(await screen.findByText("club 10754")).toBeInTheDocument();

    await act(() => router.navigate({ href: "/away" }));
    await screen.findByText("away");
    mounted.length = 0;

    let finishBootstrap: (bootstrap: OnboardingBootstrap) => void = () => undefined;
    server.getOnboardingBootstrap.mockReturnValue(
      new Promise((resolve) => {
        finishBootstrap = resolve;
      }),
    );
    let comeBack: Promise<void> = Promise.resolve();
    act(() => {
      comeBack = router.navigate({ href: "/onboarding" });
    });
    await act(async () => {
      finishBootstrap(BOOTSTRAP);
      await comeBack;
    });

    expect(await screen.findByText("no handoff")).toBeInTheDocument();
    expect(mounted).not.toContain("club 10754");

    server.getOnboardingBootstrap.mockResolvedValue(BOOTSTRAP);
    server.getOnboardingHandoffClub.mockResolvedValue({
      providerKey: "ea-clubs",
      externalClubId: "20811",
      name: "Real Mística",
      platform: "common-gen5",
      gameEdition: "fc27",
      imageUrl: null,
    });
    await act(() => router.navigate({ href: "/away" }));
    await act(() =>
      router.navigate({ href: "/onboarding?club=20811&platform=common-gen5&edition=fc27" }),
    );
    expect(await screen.findByText("club 20811")).toBeInTheDocument();
  });
});
