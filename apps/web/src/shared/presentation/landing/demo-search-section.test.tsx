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
import { competitionPlatformForClub } from "./open-competitions-model.ts";

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

const OPEN_PATH = "/api/v1/public/competitions/explore";

function openCompetition(id: string, name: string, platform = "playstation") {
  return {
    competition: {
      id,
      organizationId: "org-1",
      name,
      status: "registration",
      modality: "fc-clubs",
      exploreListing: "listed",
      gameEdition: "FC 26",
      platform,
      region: "south-america",
      timeZone: "America/Lima",
      format: "league",
      teams: { min: 2, max: 8 },
      schedule: { startsOn: null, endsOn: null },
      cover: { kind: "preset", preset: "cup" },
      createdAt: "2026-11-01T00:00:00.000Z",
      updatedAt: "2026-11-01T00:00:00.000Z",
    },
    organization: { id: "org-1", name: "Liga Andina" },
    approvedTeamCount: 3,
  };
}

/** Club searches answer `response`; the open competitions list answers `open`. */
function stubSearch(
  response: () => Response | Promise<Response>,
  open: (url: string) => Response = () => Response.json({ items: [] }),
) {
  const fetchMock = vi.fn(async (url: string) =>
    url.startsWith(OPEN_PATH) ? open(url) : response(),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function clubSearchCalls(fetchMock: ReturnType<typeof stubSearch>) {
  return fetchMock.mock.calls.map(([url]) => url).filter((url) => !url.startsWith(OPEN_PATH));
}

function openCalls(fetchMock: ReturnType<typeof stubSearch>) {
  return fetchMock.mock.calls.map(([url]) => url).filter((url) => url.startsWith(OPEN_PATH));
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
    expect(clubSearchCalls(fetchMock)[0]).toContain("/api/v1/public/game-data/clubs/search?");
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

  it("searches what was typed before the page hydrated", async () => {
    const fetchMock = stubSearch(() => Response.json({ clubs: [FERA] }));
    renderSection();

    // Text typed before hydration sits in the DOM without ever reaching React state.
    const input = await screen.findByRole("searchbox", { name: "Nombre del club" });
    if (!(input instanceof HTMLInputElement)) throw new Error("searchbox is not an input");
    input.value = "Fera";
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));

    await findAnchor("Crear cuenta con este club");
    expect(
      new URL(clubSearchCalls(fetchMock)[0] ?? "", "https://futrob.test").searchParams.get("query"),
    ).toBe("Fera");
    expect(input).toHaveValue("Fera");
    expect(input).not.toHaveAttribute("aria-invalid", "true");
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
    const clubSearch = vi.fn(async (url: string) =>
      url.startsWith(OPEN_PATH)
        ? Response.json({ items: [] })
        : url.includes("platform=ps5")
          ? new Promise<Response>((resolve) => {
              answerPs5 = resolve;
            })
          : Response.json({ clubs: [FERA] }),
    );
    vi.stubGlobal("fetch", clubSearch);
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

  it("lists open competitions signed out and joins one through signup", async () => {
    stubSearch(
      () => Response.json({ clubs: [FERA] }),
      () => Response.json({ items: [openCompetition("c-open", "Copa Andina")] }),
    );
    renderSection();

    const join = await findAnchor("Unirme");
    expect(join).toHaveAccessibleName("Unirme a Copa Andina");
    expect(screen.getByText("Organiza Liga Andina")).toBeTruthy();
    expect(screen.getByText(/3 de 8 equipos/)).toBeTruthy();
    const signup = new URL(join.getAttribute("href") ?? "", "https://futrob.test");
    expect(signup.pathname).toBe("/signup");
    expect(handoffFromHref(signup.searchParams.get("redirectTo"))).toEqual({
      pathname: "/onboarding/review",
      handoff: { kind: "competition", competitionId: "c-open", club: null },
    });
  });

  it("joins with the picked club and narrows to its platform when it maps to one", async () => {
    const fetchMock = stubSearch(
      () => Response.json({ clubs: [{ ...FERA, platform: "ps5" }] }),
      () => Response.json({ items: [openCompetition("c-open", "Copa Andina")] }),
    );
    renderSection();
    await findAnchor("Unirme");

    await searchFor("Fera");

    const join = await findAnchor("Unirme con Fera Enjaulada");
    expect(openCalls(fetchMock).at(-1)).toBe(`${OPEN_PATH}?platform=playstation`);
    expect(
      screen.getByText("Competiciones de PlayStation que aceptan equipos ahora."),
    ).toBeTruthy();
    const redirectTo = new URL(join.getAttribute("href") ?? "", "https://futrob.test").searchParams;
    expect(handoffFromHref(redirectTo.get("redirectTo")).handoff).toEqual({
      kind: "competition",
      competitionId: "c-open",
      club: {
        providerKey: "ea-clubs",
        externalClubId: "10754",
        platform: "ps5",
        gameEdition: "fc27",
      },
    });
  });

  it("offers every platform when the club's platform has nothing open", async () => {
    const fetchMock = stubSearch(
      () => Response.json({ clubs: [{ ...FERA, platform: "xbox" }] }),
      (url) =>
        Response.json({
          items: url.includes("platform=") ? [] : [openCompetition("c-pc", "Liga PC", "pc")],
        }),
    );
    renderSection();
    await searchFor("Fera");

    fireEvent.click(await screen.findByRole("button", { name: "Ver todas las plataformas" }));

    expect(await findAnchor("Unirme con Fera Enjaulada")).toBeTruthy();
    expect(openCalls(fetchMock)).toContain(`${OPEN_PATH}?platform=xbox`);
    expect(openCalls(fetchMock).at(-1)).toBe(OPEN_PATH);
  });

  it("keeps the section with an empty state and recovers from a failed list", async () => {
    let fail = true;
    stubSearch(
      () => Response.json({ clubs: [] }),
      () =>
        fail
          ? Response.json(
              { code: "api.unavailable", messageKey: "errors.api.unavailable" },
              { status: 503 },
            )
          : Response.json({ items: [] }),
    );
    renderSection();

    expect(await screen.findByText("No pudimos cargar las inscripciones abiertas.")).toBeTruthy();
    fail = false;
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("No hay inscripciones abiertas ahora.")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Inscripciones abiertas" })).toBeTruthy();
  });
});

describe("competitionPlatformForClub", () => {
  it("filters only the EA platforms that map to a single competition platform", () => {
    expect(competitionPlatformForClub({ platform: "ps5" })).toBe("playstation");
    expect(competitionPlatformForClub({ platform: "xbox" })).toBe("xbox");
    expect(competitionPlatformForClub({ platform: "common-gen5" })).toBeNull();
    expect(competitionPlatformForClub({ platform: "nx" })).toBeNull();
    expect(competitionPlatformForClub({ platform: "unknown" })).toBeNull();
    expect(competitionPlatformForClub(null)).toBeNull();
  });
});
