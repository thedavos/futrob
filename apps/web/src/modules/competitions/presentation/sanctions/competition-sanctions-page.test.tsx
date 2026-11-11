// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { CompetitionSanctionDto } from "@futrob/api-contracts";
import { COMPETITION_PERMISSION } from "@futrob/competitions";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { teamSummaryFixture } from "@/modules/teams/presentation/competition-teams-view.fixtures.ts";
import { CompetitionSanctionsRoute } from "./competition-sanctions-page.tsx";
import { TeamSanctionsSection } from "./team-sanctions-section.tsx";

const COMPETITION = "/api/v1/organizations/org-1/competitions/competition-1";

const active: CompetitionSanctionDto = {
  id: "sanction-1",
  competitionId: "competition-1",
  targetType: "team",
  teamId: "team-1",
  teamName: "Cuervos FC",
  playerProfileId: null,
  playerName: null,
  type: "points_deduction",
  pointsDeducted: 3,
  suspensionMatches: null,
  encounterId: null,
  reason: "Alineación indebida",
  imposedByActorId: "actor-organizer",
  imposedAt: "2026-10-14T18:00:00.000Z",
  requestId: "req-1",
  revocation: null,
};

const failure = (status: number, code: string) =>
  Response.json({ code, messageKey: `errors.${code}` }, { status });

type Sent = { readonly method: string; readonly path: string; readonly body: unknown };

function serve({
  canManage,
  list,
}: {
  readonly canManage: boolean;
  readonly list: () => Response;
}) {
  const sent: Sent[] = [];
  let sanctions = [active];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), "https://web.test");
      const method = init?.method ?? "GET";
      const body: unknown = init?.body ? JSON.parse(String(init.body)) : null;
      sent.push({ method, path: url.pathname, body });
      if (url.pathname === "/api/v1/authorization/effective-access") {
        return Response.json({
          actorId: "actor-1",
          scope: { organizationId: "org-1", competitionId: "competition-1" },
          roles: [],
          permissions: [
            {
              permission: COMPETITION_PERMISSION.sanctionsManage,
              allowed: canManage,
              decidedAt: "organization",
            },
          ],
        });
      }
      if (
        (url.pathname === `${COMPETITION}/sanctions` ||
          url.pathname === `${COMPETITION}/teams/team-1/sanctions`) &&
        method === "GET"
      ) {
        const response = list();
        return response.ok ? Response.json({ sanctions }) : response;
      }
      if (url.pathname === `${COMPETITION}/team-management`) {
        const team = teamSummaryFixture();
        return Response.json({
          items: [{ ...team, entry: { ...team.entry, status: "approved" } }],
          nextCursor: null,
        });
      }
      if (url.pathname === `${COMPETITION}/encounters`) {
        return Response.json({ encounters: [] });
      }
      if (url.pathname === `${COMPETITION}/sanctions/sanction-1/revoke` && method === "POST") {
        const revoked = {
          ...active,
          revocation: {
            actorId: "actor-1",
            revokedAt: "2026-10-15T10:00:00.000Z",
            reason: "Error de registro",
            requestId: "req-2",
          },
        };
        sanctions = [revoked];
        return Response.json(revoked);
      }
      return failure(404, "api.not_found");
    }),
  );
  return sent;
}

function renderRoute(view: "competition" | "team" = "competition") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider initialLocale="es">
        {view === "competition" ? (
          <CompetitionSanctionsRoute competitionId="competition-1" organizationId="org-1" />
        ) : (
          <TeamSanctionsSection
            competitionId="competition-1"
            organizationId="org-1"
            teamId="team-1"
          />
        )}
      </I18nProvider>
    </QueryClientProvider>,
  );
  return queryClient;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Competition sanctions page", () => {
  it("lets an actor with sanctions.manage revoke with a reason and keeps the row as revoked", async () => {
    const user = userEvent.setup();
    const sent = serve({ canManage: true, list: () => Response.json({}) });
    renderRoute();

    const table = await screen.findByRole("table", { name: "Sanciones de la competición" });
    expect(within(table).getByText("−3 puntos")).toBeTruthy();
    expect(await screen.findByRole("button", { name: "Sancionar" })).toBeTruthy();

    await user.click(within(table).getByRole("button", { name: "Revocar" }));
    await user.type(screen.getByLabelText("Motivo"), "Error de registro");
    await user.click(screen.getByRole("button", { name: "Revocar sanción" }));

    expect(await within(table).findByText("Revocada")).toBeTruthy();
    expect(within(table).queryByRole("button", { name: "Revocar" })).toBeNull();
    expect(sent).toContainEqual({
      method: "POST",
      path: `${COMPETITION}/sanctions/sanction-1/revoke`,
      body: { reason: "Error de registro" },
    });
  });

  it("shows the list without impose or revoke controls to a reader without sanctions.manage", async () => {
    serve({ canManage: false, list: () => Response.json({}) });
    renderRoute();

    const table = await screen.findByRole("table", { name: "Sanciones de la competición" });
    expect(within(table).getByText("Cuervos FC")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Sancionar" })).toBeNull();
    expect(within(table).queryByRole("button", { name: "Revocar" })).toBeNull();
  });

  it("shows the permission state, not an empty list, when the API refuses with 403", async () => {
    serve({ canManage: false, list: () => failure(403, "api.forbidden") });
    renderRoute();

    expect(await screen.findByText("Sanciones no disponibles")).toBeTruthy();
    expect(screen.queryByText("Sin sanciones")).toBeNull();
    expect(screen.queryByRole("button", { name: "Sancionar" })).toBeNull();
  });

  it.each(["competition", "team"] as const)(
    "removes cached %s sanctions after a refreshed read is denied",
    async (view) => {
      let denied = false;
      serve({
        canManage: false,
        list: () => (denied ? failure(403, "api.forbidden") : Response.json({})),
      });
      const queryClient = renderRoute(view);
      const label = view === "competition" ? "Sanciones de la competición" : "Sanciones del equipo";
      expect(await screen.findByRole("table", { name: label })).toBeTruthy();

      denied = true;
      await act(async () => {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.competitions.sanctions("org-1", "competition-1"),
        });
      });

      expect(
        await screen.findByText(
          view === "competition"
            ? "Sanciones no disponibles"
            : "No puedes ver las sanciones de este equipo.",
        ),
      ).toBeTruthy();
      expect(screen.queryByRole("table", { name: label })).toBeNull();
      expect(screen.queryByText("Alineación indebida")).toBeNull();
    },
  );

  it("rejects fractional deductions instead of silently recording fewer points", async () => {
    const user = userEvent.setup();
    const sent = serve({ canManage: true, list: () => Response.json({}) });
    renderRoute();

    await user.click(await screen.findByRole("button", { name: "Sancionar" }));
    await user.click(screen.getByRole("combobox", { name: "Tipo" }));
    await user.click(await screen.findByRole("option", { name: "Descuento de puntos" }));
    await user.click(screen.getByRole("combobox", { name: "Equipo" }));
    await user.click(await screen.findByRole("option", { name: "Cuervos FC" }));
    await user.type(screen.getByLabelText("Puntos a descontar"), "1.9");
    await user.type(screen.getByLabelText("Motivo"), "Alineación indebida");
    await user.click(screen.getByRole("button", { name: "Registrar sanción" }));

    expect(await screen.findByText("Escribe un número entero entre 1 y 100.")).toBeTruthy();
    expect(sent.filter((request) => request.method === "POST")).toEqual([]);
  });
});
