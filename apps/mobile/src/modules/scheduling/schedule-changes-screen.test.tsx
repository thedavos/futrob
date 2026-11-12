import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type {
  EncounterViewDto,
  ListScheduleChangeRequestsResponse,
  ScheduleChangeRequestDto,
} from "@futrob/api-contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { clearSession, saveSession } from "@/modules/identity/session-store";
import { installFakeApi, type FakeRoute } from "../../../test/fake-api";
import { cleanupApp, renderApp } from "../../../test/render-app";

const ROUTE = "/orgs/org-1/competitions/competition-liga/encounters/encounter-1";
const REQUESTS = "/encounters/encounter-1/schedule-change-requests";
const PROPOSAL = `${REQUESTS}/request-1/proposals/proposal-1`;

const view: EncounterViewDto = {
  encounterId: "encounter-1",
  competition: {
    id: "competition-liga",
    organizationId: "org-1",
    name: "Liga Futrob",
    timeZone: "America/Lima",
  },
  round: { number: 4, total: 10 },
  scheduledStartAt: "2026-12-05T01:00:00.000Z",
  officialMatchCount: 1,
  home: { teamId: "team-cuervos", name: "Cuervos FC1", externalClub: null },
  away: { teamId: "team-tigres", name: "Tigres FC", externalClub: null },
  resolutionMode: "independent_matches",
  officialMatches: [{ officialSlot: 1, scheduledStartAt: "2026-12-05T01:00:00.000Z" }],
};

/** Cuervos proposed a new date; the reader answers for Tigres. */
function openRequest(overrides: Partial<ScheduleChangeRequestDto> = {}): ScheduleChangeRequestDto {
  return {
    id: "request-1",
    organizationId: "org-1",
    competitionId: "competition-liga",
    encounterId: "encounter-1",
    requestingTeamId: "team-cuervos",
    initiatedByActorId: "actor-cuervos",
    scope: { type: "entire_encounter" },
    status: "open",
    version: 1,
    currentProposalId: "proposal-1",
    proposals: [
      {
        id: "proposal-1",
        proposedStartAt: "2026-12-06T01:00:00.000Z",
        proposedByActorId: "actor-cuervos",
        proposedByTeamId: "team-cuervos",
        reason: "Medio equipo de viaje",
        createdAt: "2026-11-30T15:00:00.000Z",
        responseDeadline: "2026-12-01T15:00:00.000Z",
      },
    ],
    decisions: [],
    actions: [],
    allowedActions: ["accept", "reject", "counter"],
    respondAs: { authority: "rival_team", teamId: "team-tigres" },
    blockedActions: [],
    application: null,
    createdAt: "2026-11-30T15:00:00.000Z",
    updatedAt: "2026-11-30T15:00:00.000Z",
    ...overrides,
  };
}

const NO_CREATION: ListScheduleChangeRequestsResponse["creation"] = {
  blockedReason: null,
  teams: [{ teamId: "team-tigres", blockedReason: null }],
  scopes: [
    {
      scope: { type: "entire_encounter" },
      currentStartAt: view.scheduledStartAt,
      blockedReason: "active_request_exists",
    },
  ],
};

const json = (data: unknown) => () => Response.json(data);

function encounterApi(list: ListScheduleChangeRequestsResponse, extra: Record<string, FakeRoute>) {
  const state = { list };
  const sent: { path: string; body: Record<string, unknown> }[] = [];
  const command =
    (path: string, after: (body: Record<string, unknown>) => ListScheduleChangeRequestsResponse) =>
    (_url: URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      sent.push({ path, body });
      state.list = after(body);
      return Response.json(
        init?.method === "POST" && path === REQUESTS
          ? state.list.requests[0]
          : { request: state.list.requests[0], replayed: false },
      );
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
    [REQUESTS]: (url, init) =>
      init?.method === "POST" ? extra[REQUESTS]!(url, init) : Response.json(state.list),
    ...Object.fromEntries(Object.entries(extra).filter(([path]) => path !== REQUESTS)),
  });
  return { api, state, sent, command };
}

