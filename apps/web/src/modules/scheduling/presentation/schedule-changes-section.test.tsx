// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type {
  ScheduleChangeRequestDto,
  ResolveScheduleChangeRequestBody,
} from "@futrob/api-contracts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { encounterView } from "@/modules/results/presentation/encounter-page.fixtures.ts";
import { ScheduleChangesSection } from "./schedule-changes-section.tsx";
import { useScheduleChanges } from "./schedule-change-queries.ts";
import { escalatedScheduleChange } from "./schedule-changes.fixtures.ts";
import { resolutionInstant } from "./schedule-resolution-time.ts";

const clients: QueryClient[] = [];
const PATH = "/api/v1/encounters/encounter-1/schedule-change-requests";
const RESOLVE = `${PATH}/request-1/resolve`;
const view = encounterView({
  home: { ...encounterView().home, teamId: "team-home" },
  away: { ...encounterView().away, teamId: "team-away" },
});
function Harness() {
  const state = useScheduleChanges("encounter-1", true);
  return <ScheduleChangesSection state={state} view={view} />;
}
function mount(locale: "es" | "en" = "es") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  render(
    <QueryClientProvider client={client}>
      <I18nProvider initialLocale={locale}>
        <Harness />
      </I18nProvider>
    </QueryClientProvider>,
  );
  return client;
}
function service(
  initial = escalatedScheduleChange(),
  onResolve?: (body: ResolveScheduleChangeRequestBody) => Promise<Response> | Response,
) {
  let request = initial;
  const received: ResolveScheduleChangeRequestBody[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === PATH && init?.method === "GET")
        return Response.json({
          requests: [request],
          creation: { blockedReason: "permission", teams: [], scopes: [] },
        });
      if (String(input) === RESOLVE && init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as ResolveScheduleChangeRequestBody;
        received.push(body);
        if (onResolve) return onResolve(body);
        request = {
          ...request,
          status: "resolved_by_organizer",
          version: 4,
          allowedActions: [],
          actions: [
            ...request.actions,
            {
              id: "resolved-1",
              kind: "schedule_change_resolved",
              actorId: "organizer-1",
              authority: "organizer",
              proposalId: "proposal-2",
              fromVersion: 3,
              toVersion: 4,
              responseDeadline: "2026-11-01T22:00:00.000Z",
              processedAt: "2026-11-02T09:00:00.000Z",
              resolution: body.resolution,
            },
          ],
        };
        return Response.json({ request, replayed: false });
      }
      return Response.json(
        { code: "api.not_found", messageKey: "errors.fallback" },
        { status: 404 },
      );
    }),
  );
  return {
    received,
    replace: (next: ScheduleChangeRequestDto) => {
      request = next;
    },
  };
}
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.clear());
  vi.unstubAllGlobals();
});

