// @vitest-environment jsdom

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { ListCompetitionDisputesResponse } from "@futrob/api-contracts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { CompetitionDisputesRoute } from "./competition-disputes-page.tsx";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    hash,
    children,
    ...props
  }: {
    to: string;
    params: Record<string, string>;
    hash?: string;
    children?: ReactNode;
  }) => (
    <a
      href={`${to.replaceAll(/\$(\w+)/g, (_, key: string) => encodeURIComponent(params[key] ?? ""))}${hash ? `#${hash}` : ""}`}
      {...props}
    >
      {children}
    </a>
  ),
}));

const LIST_PATH = "/api/v1/organizations/org-1/competitions/competition-1/disputes";

const queue: ListCompetitionDisputesResponse = {
  competition: { id: "competition-1", name: "Liga Verify", timeZone: "America/Lima" },
  disputes: [
    {
      encounterId: "competition-1:encounter:1",
      status: "disputed",
      home: { teamId: "team-pijadores", name: "Pijadores FC" },
      away: { teamId: "team-sobrenaturales", name: null },
      scheduledStartAt: "2026-10-19T16:00:00.000Z",
      since: "2026-10-20T15:30:00.000Z",
      dispute: {
        id: "dispute-1",
        status: "open",
        openedByTeamId: "team-sobrenaturales",
        openedAt: "2026-10-20T15:30:00.000Z",
        reviewStartedAt: null,
      },
    },
    {
      encounterId: "competition-1:encounter:2",
      status: "organizer_review",
      home: { teamId: "team-sobrenaturales", name: "Sobrenaturales" },
      away: { teamId: "team-pijadores", name: "Pijadores FC" },
      scheduledStartAt: "2026-10-26T23:30:00.000Z",
      since: "2026-10-27T02:00:00.000Z",
      dispute: null,
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
        <CompetitionDisputesRoute competitionId="competition-1" organizationId="org-1" />
      </I18nProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Competition disputes list", () => {
  it("links each case to the Encounter review section with both Teams and its wait", async () => {
    serve(() => Response.json(queue));
    renderRoute();

    const first = await screen.findByRole("link", {
      name: "Revisar la disputa de Pijadores FC vs Equipo sin nombre disponible",
    });
    expect(first.getAttribute("href")).toBe(
      "/orgs/org-1/competitions/competition-1/encounters/competition-1%3Aencounter%3A1#encounter-review",
    );
    const description = first.getAttribute("aria-describedby") ?? "";
    const described = description
      .split(" ")
      .map((id) => document.getElementById(id)?.textContent)
      .join(" ");
    expect(described).toContain("En disputa");
    expect(described).toContain("En espera desde");
    expect(described).toContain("Partido el");
    expect(screen.getByText("Horarios en America/Lima")).toBeTruthy();

    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items.map((item) => within(item).getByRole("link").getAttribute("aria-label"))).toEqual([
      "Revisar la disputa de Pijadores FC vs Equipo sin nombre disponible",
      "Revisar la disputa de Sobrenaturales vs Pijadores FC",
    ]);
    expect(within(items[1]!).getByText("Revisión del organizador")).toBeTruthy();
  });

  it("speaks English when the session locale is English", async () => {
    serve(() => Response.json(queue));
    renderRoute("en");

    const row = await screen.findByRole("link", {
      name: "Review the dispute for Pijadores FC vs Team name unavailable",
    });
    expect(within(row).getByText("In dispute")).toBeTruthy();
    expect(within(row).getByText(/Waiting since/)).toBeTruthy();
  });

  it("explains a clear queue instead of showing rows", async () => {
    serve(() => Response.json({ ...queue, disputes: [] }));
    renderRoute();

    expect(await screen.findByText("No hay disputas pendientes")).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("reports a hidden competition as unavailable, not as an empty queue", async () => {
    serve(() => failure(404, "competitions.not_found"));
    renderRoute();

    expect(await screen.findByText("Competición no disponible")).toBeTruthy();
    expect(screen.queryByText("No hay disputas pendientes")).toBeNull();
  });

  it("offers a retry once the automatic retries fail and then shows the queue", async () => {
    const user = userEvent.setup();
    const unavailable = () => failure(503, "api.unavailable");
    serve(unavailable, unavailable, unavailable, () => Response.json(queue));
    renderRoute();

    expect(
      await screen.findByText("No pudimos cargar las disputas.", {}, { timeout: 6000 }),
    ).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(
      await screen.findByRole("link", {
        name: "Revisar la disputa de Pijadores FC vs Equipo sin nombre disponible",
      }),
    ).toBeTruthy();
  }, 10_000);
});
