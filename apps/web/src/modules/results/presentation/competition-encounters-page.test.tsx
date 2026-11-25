// @vitest-environment jsdom

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { ListCompetitionEncountersResponse } from "@futrob/api-contracts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { CompetitionEncountersRoute } from "./competition-encounters-page.tsx";

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

const LIST_PATH = "/api/v1/organizations/org-1/competitions/competition-1/encounters";

const fixtureEncounters: ListCompetitionEncountersResponse = {
  competition: { id: "competition-1", name: "Liga Verify", timeZone: "America/Lima" },
  encounters: [
    {
      encounterId: "competition-1:encounter:1",
      round: { number: 1, total: 3 },
      scheduledStartAt: "2026-10-19T16:00:00.000Z",
      officialMatchCount: 2,
      resolutionMode: "aggregate_score",
      home: { teamId: "team-pijadores", name: "Pijadores FC" },
      away: { teamId: "team-sobrenaturales", name: "Sobrenaturales" },
      status: "official",
      score: [
        { homeGoals: 2, awayGoals: 1 },
        { homeGoals: 1, awayGoals: 0 },
      ],
    },
    {
      encounterId: "competition-1:encounter:2",
      round: { number: 2, total: 3 },
      scheduledStartAt: "2026-10-26T23:30:00.000Z",
      officialMatchCount: 1,
      resolutionMode: null,
      home: { teamId: "team-sobrenaturales", name: "Sobrenaturales" },
      away: { teamId: "team-condores", name: "Cóndores FC" },
      status: "awaiting_result",
      score: null,
    },
    {
      encounterId: "competition-1:encounter:3",
      round: { number: 3, total: 3 },
      scheduledStartAt: "2026-11-02T23:30:00.000Z",
      officialMatchCount: 1,
      resolutionMode: null,
      home: { teamId: "team-condores", name: "Cóndores FC" },
      away: { teamId: "team-pijadores", name: "Pijadores FC" },
      status: "scheduled",
      score: null,
    },
  ],
};

function serve(...responses: Array<() => Response>) {
  const fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), "https://web.test");
    if (url.pathname !== LIST_PATH) return failure(404, "api.not_found");
    const next = responses.length > 1 ? responses.shift() : responses[0];
    return next ? next() : failure(500, "api.unexpected");
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

const failure = (status: number, code: string) =>
  Response.json({ code, messageKey: `errors.${code}` }, { status });

