import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type {
  EncounterCandidateDto,
  EncounterViewDto,
  ListEncounterCandidatesResponse,
  OfficialSelectionViewDto,
} from "@futrob/api-contracts";
import { matchCenterFixtures as fx } from "@futrob/sdk/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { clearSession, saveSession } from "@/modules/identity/session-store";
import { apiError, installFakeApi, type FakeRoute } from "../../../test/fake-api";
import { currentLocation } from "../../../test/expo-router";
import { cleanupApp, renderApp } from "../../../test/render-app";

const ROUTE = "/orgs/org-1/competitions/competition-1/encounters/encounter-1";
const SELECTION = "/organizations/org-1/encounters/encounter-1/official-selection";
const PROPOSE = "encounters.official-selection.propose";
const APPROVE = "encounters.results.approve";

const club = (externalClubId: string, name: string) => ({
  providerKey: "ea-clubs" as const,
  externalClubId,
  name,
  platform: "ps5",
  gameEdition: "fc26",
  imageUrl: null,
});

const view: EncounterViewDto = {
  encounterId: "encounter-1",
  competition: {
    id: "competition-1",
    organizationId: "org-1",
    name: "Liga Futrob",
    timeZone: "America/Lima",
  },
  round: { number: 4, total: 10 },
  scheduledStartAt: "2026-09-17T01:00:00.000Z",
  officialMatchCount: 2,
  home: { teamId: "team-home", name: "Cuervos FC", externalClub: club("club-c", "Cuervos") },
  away: { teamId: "team-away", name: "Maderas FC", externalClub: club("club-m", "Maderas") },
  resolutionMode: "aggregate_score",
  officialMatches: [
    { officialSlot: 1, scheduledStartAt: "2026-09-17T01:00:00.000Z" },
    { officialSlot: 2, scheduledStartAt: "2026-09-17T01:40:00.000Z" },
  ],
};

function candidate(externalId: string, homeGoals: number, awayGoals: number, minute: number) {
  return {
    reference: { providerKey: "ea-clubs", externalId },
    occurredAt: `2026-09-17T01:${String(minute).padStart(2, "0")}:00.000Z`,
    home: { externalClubId: "club-c", name: "Cuervos", goals: homeGoals, imageUrl: null },
    away: { externalClubId: "club-m", name: "Maderas", goals: awayGoals, imageUrl: null },
    game: { edition: "fc26", platform: "ps5", mode: "clubs" },
    metadata: {
      durationSeconds: 1800,
      wasDisconnected: false,
      winnerByForfeit: false,
      completeness: "complete",
    },
    playerObservationCount: 11,
  } satisfies EncounterCandidateDto;
}

const candidates: ListEncounterCandidatesResponse = {
  status: "ready",
  window: { from: "2026-09-16T23:00:00.000Z", to: "2026-09-17T04:00:00.000Z" },
  candidates: [candidate("m-1", 2, 1, 5), candidate("m-2", 1, 1, 45), candidate("m-3", 0, 3, 50)],
};

const json = (data: unknown) => () => Response.json(data);

type Access = { readonly home?: boolean; readonly away?: boolean; readonly approve?: boolean };

/**
 * The Match Center API as one actor sees it. `access` decides what `EffectiveAccess` allows per
 * Team and for approval; `selection` is the persisted read, replaced by each command's `after`.
 */
function matchCenterApi({
  access,
  selection = fx.noSelection(),
  routes = {},
}: {
  readonly access: Access;
  readonly selection?: OfficialSelectionViewDto;
  readonly routes?: Record<string, FakeRoute>;
}) {
  const state = { selection };
  const sent: { path: string; body: Record<string, unknown> }[] = [];
  const command =
    (path: string, after: () => OfficialSelectionViewDto | Response) =>
    (_url: URL, init?: RequestInit) => {
      sent.push({ path, body: JSON.parse(String(init?.body)) as Record<string, unknown> });
      const next = after();
      if (next instanceof Response) return next;
      state.selection = next;
      return Response.json(fx.commandResponse(next));
    };
  const api = installFakeApi({
    "/identity/onboarding": json({
      completed: true,
      completedAt: "2026-09-01T00:00:00.000Z",
      version: 1,
      path: "player",
      currentStep: null,
    }),
    "/identity/account/deletion": json({ deletion: { status: "active" }, blockers: [] }),
    "/organizations/post-auth-destination": json({
      destination: { kind: "personal" },
      memberships: [],
    }),
    "/organizations/org-1/encounters/encounter-1": json(view),
    "/encounters/encounter-1/candidates": json(candidates),
    "/authorization/effective-access": (url) => {
      const permission = url.searchParams.get("permissions") ?? "";
      const teamId = url.searchParams.get("teamId");
      const allowed =
        permission === APPROVE
          ? access.approve === true
          : permission === PROPOSE &&
            ((teamId === "team-home" && access.home === true) ||
              (teamId === "team-away" && access.away === true));
      return Response.json({
        actorId: "actor-1",
        scope: { organizationId: "org-1" },
        roles: [],
        permissions: [{ permission, allowed, decidedAt: "organization" }],
      });
    },
    [SELECTION]: () => Response.json(state.selection),
    [`${SELECTION}/disputes`]: (url, init) =>
      init?.method === "POST"
        ? routes[`${SELECTION}/disputes`]!(url, init)
        : Response.json(state.selection),
    ...Object.fromEntries(
      Object.entries(routes).filter(([path]) => path !== `${SELECTION}/disputes`),
    ),
  });
  return { api, state, sent, command };
}