describe("organizer reschedule resolution", () => {
  it("shows the latest deadline, retained partial consent and exactly one expiry in history", async () => {
    const user = userEvent.setup();
    service();
    mount();
    await screen.findByText("Escalada al organizador");
    expect(screen.getByText("Plazo de respuesta: 1 nov 2026, 17:00").textContent).toBe(
      "Plazo de respuesta: 1 nov 2026, 17:00",
    );
    await user.click(screen.getByRole("button", { name: "Historial de propuestas y decisiones" }));
    expect(screen.getByText("Consentimiento de Cuervos FC").textContent).toBe(
      "Consentimiento de Cuervos FC",
    );
    expect(screen.getAllByText(/Plazo vencido el/).map((node) => node.textContent)).toEqual([
      "Plazo vencido el 1 nov 2026, 17:00; escalada procesada el 1 nov 2026, 17:05.",
    ]);
  });
  it("requires a reason and focuses the field before sending any command", async () => {
    const user = userEvent.setup();
    const { received } = service();
    mount();
    await user.click(await screen.findByRole("button", { name: "Guardar resolución" }));
    expect(screen.getByRole("textbox", { name: "Motivo de la resolución" })).toBe(
      document.activeElement,
    );
    expect(screen.getAllByText("Escribe un motivo para cerrar la solicitud.").length).toBe(2);
    expect(received).toEqual([]);
    await user.type(
      screen.getByRole("textbox", { name: "Motivo de la resolución" }),
      "Acuerdo operativo",
    );
    await user.click(screen.getByRole("button", { name: "Guardar resolución" }));
    expect((await screen.findByText("Resuelta por el organizador")).textContent).toBe(
      "Resuelta por el organizador",
    );
  });
  it("sends the competition-local new date as UTC and exposes the saved reason after rereading", async () => {
    const user = userEvent.setup();
    const { received } = service();
    mount();
    const date = await screen.findByLabelText("Nueva fecha y hora");
    await user.clear(date);
    await user.type(date, "2026-11-02T07:00");
    await user.type(
      screen.getByRole("textbox", { name: "Motivo de la resolución" }),
      "  Acuerdo de plantillas  ",
    );
    await user.click(screen.getByRole("button", { name: "Guardar resolución" }));
    await screen.findByText("Resuelta por el organizador");
    expect(received).toEqual([
      {
        proposalId: "proposal-2",
        expectedVersion: 3,
        commandKey: expect.any(String),
        resolution: {
          outcome: "schedule_set",
          reason: "Acuerdo de plantillas",
          proposedStartAt: "2026-11-02T12:00:00.000Z",
        },
      },
    ]);
    await user.click(screen.getByRole("button", { name: "Historial de propuestas y decisiones" }));
    expect(screen.getByText("Acuerdo de plantillas").textContent).toBe("Acuerdo de plantillas");
    expect(screen.queryByRole("button", { name: "Guardar resolución" })).toBeNull();
  });
  it.each(["schedule_kept", "walkover_intended"] as const)(
    "saves %s without sending a date",
    async (outcome) => {
      const user = userEvent.setup();
      const { received } = service();
      mount("en");
      await user.click(
        await screen.findByRole("radio", {
          name: outcome === "schedule_kept" ? "Keep the schedule" : "Record walkover intention",
        }),
      );
      if (outcome === "walkover_intended") {
        expect(screen.getByText(/It creates no official result/).textContent).toBe(
          "Records an intention only. It creates no official result and changes no statistics, standings or bracket.",
        );
        await user.type(
          screen.getByRole("textbox", { name: "Resolution reason" }),
          "Operator decision",
        );
        await user.click(screen.getByRole("button", { name: "Save resolution" }));
        expect((await screen.findByRole("alert")).textContent).toBe(
          "Choose a winning Team to record the intention.",
        );
        expect(received).toEqual([]);
        await user.clear(screen.getByRole("textbox", { name: "Resolution reason" }));
        await user.click(
          within(
            screen.getByRole("radiogroup", { name: "Winning Team for the intention" }),
          ).getByRole("radio", { name: "Maderas FC" }),
        );
      }
      expect(screen.queryByLabelText("New date and time")).toBeNull();
      await user.type(
        screen.getByRole("textbox", { name: "Resolution reason" }),
        "Operator decision",
      );
      await user.click(screen.getByRole("button", { name: "Save resolution" }));
      expect((await screen.findByText("Resolved by the organizer")).textContent).toBe(
        "Resolved by the organizer",
      );
      expect(received.map((body) => body.resolution)).toEqual([
        outcome === "schedule_kept"
          ? { outcome, reason: "Operator decision" }
          : { outcome, reason: "Operator decision", winningTeamId: "team-away" },
      ]);
    },
  );
  it("does not allow resolution without server allowedActions; a permitted neighboring request does", async () => {
    service(escalatedScheduleChange({ allowedActions: [] }));
    const client = mount();
    expect(
      (
        await screen.findByText(
          "Solo un operador con permiso para resolver puede cerrar esta solicitud escalada.",
        )
      ).textContent,
    ).toBe("Solo un operador con permiso para resolver puede cerrar esta solicitud escalada.");
    expect(screen.queryByRole("button", { name: "Guardar resolución" })).toBeNull();
    service();
    await client.invalidateQueries({ queryKey: ["encounters"] });
    expect(
      (await screen.findByRole("button", { name: "Guardar resolución" })).hasAttribute("disabled"),
    ).toBe(false);
  });
  it("reconciles a conflict by rereading, then removes an already resolved request's form", async () => {
    const user = userEvent.setup();
    const api = service(escalatedScheduleChange(), () => {
      api.replace(
        escalatedScheduleChange({
          status: "resolved_by_organizer",
          version: 4,
          allowedActions: [],
        }),
      );
      return Response.json(
        {
          code: "scheduling.schedule_change_concurrency_conflict",
          messageKey: "errors.scheduling.schedule_change_concurrency_conflict",
        },
        { status: 409 },
      );
    });
    mount();
    await user.type(
      await screen.findByRole("textbox", { name: "Motivo de la resolución" }),
      "Resolver",
    );
    await user.click(screen.getByRole("button", { name: "Guardar resolución" }));
    expect((await screen.findByText("Resuelta por el organizador")).textContent).toBe(
      "Resuelta por el organizador",
    );
    expect(screen.queryByRole("button", { name: "Guardar resolución" })).toBeNull();
  });
  it("blocks duplicate submissions while the command is pending", async () => {
    const user = userEvent.setup();
    const { received } = service(
      escalatedScheduleChange(),
      () => new Promise<Response>(() => undefined),
    );
    mount();
    await user.type(
      await screen.findByRole("textbox", { name: "Motivo de la resolución" }),
      "Acuerdo",
    );
    await user.dblClick(screen.getByRole("button", { name: "Guardar resolución" }));
    expect(
      screen.getByRole("button", { name: "Guardando resolución…" }).hasAttribute("disabled"),
    ).toBe(true);
    expect(received.map((body) => body.resolution)).toEqual([
      { outcome: "schedule_set", reason: "Acuerdo", proposedStartAt: "2026-11-03T02:30:00.000Z" },
    ]);
  });
  it("hides history and the resolution form after access is revoked", async () => {
    service();
    const client = mount();
    await screen.findByText("Escalada al organizador");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          { code: "authorization.forbidden", messageKey: "errors.fallback" },
          { status: 403 },
        ),
      ),
    );
    await client.invalidateQueries({ queryKey: ["encounters"] });
    expect(
      (await screen.findByText("No tienes acceso al historial de reprogramaciones.")).textContent,
    ).toBe("No tienes acceso al historial de reprogramaciones.");
    expect(screen.queryByText("Escalada al organizador")).toBeNull();
    expect(screen.queryByRole("textbox", { name: "Motivo de la resolución" })).toBeNull();
  });
  it("reuses the same command key when retrying the same resolution after a network failure", async () => {
    const user = userEvent.setup();
    let attempt = 0;
    const { received } = service(escalatedScheduleChange(), () => {
      attempt += 1;
      if (attempt === 1) throw new TypeError("Network interrupted");
      return Response.json({
        request: escalatedScheduleChange({ status: "resolved_by_organizer", allowedActions: [] }),
        replayed: true,
      });
    });
    mount();
    await user.type(
      await screen.findByRole("textbox", { name: "Motivo de la resolución" }),
      "Acuerdo",
    );
    await user.click(screen.getByRole("button", { name: "Guardar resolución" }));
    await screen.findByRole("alert");
    await user.click(screen.getByRole("button", { name: "Guardar resolución" }));
    await waitFor(() => expect(received.length).toBe(2));
    expect(received[0]).toEqual(received[1]);
    expect(received[0]?.resolution).toEqual({
      outcome: "schedule_set",
      reason: "Acuerdo",
      proposedStartAt: "2026-11-03T02:30:00.000Z",
    });
  });
});

describe("competition-local resolution date", () => {
  it("converts Lima and winter New York dates to literal UTC instants; rejects DST gap and impossible date", () => {
    expect(resolutionInstant("2026-11-02T07:00", "America/Lima")).toBe("2026-11-02T12:00:00.000Z");
    expect(resolutionInstant("2026-11-02T07:00", "America/New_York")).toBe(
      "2026-11-02T12:00:00.000Z",
    );
    expect(resolutionInstant("2026-03-08T02:30", "America/New_York")).toBeNull();
    expect(resolutionInstant("2026-02-30T07:00", "America/Lima")).toBeNull();
  });
});
