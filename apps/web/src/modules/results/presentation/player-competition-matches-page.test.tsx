// @vitest-environment jsdom

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type {
  ListAccessibleCompetitionsResponse,
  ListCompetitionEncountersResponse,
} from "@futrob/api-contracts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { PlayerCompetitionMatchesRoute } from "./player-competition-matches-page.tsx";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    children,
    ...props
  }: {
    to: string;
    params: Record<string, string>;
    children?: ReactNode;
  }) => (
    <a
      href={to.replaceAll(/\$(\w+)/g, (_, key: string) => encodeURIComponent(params[key] ?? ""))}
      {...props}
    >
      {children}
    </a>
  ),
}));

const MINE_PATH = "/api/v1/competitions/mine";
const LIST_PATH = "/api/v1/organizations/org-1/competitions/competition-1/encounters";

const accessible = (competitionId: string): ListAccessibleCompetitionsResponse => ({
  competitions: [
    {
      role: "player",
      competition: {
        id: competitionId,
        organizationId: "org-1",
        name: "Liga Verify",
        status: "published",
        modality: "fc-clubs",
        gameEdition: "FC 26",
        platform: "playstation",
        region: "south-america",
        timeZone: "America/Lima",
        format: "league",
        teams: { min: 2, max: 8 },
        schedule: { startsOn: "2026-10-01", endsOn: "2026-12-01" },
        cover: { kind: "preset", preset: "league" },
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      },
    },
  ],
});

const encounters: ListCompetitionEncountersResponse = {
  competition: { id: "competition-1", name: "Liga Verify", timeZone: "America/Lima" },
  encounters: [
    {
      encounterId: "competition-1:encounter:1",
      round: { number: 1, total: 2 },
      scheduledStartAt: "2026-10-19T16:00:00.000Z",
      officialMatchCount: 2,
      home: { teamId: "team-pijadores", name: "Pijadores FC" },
      away: { teamId: "team-sobrenaturales", name: "Sobrenaturales" },
      status: "scheduled",
    },
  ],
};

const failure = (status: number, code: string) =>
  Response.json({ code, messageKey: `errors.${code}` }, { status });

function serve(handlers: { readonly mine: () => Response; readonly list?: () => Response }) {
  const fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), "https://web.test");
    if (url.pathname === MINE_PATH) return handlers.mine();
    if (url.pathname === LIST_PATH && handlers.list) return handlers.list();
    return failure(404, "api.not_found");
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

function renderRoute() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, retryDelay: 0 } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider initialLocale="es">
        <PlayerCompetitionMatchesRoute competitionId="competition-1" />
      </I18nProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Player competition matches", () => {
  it("shows a loading status until the competition's organization is known", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => {})),
    );
    renderRoute();

    expect(screen.getByRole("heading", { name: "Partidos" })).toBeTruthy();
    expect(screen.getByRole("status", { name: /cargando/i }).getAttribute("aria-busy")).toBe(
      "true",
    );
  });

  it("lists the Encounters through the organization of the viewer's competition", async () => {
    const fetch = serve({
      mine: () => Response.json(accessible("competition-1")),
      list: () => Response.json(encounters),
    });
    renderRoute();

    const row = await screen.findByRole("link", { name: "Abrir Pijadores FC vs Sobrenaturales" });
    expect(row.getAttribute("href")).toBe(
      "/orgs/org-1/competitions/competition-1/encounters/competition-1%3Aencounter%3A1",
    );
    expect(
      fetch.mock.calls.map(([input]) => new URL(String(input), "https://web.test").pathname),
    ).toContain(LIST_PATH);
  });

  it("explains an empty fixture", async () => {
    serve({
      mine: () => Response.json(accessible("competition-1")),
      list: () => Response.json({ ...encounters, encounters: [] }),
    });
    renderRoute();

    expect(await screen.findByText("Aún no hay enfrentamientos")).toBeTruthy();
  });

  it("retries the encounters request after resolving the competition's organization", async () => {
    const user = userEvent.setup();
    let calls = 0;
    serve({
      mine: () => Response.json(accessible("competition-1")),
      list: () => (calls++ < 3 ? failure(503, "api.unavailable") : Response.json(encounters)),
    });
    renderRoute();

    expect(await screen.findByText("No pudimos cargar los enfrentamientos.")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Partidos" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(
      await screen.findByRole("link", { name: "Abrir Pijadores FC vs Sobrenaturales" }),
    ).toBeTruthy();
  });

  it("reports a competition the viewer cannot access as unavailable without reading the list", async () => {
    const fetch = serve({
      mine: () => Response.json(accessible("another-competition")),
      list: () => Response.json(encounters),
    });
    renderRoute();

    expect(await screen.findByText("Competición no disponible")).toBeTruthy();
    expect(fetch.mock.calls.some(([input]) => String(input).includes("/encounters"))).toBe(false);
  });

  it("offers a retry when the viewer's competitions cannot be loaded", async () => {
    const user = userEvent.setup();
    let calls = 0;
    serve({
      mine: () =>
        calls++ === 0
          ? failure(503, "api.unavailable")
          : Response.json(accessible("competition-1")),
      list: () => Response.json(encounters),
    });
    renderRoute();

    expect(await screen.findByText("No pudimos cargar los enfrentamientos.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(
      await screen.findByRole("link", { name: "Abrir Pijadores FC vs Sobrenaturales" }),
    ).toBeTruthy();
  });
});