beforeEach(async () => {
  await saveSession({
    token: "session-token",
    user: { id: "actor-tigres", name: "Capi", email: "capi@example.com" },
  });
});

afterEach(async () => {
  cleanupApp();
  await clearSession();
  vi.unstubAllGlobals();
});

describe("rescheduling on the Encounter route", () => {
  it("lets the rival captain accept the current proposal and shows the applied schedule", async () => {
    const harness = encounterApi({ requests: [openRequest()], creation: NO_CREATION }, {});
    harness.api.routes[`${PROPOSAL}/accept`] = harness.command(`${PROPOSAL}/accept`, () => ({
      creation: NO_CREATION,
      requests: [
        openRequest({
          status: "accepted",
          version: 2,
          allowedActions: [],
          respondAs: null,
          blockedActions: [{ action: "accept", reason: "request_closed" }],
          application: {
            id: "application-1",
            proposalId: "proposal-1",
            requestVersion: 2,
            previousEncounterStartAt: view.scheduledStartAt,
            appliedEncounterStartAt: "2026-12-06T01:00:00.000Z",
            slots: [
              {
                officialSlot: 1,
                previousStartAt: view.scheduledStartAt,
                appliedStartAt: "2026-12-06T01:00:00.000Z",
              },
            ],
            appliedAt: "2026-11-30T16:00:00.000Z",
            appliedByActorId: "actor-tigres",
          },
        }),
      ],
    }));
    const user = userEvent.setup();
    renderApp(ROUTE);

    expect(
      await screen.findByRole("heading", { name: "Cuervos FC1 vs Tigres FC" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Respondes como Tigres FC")).toBeInTheDocument();
    // The active request blocks a second one, as on web.
    expect(screen.queryByRole("button", { name: "Solicitar reprogramación" })).toBeNull();
    expect(
      screen.getByText("Ya hay una solicitud activa que incluye este horario."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Aceptar" }));
    const dialog = screen.getByRole("dialog", { name: "Aceptar la propuesta" });
    await user.click(within(dialog).getByRole("button", { name: "Confirmar aceptación" }));

    expect(
      await screen.findByText(
        "Aceptación registrada. El estado de la solicitud indica si el horario ya cambió.",
      ),
    ).toBeInTheDocument();
    expect(await screen.findByText("Horario aplicado por consentimiento")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Aceptar" })).toBeNull();
    expect(harness.sent).toEqual([
      {
        path: `${PROPOSAL}/accept`,
        body: {
          expectedVersion: 1,
          responder: { authority: "rival_team", teamId: "team-tigres" },
          commandKey: expect.any(String),
        },
      },
    ]);
  });

  it("sends a new request on the competition's wall clock", async () => {
    const creation: ListScheduleChangeRequestsResponse["creation"] = {
      blockedReason: null,
      teams: [{ teamId: "team-tigres", blockedReason: null }],
      scopes: [
        {
          scope: { type: "entire_encounter" },
          currentStartAt: view.scheduledStartAt,
          blockedReason: null,
        },
      ],
    };
    const harness = encounterApi({ requests: [], creation }, {});
    harness.api.routes[REQUESTS] = (url, init) =>
      init?.method === "POST"
        ? harness.command(REQUESTS, () => ({
            creation: NO_CREATION,
            requests: [openRequest({ requestingTeamId: "team-tigres" })],
          }))(url, init)
        : Response.json(harness.state.list);
    const user = userEvent.setup();
    renderApp(ROUTE);

    expect(await screen.findByText("Sin solicitudes de reprogramación")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Solicitar reprogramación" }));
    const dialog = screen.getByRole("dialog", { name: "Nueva solicitud de reprogramación" });
    await user.type(within(dialog).getByLabelText("Fecha"), "2026-12-10");
    await user.type(within(dialog).getByLabelText("Hora"), "21:30");
    await user.type(within(dialog).getByLabelText("Motivo para el rival"), "Torneo local");
    await user.click(within(dialog).getByRole("button", { name: "Enviar solicitud" }));

    expect(
      await screen.findByText("Solicitud enviada. El horario no cambia hasta que el rival acepte."),
    ).toBeInTheDocument();
    expect(harness.sent).toEqual([
      {
        path: REQUESTS,
        body: {
          requestingTeamId: "team-tigres",
          scope: { type: "entire_encounter" },
          proposedWallTime: { year: 2026, month: 12, day: 10, hour: 21, minute: 30, second: 0 },
          reason: "Torneo local",
          timeZone: "America/Lima",
          idempotencyKey: expect.any(String),
        },
      },
    ]);
  });

  it("offers no command to a reader the server does not allow", async () => {
    encounterApi(
      {
        creation: { blockedReason: "permission", teams: [], scopes: [] },
        requests: [
          openRequest({
            allowedActions: [],
            respondAs: null,
            blockedActions: [
              { action: "accept", reason: "permission" },
              { action: "counter", reason: "permission" },
            ],
          }),
        ],
      },
      {},
    );
    renderApp(ROUTE);

    expect(
      await screen.findByText(
        "Solo el capitán rival o el organizador pueden responder a esta propuesta.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Solo el capitán de un equipo de este enfrentamiento puede solicitar una reprogramación.",
      ),
    ).toBeInTheDocument();
    for (const name of ["Aceptar", "Rechazar", "Contraproponer", "Solicitar reprogramación"]) {
      expect(screen.queryByRole("button", { name })).toBeNull();
    }
  });

  it("lets the organizer resolve an escalated request", async () => {
    const escalated = openRequest({
      status: "escalated",
      allowedActions: ["resolve"],
      respondAs: null,
      blockedActions: [{ action: "accept", reason: "response_window_closed" }],
    });
    const harness = encounterApi({ requests: [escalated], creation: NO_CREATION }, {});
    const resolvePath = `${REQUESTS}/request-1/resolve`;
    harness.api.routes[resolvePath] = harness.command(resolvePath, () => ({
      creation: NO_CREATION,
      requests: [{ ...escalated, status: "resolved_by_organizer", allowedActions: [], version: 2 }],
    }));
    const user = userEvent.setup();
    renderApp(ROUTE);

    expect(await screen.findByText("Escalada al organizador")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Resolver solicitud escalada" }));
    const dialog = screen.getByRole("dialog", { name: "Resolver solicitud escalada" });
    await user.click(within(dialog).getByRole("radio", { name: "Conservar horario" }));
    await user.type(within(dialog).getByLabelText("Motivo de la resolución"), "Sin acuerdo");
    await user.click(within(dialog).getByRole("button", { name: "Guardar resolución" }));

    expect(await screen.findByText("Resuelta por el organizador")).toBeInTheDocument();
    expect(harness.sent).toEqual([
      {
        path: resolvePath,
        body: {
          proposalId: "proposal-1",
          expectedVersion: 1,
          commandKey: expect.any(String),
          resolution: { outcome: "schedule_kept", reason: "Sin acuerdo" },
        },
      },
    ]);
  });

  it("closes a stale answer and explains it after a version conflict", async () => {
    const harness = encounterApi({ requests: [openRequest()], creation: NO_CREATION }, {});
    harness.api.routes[`${PROPOSAL}/reject`] = () =>
      Response.json(
        {
          code: "scheduling.schedule_change_version_conflict",
          messageKey: "errors.scheduling.schedule_change_version_conflict",
        },
        { status: 409 },
      );
    const user = userEvent.setup();
    renderApp(ROUTE);

    await user.click(await screen.findByRole("button", { name: "Rechazar" }));
    const dialog = screen.getByRole("dialog", { name: "Rechazar la propuesta" });
    await user.click(within(dialog).getByRole("button", { name: "Confirmar rechazo" }));

    expect(
      await screen.findByText(
        "La propuesta cambió. Revisa la propuesta actual antes de responder.",
      ),
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("does not show an Encounter from another competition", async () => {
    encounterApi({ requests: [], creation: NO_CREATION }, {});
    renderApp("/orgs/org-1/competitions/other-competition/encounters/encounter-1");

    expect(await screen.findByText("Enfrentamiento no disponible")).toBeInTheDocument();
    expect(screen.queryByText("Reprogramaciones")).toBeNull();
  });
});