function renderRoute(locale: "es" | "en" = "es") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, retryDelay: 0 } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider initialLocale={locale}>
        <CompetitionEncountersRoute competitionId="competition-1" organizationId="org-1" />
      </I18nProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Competition encounters list", () => {
  it("groups Encounters by round, shows official aggregate scores and links each to its Match Center", async () => {
    serve(() => Response.json(fixtureEncounters));
    renderRoute();

    const first = await screen.findByRole("link", { name: "Abrir Pijadores FC vs Sobrenaturales" });
    expect(first.getAttribute("href")).toBe(
      "/orgs/org-1/competitions/competition-1/encounters/competition-1%3Aencounter%3A1",
    );
    const description = first.getAttribute("aria-describedby") ?? "";
    const described = description
      .split(" ")
      .map((id) => document.getElementById(id)?.textContent)
      .join(" ");
    expect(described).toContain("Jornada 1 de 3");
    expect(described).toContain("Resultado oficial");
    expect(described).toContain("11:00");
    expect(described).toContain("2 partidos oficiales");
    expect(within(first).getByLabelText("Marcador global 3 a 1, partidos 2–1 · 1–0")).toBeTruthy();
    expect(within(first).getByText("Global · 2–1 · 1–0")).toBeTruthy();

    expect(screen.getByRole("heading", { name: "Jornada 1 de 3" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Jornada 2 de 3" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Jornada 3 de 3" })).toBeTruthy();
    expect(screen.getByText("1/1 oficiales")).toBeTruthy();
    expect(screen.getByText("1 pendiente · 0/1 oficiales")).toBeTruthy();
    expect(screen.getByText("Programada")).toBeTruthy();
    expect(screen.getByText("Horarios en America/Lima")).toBeTruthy();
  });

  it("renders single-match and independent two-match official scores without inventing an aggregate", async () => {
    const singleAndIndependent: ListCompetitionEncountersResponse = {
      competition: fixtureEncounters.competition,
      encounters: [
        {
          encounterId: "e-single",
          round: { number: 1, total: 1 },
          scheduledStartAt: "2026-10-19T16:00:00.000Z",
          officialMatchCount: 1,
          resolutionMode: null,
          home: { teamId: "team-a", name: "Cóndores FC" },
          away: { teamId: "team-b", name: "Sporting Quipu" },
          status: "official",
          score: [{ homeGoals: 3, awayGoals: 1 }],
        },
        {
          encounterId: "e-indep",
          round: { number: 1, total: 1 },
          scheduledStartAt: "2026-10-19T18:00:00.000Z",
          officialMatchCount: 2,
          resolutionMode: "independent_matches",
          home: { teamId: "team-c", name: "Inti United" },
          away: { teamId: "team-d", name: "Real Vicuña" },
          status: "official",
          score: [
            { homeGoals: 2, awayGoals: 0 },
            { homeGoals: 1, awayGoals: 1 },
          ],
        },
      ],
    };
    serve(() => Response.json(singleAndIndependent));
    renderRoute();

    const single = await screen.findByRole("link", { name: "Abrir Cóndores FC vs Sporting Quipu" });
    expect(within(single).getByLabelText("Marcador oficial 3 a 1")).toBeTruthy();

    const indep = screen.getByRole("link", { name: "Abrir Inti United vs Real Vicuña" });
    expect(within(indep).getByLabelText("Marcadores oficiales 2–0 · 1–1")).toBeTruthy();
    expect(within(indep).queryByText(/Global/)).toBeNull();
  });

  it("filters by status and shows a resettable filtered-empty state when no encounter matches", async () => {
    const user = userEvent.setup();
    const onlyOfficial: ListCompetitionEncountersResponse = {
      competition: fixtureEncounters.competition,
      encounters: [fixtureEncounters.encounters[0]!],
    };
    serve(() => Response.json(onlyOfficial));
    renderRoute();

    await screen.findByRole("link", { name: "Abrir Pijadores FC vs Sobrenaturales" });

    await user.click(screen.getByRole("radio", { name: /Pendientes/i }));
    expect(screen.getByText("No hay enfrentamientos con esos filtros")).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();

    const clearButtons = screen.getAllByRole("button", { name: "Limpiar filtros" });
    await user.click(clearButtons[clearButtons.length - 1]!);
    expect(screen.getByRole("link", { name: "Abrir Pijadores FC vs Sobrenaturales" })).toBeTruthy();
  });

  it("speaks English when the session locale is English", async () => {
    serve(() => Response.json(fixtureEncounters));
    renderRoute("en");

    const row = await screen.findByRole("link", { name: "Open Pijadores FC vs Sobrenaturales" });
    expect(within(row).getByText("Official result")).toBeTruthy();
    expect(within(row).getByLabelText("Aggregate score 3 to 1, matches 2–1 · 1–0")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Matchday 1 of 3" })).toBeTruthy();
  });

  it("explains an empty fixture instead of showing rows", async () => {
    serve(() => Response.json({ ...fixtureEncounters, encounters: [] }));
    renderRoute();

    expect(await screen.findByText("Aún no hay enfrentamientos")).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("reports a hidden competition as unavailable, not as an empty fixture", async () => {
    serve(() => failure(404, "competitions.not_found"));
    renderRoute();

    expect(await screen.findByText("Competición no disponible")).toBeTruthy();
    expect(screen.queryByText("Aún no hay enfrentamientos")).toBeNull();
  });

  it("offers a retry once the automatic retries fail and then shows the list", async () => {
    const user = userEvent.setup();
    const unavailable = () => failure(503, "api.unavailable");
    serve(unavailable, unavailable, unavailable, () => Response.json(fixtureEncounters));
    renderRoute();

    expect(await screen.findByText("No pudimos cargar los enfrentamientos.")).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(
      await screen.findByRole("link", { name: "Abrir Pijadores FC vs Sobrenaturales" }),
    ).toBeTruthy();
  });
});
