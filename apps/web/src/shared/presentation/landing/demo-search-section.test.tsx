// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

/** Club searches answer `response`; the open competitions search answers `open`. */
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

async function searchFor(query: string, field = "Nombre del club") {
  fireEvent.change(await screen.findByRole("searchbox", { name: field }), {
    target: { value: query },
  });
  fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
}

async function choose(user: ReturnType<typeof userEvent.setup>, select: RegExp, option: string) {
  await user.click(await screen.findByRole("combobox", { name: select }));
  await user.click(await screen.findByRole("option", { name: option }));
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
  it("searches clubs signed out and signs up with the club already chosen", async () => {
    const fetchMock = stubSearch(() => Response.json({ clubs: [FERA] }));
    renderSection();

    expect(
      await screen.findByText("Datos en vivo de EA SPORTS FC Clubs. Buscar no requiere cuenta."),
    ).toBeTruthy();
    await searchFor("Fera");

    const cta = await findAnchor("Crear cuenta");
    expect(cta).toHaveAccessibleName("Crear cuenta con Fera Enjaulada");
    expect(screen.getByText("1 club en Cross-gen")).toBeTruthy();
    expect(clubSearchCalls(fetchMock)[0]).toContain("/api/v1/public/game-data/clubs/search?");
    // Clubs never load the competition list.
    expect(openCalls(fetchMock)).toEqual([]);
    expect(await findAnchor("Crea tu competición")).toBeTruthy();
    const signup = new URL(cta.getAttribute("href") ?? "", "https://futrob.test");
    expect(signup.pathname).toBe("/signup");
    expect(handoffFromHref(signup.searchParams.get("redirectTo"))).toEqual({
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
  });

  it("offers up to ten clubs found, each with its EA id and its own sign-up", async () => {
    const clubs = Array.from({ length: 11 }, (_, index) => ({
      ...FERA,
      externalClubId: String(100 + index),
      name: `Fera ${index}`,
    }));
    stubSearch(() => Response.json({ clubs }));
    renderSection();

    await searchFor("Fera");

    expect(await screen.findByText("10 clubes en Cross-gen")).toBeTruthy();
    const list = screen.getByRole("list", { name: "Clubes encontrados" });
    expect(within(list).getAllByText("Crear cuenta")).toHaveLength(10);
    expect(within(list).getByText("ID EA 100")).toBeTruthy();
    expect(within(list).getByText("ID EA 109")).toBeTruthy();
    expect(within(list).queryByText("Fera 10")).toBeNull();
  });

  it("searches what was typed before the page hydrated", async () => {
    const fetchMock = stubSearch(() => Response.json({ clubs: [FERA] }));
    renderSection();

    // Text typed before hydration sits in the DOM without ever reaching React state.
    const input = await screen.findByRole("searchbox", { name: "Nombre del club" });
    if (!(input instanceof HTMLInputElement)) throw new Error("searchbox is not an input");
    input.value = "Fera";
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));

    await findAnchor("Crear cuenta");
    expect(
      new URL(clubSearchCalls(fetchMock)[0] ?? "", "https://futrob.test").searchParams.get("query"),
    ).toBe("Fera");
    expect(input).toHaveValue("Fera");
    expect(input).not.toHaveAttribute("aria-invalid", "true");
  });

  it("asks for a club name before searching EA", async () => {
    const fetchMock = stubSearch(() => Response.json({ clubs: [FERA] }));
    renderSection();

    fireEvent.click(await screen.findByRole("button", { name: "Buscar" }));

    expect(await screen.findByText("Escribe el nombre del club.")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends a signed-in visitor straight to onboarding with the club", async () => {
    session.data = { user: { id: "user-1" } };
    stubSearch(() => Response.json({ clubs: [FERA] }));
    renderSection();

    await searchFor("Fera");

    const cta = await findAnchor("Crear cuenta");
    expect(handoffFromHref(cta.getAttribute("href")).pathname).toBe("/onboarding/club");
  });

  it("searches the same name again on another platform", async () => {
    const user = userEvent.setup();
    let answerPs5: (response: Response) => void = () => undefined;
    const clubSearch = vi.fn(async (url: string) =>
      url.includes("platform=ps5")
        ? new Promise<Response>((resolve) => {
            answerPs5 = resolve;
          })
        : Response.json({ clubs: [FERA] }),
    );
    vi.stubGlobal("fetch", clubSearch);
    renderSection();
    await searchFor("Fera");
    await findAnchor("Crear cuenta");

    await choose(user, /Plataforma/, "PlayStation 5");

    expect(await screen.findByRole("button", { name: "Buscando…" })).toBeDisabled();
    expect(screen.queryByText("Crear cuenta")).toBeNull();

    answerPs5(Response.json({ clubs: [{ ...FERA, platform: "ps5" }] }));
    const cta = await findAnchor("Crear cuenta");
    const redirectTo = new URL(cta.getAttribute("href") ?? "", "https://futrob.test").searchParams;
    expect(handoffFromHref(redirectTo.get("redirectTo")).handoff).toMatchObject({
      locator: { platform: "ps5" },
    });
  });

  it("says so when the platform has no club with that name", async () => {
    stubSearch(() => Response.json({ clubs: [] }));
    renderSection();

    await searchFor("Nadie");

    expect(await screen.findByText("Ningún club coincide con «Nadie» en Cross-gen")).toBeTruthy();
    expect(
      screen.getByText("Prueba con otra plataforma o escribe el nombre tal como aparece en EA."),
    ).toBeTruthy();
    expect(screen.queryByText("Crear cuenta")).toBeNull();
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

  it("switches to competitions, lists the open ones and joins one through signup", async () => {
    const user = userEvent.setup();
    const fetchMock = stubSearch(
      () => Response.json({ clubs: [FERA] }),
      () => Response.json({ items: [openCompetition("c-open", "Copa Andina")] }),
    );
    renderSection();

    await choose(user, /Buscar/, "Competiciones");

    const join = await findAnchor("Unirme");
    expect(openCalls(fetchMock)).toEqual([OPEN_PATH]);
    expect(clubSearchCalls(fetchMock)).toEqual([]);
    expect(join).toHaveAccessibleName("Unirme a Copa Andina");
    expect(screen.getByText(/^Liga Andina · /)).toBeTruthy();
    // The platform is its logo, named for assistive tech and on hover.
    expect(screen.getByTitle("PlayStation")).toHaveTextContent("PlayStation");
    expect(screen.getByText(/3 de 8 equipos/)).toBeTruthy();
    expect(screen.getByRole("searchbox", { name: "Nombre de la competición" })).toBeTruthy();
    const signup = new URL(join.getAttribute("href") ?? "", "https://futrob.test");
    expect(signup.pathname).toBe("/signup");
    expect(handoffFromHref(signup.searchParams.get("redirectTo"))).toEqual({
      pathname: "/onboarding/review",
      handoff: { kind: "competition", competitionId: "c-open", club: null },
    });
    expect(screen.getByText("¿Organizas un torneo?")).toBeTruthy();
    const organizer = await findAnchor("Crea tu competición");
    const organizerSignup = new URL(organizer.getAttribute("href") ?? "", "https://futrob.test");
    expect(organizerSignup.pathname).toBe("/signup");
    expect(handoffFromHref(organizerSignup.searchParams.get("redirectTo"))).toEqual({
      pathname: "/onboarding/organization",
      handoff: { kind: "organizer" },
    });
  });

  it("warns when a competition is almost full", async () => {
    const user = userEvent.setup();
    stubSearch(
      () => Response.json({ clubs: [FERA] }),
      () =>
        Response.json({
          items: [
            { ...openCompetition("c-full", "Copa Llena"), approvedTeamCount: 7 },
            {
              ...openCompetition("c-open", "Liga Libre"),
              competition: {
                ...openCompetition("c-open", "Liga Libre").competition,
                teams: { min: 2, max: null },
              },
            },
          ],
        }),
    );
    renderSection();
    await choose(user, /Buscar/, "Competiciones");

    expect(await screen.findByText("queda 1 lugar")).toBeTruthy();
    expect(screen.getByText(/7 de 8 equipos/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Unirme a Liga Libre" })).toBeTruthy();
  });

  it("narrows competitions by name and platform", async () => {
    const user = userEvent.setup();
    const fetchMock = stubSearch(
      () => Response.json({ clubs: [FERA] }),
      (url) =>
        Response.json({
          items: url.includes("q=Nadie") ? [] : [openCompetition("c-open", "Copa Andina")],
        }),
    );
    renderSection();
    await choose(user, /Buscar/, "Competiciones");
    await findAnchor("Unirme");

    await searchFor("Copa", "Nombre de la competición");
    await choose(user, /Plataforma/, "PlayStation");

    expect(
      await screen.findByText("Competiciones de PlayStation que aceptan equipos ahora."),
    ).toBeTruthy();
    expect(openCalls(fetchMock)).toContain(`${OPEN_PATH}?q=Copa&platform=playstation`);

    await searchFor("Nadie", "Nombre de la competición");

    expect(
      await screen.findByText("Ninguna competición con inscripción abierta coincide con «Nadie»."),
    ).toBeTruthy();
    expect(screen.getByText("Prueba con otro nombre o revisa la plataforma.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Ver todas las competiciones" }));

    expect(await findAnchor("Unirme")).toBeTruthy();
    expect(openCalls(fetchMock).at(-1)).toBe(OPEN_PATH);
    expect(screen.getByRole("searchbox", { name: "Nombre de la competición" })).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "Plataforma" })).toHaveTextContent("Todas");
  });

  it("carries the typed name across kinds without searching EA twice", async () => {
    const user = userEvent.setup();
    const fetchMock = stubSearch(
      () => Response.json({ clubs: [FERA] }),
      () => Response.json({ items: [] }),
    );
    renderSection();
    await searchFor("Fera");
    await findAnchor("Crear cuenta");

    await choose(user, /Buscar/, "Competiciones");
    expect(await screen.findByText(/coincide con «Fera»/)).toBeTruthy();
    expect(openCalls(fetchMock)).toEqual([`${OPEN_PATH}?q=Fera`]);

    await choose(user, /Buscar/, "Clubes");
    expect(await findAnchor("Crear cuenta")).toBeTruthy();
    expect(clubSearchCalls(fetchMock)).toHaveLength(1);
  });

  it("never shows an earlier search's clubs under a newer name", async () => {
    const user = userEvent.setup();
    const held: Record<string, (response: Response) => void> = {};
    const fetchMock = vi.fn(async (url: string) => {
      if (url.startsWith(OPEN_PATH)) return Response.json({ items: [] });
      const query = new URL(url, "https://futrob.test").searchParams.get("query") ?? "";
      return new Promise<Response>((resolve) => {
        held[query] = resolve;
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    renderSection();
    await searchFor("Fera");

    await choose(user, /Buscar/, "Competiciones");
    fireEvent.change(screen.getByRole("searchbox", { name: "Nombre de la competición" }), {
      target: { value: "Real" },
    });
    await choose(user, /Buscar/, "Clubes");
    held.Fera?.(Response.json({ clubs: [FERA] }));

    // «Fera» answered and «Real» is on its way: the field says «Real», so «Fera» stays hidden.
    await waitFor(() => expect(held.Real).toBeDefined());
    expect(screen.queryByRole("link", { name: "Crear cuenta con Fera Enjaulada" })).toBeNull();
    expect(screen.getByRole("list", { name: "Buscando…" })).toBeTruthy();

    held.Real?.(
      Response.json({ clubs: [{ ...FERA, externalClubId: "77", name: "Real Cuervos" }] }),
    );
    expect(await screen.findByRole("link", { name: "Crear cuenta con Real Cuervos" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Crear cuenta con Fera Enjaulada" })).toBeNull();
  });

  it("drops a queued club search when the visitor goes back to the running one", async () => {
    const user = userEvent.setup();
    const held: Record<string, (response: Response) => void> = {};
    const fetchMock = vi.fn(async (url: string) => {
      if (url.startsWith(OPEN_PATH)) return Response.json({ items: [] });
      const query = new URL(url, "https://futrob.test").searchParams.get("query") ?? "";
      return new Promise<Response>((resolve) => {
        held[query] = resolve;
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    renderSection();
    await searchFor("Fera");
    const competitionField = () =>
      screen.getByRole("searchbox", { name: "Nombre de la competición" });

    await choose(user, /Buscar/, "Competiciones");
    fireEvent.change(competitionField(), { target: { value: "Real" } });
    await choose(user, /Buscar/, "Clubes");
    await choose(user, /Buscar/, "Competiciones");
    fireEvent.change(competitionField(), { target: { value: "Fera" } });
    await choose(user, /Buscar/, "Clubes");
    held.Fera?.(Response.json({ clubs: [FERA] }));

    expect(
      await screen.findByRole("link", { name: "Crear cuenta con Fera Enjaulada" }),
    ).toBeTruthy();
    expect(screen.getByRole("searchbox", { name: "Nombre del club" })).toHaveValue("Fera");
    expect(
      clubSearchCalls(fetchMock).map((url) =>
        new URL(url, "https://futrob.test").searchParams.get("query"),
      ),
    ).toEqual(["Fera"]);
  });

  it("cuts a long competition name to EA's length for clubs and restores it on the way back", async () => {
    const user = userEvent.setup();
    const fetchMock = stubSearch(() => Response.json({ clubs: [] }));
    renderSection();
    await choose(user, /Buscar/, "Competiciones");
    const name = "Liga Interclubes de Fútbol Virtual del Pacífico Sur Temporada Apertura 2027";

    await searchFor(name, "Nombre de la competición");
    await waitFor(() => expect(openCalls(fetchMock).at(-1)).toContain("q=Liga+Interclubes"));
    expect(
      new URL(openCalls(fetchMock).at(-1) ?? "", "https://futrob.test").searchParams.get("q"),
    ).toBe("Liga Interclubes de Fútbol Virtual del Pacífico Sur Temporada Apertura 2027");

    await choose(user, /Buscar/, "Clubes");
    expect(screen.getByRole("searchbox", { name: "Nombre del club" })).toHaveValue(
      "Liga Interclubes de Fútbol Virtual del Pacífico Sur Temporad",
    );
    await waitFor(() => expect(clubSearchCalls(fetchMock)).toHaveLength(1));
    expect(
      new URL(clubSearchCalls(fetchMock)[0] ?? "", "https://futrob.test").searchParams.get("query"),
    ).toBe("Liga Interclubes de Fútbol Virtual del Pacífico Sur Temporad");

    await choose(user, /Buscar/, "Competiciones");
    expect(screen.getByRole("searchbox", { name: "Nombre de la competición" })).toHaveValue(
      "Liga Interclubes de Fútbol Virtual del Pacífico Sur Temporada Apertura 2027",
    );
    expect(
      new URL(openCalls(fetchMock).at(-1) ?? "", "https://futrob.test").searchParams.get("q"),
    ).toBe("Liga Interclubes de Fútbol Virtual del Pacífico Sur Temporada Apertura 2027");
  });

  it("keeps an empty state and recovers from a failed competition list", async () => {
    const user = userEvent.setup();
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
    await choose(user, /Buscar/, "Competiciones");

    expect(await screen.findByText("No pudimos cargar las inscripciones abiertas.")).toBeTruthy();
    fail = false;
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("No hay inscripciones abiertas ahora.")).toBeTruthy();
    expect(screen.getByText("Vuelve más tarde para ver nuevas inscripciones.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Ver todas las competiciones" })).toBeNull();
  });
});