beforeEach(async () => {
  await saveSession({
    token: "session-token",
    user: { id: "actor-1", name: "Capi", email: "capi@example.com" },
  });
});

afterEach(async () => {
  cleanupApp();
  await clearSession();
  vi.unstubAllGlobals();
});

describe("Match Center on the Encounter route", () => {
  it("lets the home captain assign EA candidates, preview the series and propose it", async () => {
    const harness = matchCenterApi({ access: { home: true } });
    harness.api.routes[`${SELECTION}/proposals`] = harness.command(`${SELECTION}/proposals`, () =>
      fx.pendingSelection([]),
    );
    const user = userEvent.setup();
    renderApp(ROUTE);

    expect(await screen.findByRole("heading", { name: "Cuervos FC VS Maderas FC" })).toBeTruthy();
    expect(await screen.findByText("Actúas por: Cuervos FC")).toBeTruthy();
    expect(await screen.findByText("Aún no hay propuesta")).toBeTruthy();
    expect(
      screen.getByText("Asigna un partido EA a cada partido oficial para ver la serie."),
    ).toBeTruthy();

    // Proposing before both slots are filled names what is missing and sends nothing.
    await user.click(screen.getByRole("button", { name: "Proponer selección" }));
    let dialog = screen.getByRole("dialog", { name: "Proponer la selección al rival" });
    await user.click(within(dialog).getByRole("button", { name: "Enviar propuesta" }));
    expect(
      within(dialog).getByText("Asigna un partido EA a cada partido oficial antes de enviar."),
    ).toBeTruthy();
    expect(harness.sent).toEqual([]);
    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    const [first] = await screen.findAllByRole("button", { name: "Usar en partido 1" });
    await user.click(first!);
    const useInTwo = screen.getAllByRole("button", { name: "Usar en partido 2" });
    await user.click(useInTwo[1]!);
    expect(screen.getByText("Global: Cuervos FC 3–2 Maderas FC · Gana Cuervos FC")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Proponer selección" }));
    dialog = screen.getByRole("dialog", { name: "Proponer la selección al rival" });
    expect(within(dialog).getByText("Partido 1: Cuervos FC 2–1 Maderas FC")).toBeTruthy();
    expect(within(dialog).getByText("Partido 2: Cuervos FC 1–1 Maderas FC")).toBeTruthy();
    await user.click(within(dialog).getByRole("button", { name: "Enviar propuesta" }));

    expect(await screen.findByText("Propuesta enviada al rival.")).toBeTruthy();
    expect(await screen.findByText("Esperando confirmación del rival")).toBeTruthy();
    expect(harness.sent).toEqual([
      {
        path: `${SELECTION}/proposals`,
        body: {
          actingTeamId: "team-home",
          expectedVersion: 0,
          commandKey: expect.any(String),
          selections: [
            { officialSlot: 1, providerMatchRef: { providerKey: "ea-clubs", externalId: "m-1" } },
            { officialSlot: 2, providerMatchRef: { providerKey: "ea-clubs", externalId: "m-2" } },
          ],
        },
      },
    ]);
  });

  it("lets the rival confirm the current proposal at the version it read", async () => {
    const harness = matchCenterApi({
      access: { away: true },
      selection: fx.pendingSelection(["confirm", "reject", "propose_alternative"]),
    });
    const confirm = `${SELECTION}/proposals/proposal-1/confirm`;
    harness.api.routes[confirm] = harness.command(confirm, () => fx.approvedSelection());
    const user = userEvent.setup();
    renderApp(ROUTE);

    expect(await screen.findByText("Actúas por: Maderas FC")).toBeTruthy();
    expect(await screen.findByText("Esperando confirmación del rival")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Confirmar propuesta" }));
    const dialog = screen.getByRole("dialog", { name: "Confirmar la propuesta del rival" });
    expect(within(dialog).getByText("Partido 1: Cuervos FC 2–1 Maderas FC")).toBeTruthy();
    await user.click(within(dialog).getByRole("button", { name: "Confirmar" }));

    expect(await screen.findByText("Propuesta confirmada.")).toBeTruthy();
    expect(await screen.findByText("Resultado oficial aprobado")).toBeTruthy();
    expect(harness.sent).toEqual([
      {
        path: confirm,
        body: { actingTeamId: "team-away", expectedVersion: 1, commandKey: expect.any(String) },
      },
    ]);
  });

  it("requires a reason to reject, keeps the draft on a conflict and resends nothing", async () => {
    const harness = matchCenterApi({
      access: { away: true },
      selection: fx.pendingSelection(["confirm", "reject", "propose_alternative"]),
    });
    const reject = `${SELECTION}/proposals/proposal-1/reject`;
    harness.api.routes[reject] = harness.command(reject, () => {
      harness.state.selection = fx.pendingSelection(["confirm", "reject"], 2);
      return Response.json(
        { code: "results.version_conflict", messageKey: "errors.results.version_conflict" },
        { status: 409 },
      );
    });
    const user = userEvent.setup();
    renderApp(ROUTE);

    await user.click(await screen.findByRole("button", { name: "Rechazar" }));
    const dialog = screen.getByRole("dialog", { name: "Rechazar la propuesta" });
    await user.click(within(dialog).getByRole("button", { name: "Rechazar propuesta" }));
    expect(within(dialog).getByText("Escribe un motivo para continuar.")).toBeTruthy();
    expect(harness.sent).toEqual([]);

    await user.type(within(dialog).getByLabelText("Motivo"), fx.rejectionReason);
    await user.click(within(dialog).getByRole("button", { name: "Rechazar propuesta" }));

    expect(
      await within(dialog).findByText(
        "La selección cambió: leíste la versión 1 y ahora está en la 2. Revisa el estado actual; tu borrador se conserva y no se reenvió nada.",
      ),
    ).toBeTruthy();
    expect(within(dialog).getByLabelText("Motivo")).toHaveProperty("value", fx.rejectionReason);
    expect(harness.sent).toEqual([
      {
        path: reject,
        body: {
          actingTeamId: "team-away",
          expectedVersion: 1,
          commandKey: expect.any(String),
          reason: fx.rejectionReason,
        },
      },
    ]);
  });

  it("opens a dispute with its reason", async () => {
    const harness = matchCenterApi({
      access: { home: true },
      selection: fx.pendingSelection(["open_dispute"]),
      routes: {},
    });
    harness.api.routes[`${SELECTION}/disputes`] = (url, init) =>
      init?.method === "POST"
        ? harness.command(`${SELECTION}/disputes`, () => fx.disputedSelection())(url, init)
        : Response.json(harness.state.selection);
    const user = userEvent.setup();
    renderApp(ROUTE);

    await user.click(await screen.findByRole("button", { name: "Abrir disputa" }));
    const dialog = screen.getByRole("dialog", { name: "Abrir una disputa" });
    await user.type(within(dialog).getByLabelText("Motivo"), "Jugamos otro partido.");
    await user.click(within(dialog).getByRole("button", { name: "Abrir disputa" }));

    expect(await screen.findByText("Disputa abierta.")).toBeTruthy();
    expect(await screen.findByText("Disputa · Abierta")).toBeTruthy();
    expect(harness.sent).toEqual([
      {
        path: `${SELECTION}/disputes`,
        body: {
          actingTeamId: "team-home",
          expectedVersion: 1,
          commandKey: expect.any(String),
          reason: "Jugamos otro partido.",
        },
      },
    ]);
  });

  it("shows no selection or review panel to an actor without those permissions", async () => {
    const harness = matchCenterApi({ access: {} });
    harness.api.routes["/encounters/encounter-1/candidates"] = () => apiError(403);
    renderApp(ROUTE);

    expect(await screen.findByRole("heading", { name: "Cuervos FC VS Maderas FC" })).toBeTruthy();
    expect(await screen.findByText("Candidatos restringidos")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Selección oficial" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Revisión de la organización" })).toBeNull();
    expect(harness.api.requests.some(({ path }) => path.startsWith(SELECTION))).toBe(false);
  });

  it("treats an Encounter of another competition as unavailable", async () => {
    matchCenterApi({ access: { home: true } });
    renderApp("/orgs/org-1/competitions/competition-other/encounters/encounter-1");

    expect(await screen.findByText("Enfrentamiento no disponible")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Partidos EA candidatos" })).toBeNull();
  });

  it("explains why there are no candidates when a club is not connected", async () => {
    const harness = matchCenterApi({ access: { home: true } });
    harness.api.routes["/encounters/encounter-1/candidates"] = json({
      status: "clubs_not_connected",
      sides: ["away"],
    });
    renderApp(ROUTE);

    expect(await screen.findByText("Falta conectar un club EA")).toBeTruthy();
    expect(screen.getByText("Maderas FC no tiene un club EA conectado.")).toBeTruthy();
  });

  it("asks the operator to acknowledge integrity warnings before approving", async () => {
    const harness = matchCenterApi({
      access: { approve: true },
      selection: fx.reviewCase({ integrityFlags: fx.m3Disconnected }),
      routes: {},
    });
    const resolve = `${SELECTION}/disputes/resolve`;
    harness.api.routes[resolve] = harness.command(resolve, () => fx.resolvedByApproval());
    const user = userEvent.setup();
    renderApp(ROUTE);

    expect(
      await screen.findByRole("heading", { name: "Revisión de la organización" }),
    ).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Selección oficial" })).toBeNull();
    await user.click(await screen.findByRole("button", { name: "Aprobar una propuesta" }));
    const dialog = screen.getByRole("dialog", { name: "Aprobar una propuesta" });
    await user.click(within(dialog).getByRole("radio", { name: /Propuesta 2 · ronda 1/ }));
    await user.type(within(dialog).getByLabelText("Motivo"), fx.approvalReason);
    await user.click(within(dialog).getByRole("button", { name: "Aprobar propuesta" }));
    expect(
      within(dialog).getByText("Confirma que revisaste los avisos de integridad para aprobar."),
    ).toBeTruthy();
    expect(harness.sent).toEqual([]);

    await user.click(
      within(dialog).getByRole("checkbox", {
        name: "Revisé los avisos de integridad y apruebo igualmente",
      }),
    );
    await user.click(within(dialog).getByRole("button", { name: "Aprobar propuesta" }));

    expect(await screen.findByText("Propuesta aprobada. El resultado ya es oficial.")).toBeTruthy();
    expect(harness.sent).toEqual([
      {
        path: resolve,
        body: {
          expectedVersion: 4,
          commandKey: expect.any(String),
          reason: fx.approvalReason,
          decision: {
            type: "approve_proposal",
            proposalId: "proposal-2",
            acknowledgeIntegrityFlags: true,
          },
        },
      },
    ]);
  });
});

describe("Match Center entry points", () => {
  const disputes = {
    competition: { id: "competition-1", name: "Liga Futrob", timeZone: "America/Lima" },
    disputes: [
      {
        encounterId: "encounter-1",
        status: "disputed",
        home: { teamId: "team-home", name: "Cuervos FC" },
        away: { teamId: "team-away", name: "Maderas FC" },
        scheduledStartAt: view.scheduledStartAt,
        since: "2026-09-17T04:00:00.000Z",
        dispute: null,
      },
    ],
  };

  it("lists the competition's disputes for an operator and opens the Encounter", async () => {
    const harness = matchCenterApi({ access: { approve: true }, selection: fx.disputeCase() });
    harness.api.routes["/organizations/org-1/competitions/competition-1/disputes"] = json(disputes);
    const user = userEvent.setup();
    renderApp("/orgs/org-1/competitions/competition-1/disputes");

    await user.click(
      await screen.findByRole("button", { name: "Revisar la disputa de Cuervos FC vs Maderas FC" }),
    );
    expect(currentLocation()?.pathname).toBe(ROUTE);
    expect(await screen.findByRole("button", { name: "Tomar el caso" })).toBeTruthy();
  });

  it("shows the empty state when nothing waits on the organization", async () => {
    const harness = matchCenterApi({ access: { approve: true } });
    harness.api.routes["/organizations/org-1/competitions/competition-1/disputes"] = json({
      ...disputes,
      disputes: [],
    });
    renderApp("/orgs/org-1/competitions/competition-1/disputes");

    expect(await screen.findByText("No hay disputas pendientes")).toBeTruthy();
  });

  it("shows a refused disputes list as unavailable, not as empty", async () => {
    const harness = matchCenterApi({ access: {} });
    harness.api.routes["/organizations/org-1/competitions/competition-1/disputes"] = () =>
      apiError(403);
    renderApp("/orgs/org-1/competitions/competition-1/disputes");

    expect(await screen.findByText("Competición no disponible")).toBeTruthy();
    expect(screen.queryByText("No hay disputas pendientes")).toBeNull();
  });
});
