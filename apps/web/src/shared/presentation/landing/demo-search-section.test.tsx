// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  defaultParseSearch,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { QueryTestProvider } from "@/shared/presentation/query/query-test-utils.tsx";
import {
  onboardingHandoffFromSearch,
  onboardingHandoffSearchSchema,
} from "@/modules/identity/presentation/onboarding/onboarding-handoff.ts";
import { DemoSearchSection } from "./demo-search-section.tsx";

const session = vi.hoisted(() => ({
  isPending: false,
  data: null as { user: { id: string } } | null,
}));

vi.mock("@/modules/identity/auth-client.ts", () => ({
  authClient: {
    useSession: () => session,
  },
}));

const FERA = {
  providerKey: "ea-clubs",
  externalClubId: "10754",
  name: "Fera Enjaulada",
  platform: "common-gen5",
  gameEdition: "fc27",
  imageUrl: null,
};

beforeEach(() => {
  session.data = null;
  vi.stubGlobal("PointerEvent", MouseEvent);
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function stubSearch(response: () => Response) {
  const fetchMock = vi.fn(async (_url: string) => response());
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderSection() {
  const root = createRootRoute({ component: () => <Outlet /> });
  const home = createRoute({
    getParentRoute: () => root,
    path: "/",
    component: DemoSearchSection,
  });
  const signup = createRoute({
    getParentRoute: () => root,
    path: "/signup",
    component: () => <p>signup</p>,
  });
  const router = createRouter({
    routeTree: root.addChildren([home, signup]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return render(
    <I18nProvider initialLocale="es">
      <QueryTestProvider>
        <RouterProvider router={router} />
      </QueryTestProvider>
    </I18nProvider>,
  );
}

async function searchFor(query: string) {
  fireEvent.change(await screen.findByRole("searchbox", { name: "Nombre del club" }), {
    target: { value: query },
  });
  fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
}

/** `Button render={<Link />}` keeps the button role on the anchor, so find it by its text. */
async function findAnchor(name: string) {
  const anchor = (await screen.findByText(name)).closest("a");
  if (!anchor) throw new Error(`${name} is not a link`);
  return anchor;
}

function handoffFromHref(href: string | null) {
  const url = new URL(href ?? "", "https://futrob.test");
  return {
    pathname: url.pathname,
    handoff: onboardingHandoffFromSearch(
      onboardingHandoffSearchSchema.parse(defaultParseSearch(url.search)),
    ),
  };
}

describe("DemoSearchSection", () => {
  it("searches signed out and signs up with the first club already chosen", async () => {
    const fetchMock = stubSearch(() => Response.json({ clubs: [FERA] }));
    renderSection();

    await searchFor("Fera");

    const cta = await findAnchor("Crear cuenta con este club");
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/api/v1/public/game-data/clubs/search?");
    expect(screen.getByRole("button", { name: /Fera Enjaulada/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const signup = new URL(cta.getAttribute("href") ?? "", "https://futrob.test");
    expect(signup.pathname).toBe("/signup");
    const redirectTo = signup.searchParams.get("redirectTo");
    expect(handoffFromHref(redirectTo)).toEqual({
      pathname: "/onboarding/club",
      handoff: {
        kind: "club",
        locator: {
          providerKey: "ea-clubs",
          externalClubId: "10754",
          platform: "common-gen5",
          gameEdition: "fc27",
        },
      },
    });
    expect(await findAnchor("¿Organizas un torneo? Crea tu competición")).toHaveAttribute(
      "href",
      "/signup",
    );
  });

  it("sends a signed-in visitor straight to onboarding with the club", async () => {
    session.data = { user: { id: "user-1" } };
    stubSearch(() => Response.json({ clubs: [FERA] }));
    renderSection();

    await searchFor("Fera");

    const cta = await findAnchor("Crear cuenta con este club");
    expect(handoffFromHref(cta.getAttribute("href")).pathname).toBe("/onboarding/club");
  });

  it("drops the chosen club while another platform is searched", async () => {
    let answerPs5: (response: Response) => void = () => undefined;
    const fetchMock = vi.fn(async (url: string) =>
      url.includes("platform=ps5")
        ? new Promise<Response>((resolve) => {
            answerPs5 = resolve;
          })
        : Response.json({ clubs: [FERA] }),
    );
    vi.stubGlobal("fetch", fetchMock);
    renderSection();
    await searchFor("Fera");
    await findAnchor("Crear cuenta con este club");

    fireEvent.click(screen.getByRole("radio", { name: "PlayStation 5" }));

    expect(await screen.findByRole("button", { name: "Buscando…" })).toBeDisabled();
    expect(screen.queryByText("Crear cuenta con este club")).toBeNull();

    answerPs5(Response.json({ clubs: [{ ...FERA, platform: "ps5" }] }));
    const cta = await findAnchor("Crear cuenta con este club");
    const redirectTo = new URL(cta.getAttribute("href") ?? "", "https://futrob.test").searchParams;
    expect(handoffFromHref(redirectTo.get("redirectTo")).handoff).toMatchObject({
      locator: { platform: "ps5" },
    });
  });

  it("says so when the platform has no club with that name", async () => {
    stubSearch(() => Response.json({ clubs: [] }));
    renderSection();

    await searchFor("Nadie");

    expect(
      await screen.findByText(
        "Sin resultados en esa plataforma. Prueba con otra o revisa el nombre.",
      ),
    ).toBeTruthy();
    expect(screen.queryByText("Crear cuenta con este club")).toBeNull();
  });

  it("holds the search until the rate limit lets it retry", async () => {
    stubSearch(() =>
      Response.json(
        {
          code: "api.rate_limited",
          messageKey: "errors.api.rate_limited",
          retryAfterSeconds: 30,
        },
        { status: 429, headers: { "Retry-After": "30" } },
      ),
    );
    renderSection();

    await searchFor("Fera");

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("Alcanzaste el límite temporal de búsquedas.")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Reintentar en \d+ s/ })).toBeDisabled();
  });
});
