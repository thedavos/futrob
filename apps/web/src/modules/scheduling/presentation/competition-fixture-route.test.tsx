// @vitest-environment jsdom

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { leagueDraft } from "@/modules/competitions/presentation/competition-rules-fixtures.ts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { swissFixture } from "./competition-fixture.fixtures.ts";
import { CompetitionFixtureRoute } from "./competition-fixture-page.tsx";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children?: ReactNode }) => <a href="#encounter">{children}</a>,
}));

const permissions = vi.hoisted(() => ({ manage: true }));
vi.mock("@/shared/presentation/permissions/index.ts", () => ({
  useCapabilities: () => ({ manageSchedule: permissions.manage, loading: false }),
}));

const API = "/api/v1/organizations/org-1/competitions/competition-1";

type Server = {
  fixture: unknown;
  draft: object;
  approved: number;
  standings: unknown;
};

function serve(server: Server) {
  const posts: { path: string; body: unknown }[] = [];
  const reads: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = input instanceof Request ? new URL(input.url).pathname : String(input);
      const method = init?.method ?? "GET";
      if (method === "POST") {
        posts.push({ path, body: await new Response(init?.body).json() });
        server.fixture = swissFixture.fixture;
        return Response.json(swissFixture.fixture);
      }
      reads.push(path);
      if (path === `${API}/fixture`) {
        return Response.json({ fixture: server.fixture, teams: swissFixture.teams });
      }
      if (path === `${API}/standings`) return Response.json({ standings: server.standings });
      if (path === `${API}/participants`) {
        return Response.json({
          participants: Array.from({ length: server.approved }, (_, index) => ({
            id: `entry-${index}`,
            organizationId: "org-1",
            competitionId: "competition-1",
            teamId: `team-${index}`,
            status: "approved",
            createdAt: "2026-01-01T00:00:00.000Z",
          })),
        });
      }
      if (path.endsWith("/competition-1") || path.endsWith("/draft")) {
        return Response.json(server.draft);
      }
      return Response.json(
        { code: "api.not_found", messageKey: "errors.fallback" },
        { status: 404 },
      );
    }),
  );
  return { posts, reads };
}

const draftOf = (format: string, status: string) => ({
  ...leagueDraft,
  competition: { ...leagueDraft.competition, format, status, timeZone: "America/Lima" },
});

function renderRoute() {
  render(
    <I18nProvider initialLocale="es" persistLocale={async () => undefined}>
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <CompetitionFixtureRoute competitionId="competition-1" organizationId="org-1" />
      </QueryClientProvider>
    </I18nProvider>,
  );
}

beforeEach(() => {
  permissions.manage = true;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("CompetitionFixtureRoute", () => {
  it("offers generation for a published Swiss competition, sized by its approved Teams", async () => {
    serve({ fixture: null, draft: draftOf("swiss", "published"), approved: 5, standings: null });
    renderRoute();

    expect(await screen.findByRole("button", { name: "Generar calendario" })).toBeTruthy();
    expect(screen.getByText("Recomendadas: 3. Máximo: 3.")).toBeTruthy();
    expect(screen.getByText("Horarios en America/Lima")).toBeTruthy();
  });

  it("posts the generation to the BFF and shows the fixture it reads back", async () => {
    const server = serve({
      fixture: null,
      draft: draftOf("swiss", "published"),
      approved: 5,
      standings: null,
    });
    renderRoute();

    fireEvent.change(await screen.findByLabelText("Inicio de la ronda 1"), {
      target: { value: "2030-01-15T20:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generar calendario" }));

    await waitFor(() => expect(server.posts).toHaveLength(1));
    expect(server.posts[0]).toEqual({
      path: `${API}/fixture`,
      body: {
        generationVersion: 1,
        startsAt: "2030-01-16T01:00:00.000Z",
        roundIntervalDays: 7,
        homeAndAway: false,
        swiss: { rounds: 3 },
      },
    });
    expect(await screen.findByRole("heading", { name: "Fase suiza" })).toBeTruthy();
    expect(screen.getByText("Calendario generado.")).toBeTruthy();
  });

  it.each([
    ["a league", "league", "published"],
    ["an unpublished Swiss competition", "swiss", "draft"],
  ])("keeps the empty state for %s", async (_name, format, status) => {
    const server = serve({
      fixture: null,
      draft: draftOf(format, status),
      approved: 5,
      standings: null,
    });
    renderRoute();

    expect(await screen.findByText("Aún no hay calendario")).toBeTruthy();
    await waitFor(() => expect(server.reads).toContain(`${API}/participants`));
    expect(screen.queryByRole("button", { name: "Generar calendario" })).toBeNull();
  });

  it("does not read the draft for an actor who cannot manage the schedule", async () => {
    permissions.manage = false;
    const server = serve({
      fixture: null,
      draft: draftOf("swiss", "published"),
      approved: 5,
      standings: null,
    });
    renderRoute();

    expect(await screen.findByText("Aún no hay calendario")).toBeTruthy();
    expect(server.reads).toEqual([`${API}/fixture`]);
  });

  it("offers the organizer actions until the standings say the competition is over", async () => {
    serve({
      fixture: swissFixture.fixture,
      draft: draftOf("swiss", "published"),
      approved: 5,
      standings: null,
    });
    renderRoute();

    expect(await screen.findByRole("button", { name: "Retirar equipo" })).toBeTruthy();
  });

  it("hides the organizer actions once the Swiss table is final", async () => {
    const server = serve({
      fixture: swissFixture.fixture,
      draft: draftOf("swiss", "published"),
      approved: 5,
      standings: {
        competitionId: "competition-1",
        organizationId: "org-1",
        formulaVersion: "swiss-points-buchholz-gd-gf-v1",
        rows: [],
        sourceRevisionMax: 1,
        updatedAt: "2026-10-12T01:00:00.000Z",
        playoffSpots: null,
        swiss: { roundsTotal: 4, roundsCompleted: 4, currentRound: null, isFinal: true },
      },
    });
    renderRoute();

    expect(await screen.findByRole("heading", { name: "Fase suiza" })).toBeTruthy();
    await waitFor(() => expect(server.reads).toContain(`${API}/standings`));
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Retirar equipo" })).toBeNull(),
    );
  });

  it("offers no actions to an actor who cannot manage the schedule", async () => {
    permissions.manage = false;
    const server = serve({
      fixture: swissFixture.fixture,
      draft: draftOf("swiss", "published"),
      approved: 5,
      standings: null,
    });
    renderRoute();

    expect(await screen.findByRole("heading", { name: "Fase suiza" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Retirar equipo" })).toBeNull();
    expect(server.reads).toEqual([`${API}/fixture`]);
  });
});
