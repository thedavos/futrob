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

const twoEncounters: ListCompetitionEncountersResponse = {
  competition: { id: "competition-1", name: "Liga Verify", timeZone: "America/Lima" },
  encounters: [
    {
      encounterId: "competition-1:encounter:1",
      round: { number: 1, total: 2 },
      scheduledStartAt: "2026-10-19T16:00:00.000Z",
      officialMatchCount: 2,
      home: { teamId: "team-pijadores", name: "Pijadores FC" },
      away: { teamId: "team-sobrenaturales", name: "Sobrenaturales" },
      status: "official",
    },
    {
      encounterId: "competition-1:encounter:2",
      round: { number: 2, total: 2 },
      scheduledStartAt: "2026-10-26T23:30:00.000Z",
      officialMatchCount: 1,
      home: { teamId: "team-sobrenaturales", name: "Sobrenaturales" },
      away: { teamId: "team-pijadores", name: "Pijadores FC" },
      status: "scheduled",
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
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
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
  it("links each Encounter to its Match Center with both Teams, status and competition time", async () => {
    serve(() => Response.json(twoEncounters));
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
    expect(described).toContain("Jornada 1 de 2");
    expect(described).toContain("Resultado oficial");
    expect(described).toContain("11:00");
    expect(described).toContain("2 partidos oficiales");
    expect(screen.getByText("Horarios en America/Lima")).toBeTruthy();

    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items.map((item) => within(item).getByRole("link").getAttribute("aria-label"))).toEqual([
      "Abrir Pijadores FC vs Sobrenaturales",
      "Abrir Sobrenaturales vs Pijadores FC",
    ]);
    expect(within(items[1]!).getByText("Programado")).toBeTruthy();
  });

  it("speaks English when the session locale is English", async () => {
    serve(() => Response.json(twoEncounters));
    renderRoute("en");

    const row = await screen.findByRole("link", { name: "Open Pijadores FC vs Sobrenaturales" });
    expect(within(row).getByText("Official result")).toBeTruthy();
    expect(within(row).getByText("Matchday 1 of 2")).toBeTruthy();
  });

  it("explains an empty fixture instead of showing rows", async () => {
    serve(() => Response.json({ ...twoEncounters, encounters: [] }));
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
    serve(unavailable, unavailable, unavailable, () => Response.json(twoEncounters));
    renderRoute();

    expect(
      await screen.findByText("No pudimos cargar los enfrentamientos.", {}, { timeout: 6000 }),
    ).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(
      await screen.findByRole("link", { name: "Abrir Pijadores FC vs Sobrenaturales" }),
    ).toBeTruthy();
  }, 10_000);
});
