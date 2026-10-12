// @vitest-environment jsdom

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { Locale } from "@/shared/presentation/i18n/catalogs.ts";
import { encounterView, m1, m2, m3, readyCandidates as ready } from "./encounter-page.fixtures.ts";
import { EncounterRoute } from "./encounter-route.tsx";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: { to: string; children?: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

type Sent = { readonly method: string; readonly path: string };
let sent: Sent[];

function serve(routes: Record<string, () => Response>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input);
      sent.push({ method: init?.method ?? "GET", path });
      const route = routes[path];
      return route ? route() : Response.json({ code: "api.not_found" }, { status: 404 });
    }),
  );
}

const VIEW_PATH = "/api/v1/organizations/org-1/encounters/encounter-1";
const CANDIDATES_PATH = "/api/v1/encounters/encounter-1/candidates";

function renderEncounter(locale: Locale = "es", competitionId = "competition-1") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider initialLocale={locale}>
        <EncounterRoute
          competitionId={competitionId}
          encounterId="encounter-1"
          organizationId="org-1"
        />
      </I18nProvider>
    </QueryClientProvider>,
  );
}

const slotRow = (name: string) => screen.getByRole("listitem", { name });
const candidateRow = (name: RegExp) =>
  within(screen.getByRole("list", { name: "Partidos EA candidatos" })).getByRole("listitem", {
    name,
  });

beforeEach(() => {
  sent = [];
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Encounter page", () => {
  it("previews an aggregate 1–2 from slots 1–0 and 0–2 without sending a selection", async () => {
    const user = userEvent.setup();
    serve({
      [VIEW_PATH]: () => Response.json(encounterView()),
      [CANDIDATES_PATH]: () => Response.json(ready([m1, m2])),
    });
    renderEncounter();

    await user.click(
      within(
        await screen.findByRole("listitem", { name: /^Cuervos EA contra Maderas EA/ }),
      ).getByRole("button", { name: "Usar en partido 1" }),
    );
    await user.click(
      within(candidateRow(/^Maderas EA contra Cuervos EA/)).getByRole("button", {
        name: "Usar en partido 2",
      }),
    );

    expect(within(slotRow("Partido 1")).getByText("1–0")).toBeTruthy();
    expect(within(slotRow("Partido 2")).getByText("0–2")).toBeTruthy();
    const aggregate = screen.getByRole("group", { name: "Global" });
    expect(within(aggregate).getByText("1–2")).toBeTruthy();
    expect(within(aggregate).getByText("Gana Maderas FC")).toBeTruthy();
    expect(sent).toEqual([
      { method: "GET", path: VIEW_PATH },
      { method: "GET", path: CANDIDATES_PATH },
    ]);
  });

  it("names the Team without an EA club; a connected neighbor lists m-1 with time, score and duration", async () => {
    serve({
      [VIEW_PATH]: () => Response.json(encounterView()),
      [CANDIDATES_PATH]: () => Response.json({ status: "clubs_not_connected", sides: ["away"] }),
    });
    const disconnected = renderEncounter();

    expect(await screen.findByText("Maderas FC no tiene un club EA conectado.")).toBeTruthy();
    expect(screen.queryByText("Cuervos FC no tiene un club EA conectado.")).toBeNull();
    expect(screen.queryByRole("list", { name: "Partidos EA candidatos" })).toBeNull();
    disconnected.unmount();

    serve({
      [VIEW_PATH]: () => Response.json(encounterView()),
      [CANDIDATES_PATH]: () => Response.json(ready([m1])),
    });
    renderEncounter();

    const row = within(
      await screen.findByRole("listitem", { name: /^Cuervos EA contra Maderas EA/ }),
    );
    expect(row.getByText("1–0")).toBeTruthy();
    expect(row.getByText("12 min")).toBeTruthy();
    expect(row.getByText("lun, 14 sept, 20:05")).toBeTruthy();
  });

  it("swaps a slot's candidate locally and forgets it when the screen reopens", async () => {
    const user = userEvent.setup();
    serve({
      [VIEW_PATH]: () =>
        Response.json(
          encounterView({
            officialMatchCount: 1,
            officialMatches: [{ officialSlot: 1, scheduledStartAt: "2026-09-15T01:00:00.000Z" }],
          }),
        ),
      [CANDIDATES_PATH]: () => Response.json(ready([m1, m3])),
    });
    const first = renderEncounter("en");

    const useIn = async (row: RegExp) =>
      user.click(
        within(await screen.findByRole("listitem", { name: row })).getByRole("button", {
          name: "Use in match 1",
        }),
      );
    await useIn(/^Cuervos EA against Maderas EA, Mon, Sep 14, 08:05 PM/);
    expect(within(screen.getByRole("group", { name: "Result" })).getByText("1–0")).toBeTruthy();
    await useIn(/^Cuervos EA against Maderas EA, Mon, Sep 14, 08:50 PM/);
    const result = within(screen.getByRole("group", { name: "Result" }));
    expect(result.getByText("3–3")).toBeTruthy();
    expect(result.getByText("Draw")).toBeTruthy();
    first.unmount();

    renderEncounter("en");
    const reopened = within(await screen.findByRole("listitem", { name: "Match 1" }));
    expect(reopened.getByText("No EA match assigned")).toBeTruthy();
    expect(sent.every((request) => request.method === "GET")).toBe(true);
  });

  it("treats an Encounter from another competition as not found; its own competition shows both Teams", async () => {
    serve({
      [VIEW_PATH]: () => Response.json(encounterView()),
      [CANDIDATES_PATH]: () => Response.json(ready([])),
    });
    const elsewhere = renderEncounter("es", "competition-other");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Enfrentamiento no disponible" }),
    ).toBeTruthy();
    expect(sent.map((request) => request.path)).toEqual([VIEW_PATH]);
    elsewhere.unmount();

    renderEncounter();
    expect(
      await screen.findByRole("heading", { level: 1, name: "Cuervos FC vs Maderas FC" }),
    ).toBeTruthy();
    expect(await screen.findByText("Sin partidos EA todavía")).toBeTruthy();
  });

  it("separates a hidden Encounter from restricted candidates", async () => {
    serve({
      [CANDIDATES_PATH]: () => Response.json(ready([m1])),
    });
    const hidden = renderEncounter();
    expect(
      await screen.findByRole("heading", { level: 1, name: "Enfrentamiento no disponible" }),
    ).toBeTruthy();
    hidden.unmount();

    serve({
      [VIEW_PATH]: () => Response.json(encounterView()),
      [CANDIDATES_PATH]: () => Response.json({ code: "authorization.forbidden" }, { status: 403 }),
    });
    renderEncounter();
    expect(await screen.findByText("Candidatos restringidos")).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 1, name: "Cuervos FC vs Maderas FC" }),
    ).toBeTruthy();
  });
});
