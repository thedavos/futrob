// @vitest-environment jsdom
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { createScheduleChangeRequestSchema } from "@futrob/api-contracts";
import { captainCreation, openScheduleChange } from "./schedule-changes.fixtures.ts";
import { resolutionInstant } from "./schedule-resolution-time.ts";
import {
  apiError,
  mountSection,
  PATH,
  scheduleChangeServer,
} from "./schedule-changes.test-server.tsx";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const blockedScopes = captainCreation().scopes.map((option) => ({
  ...option,
  blockedReason: "active_request_exists" as const,
}));

describe("captain reschedule request", () => {
  it("sends a Lima wall time as written and shows the stored instant back in Lima time", async () => {
    const user = userEvent.setup();
    const api = scheduleChangeServer({ requests: [], creation: captainCreation() });
    api.on(PATH, () => {
      const created = openScheduleChange({
        allowedActions: [],
        respondAs: null,
        blockedActions: [
          { action: "accept", reason: "own_proposal" },
          { action: "reject", reason: "own_proposal" },
          { action: "counter", reason: "own_proposal" },
        ],
      });
      api.state.requests = [created];
      api.state.creation = captainCreation({ scopes: blockedScopes });
      return Response.json(created, { status: 201 });
    });
    mountSection();

    await user.click(await screen.findByRole("button", { name: "Solicitar reprogramación" }));
    expect(document.activeElement).toBe(
      screen.getByRole("heading", { name: "Nueva solicitud de reprogramación" }),
    );
    expect(screen.getByText("Solicitas en nombre de Cuervos FC").textContent).toBe(
      "Solicitas en nombre de Cuervos FC",
    );
    await user.type(screen.getByLabelText("Nueva fecha y hora"), "2026-10-11T15:00");
    expect(screen.getByText("11 oct 2026, 15:00").getAttribute("datetime")).toBe(
      "2026-10-11T20:00:00.000Z",
    );
    await user.type(screen.getByRole("textbox", { name: "Motivo para el rival" }), "Viaje");
    await user.click(screen.getByRole("button", { name: "Enviar solicitud" }));

    expect(
      (
        await screen.findByText(
          "Solicitud enviada. El horario no cambia hasta que el rival acepte.",
        )
      ).textContent,
    ).toBe("Solicitud enviada. El horario no cambia hasta que el rival acepte.");
    expect(api.sent).toEqual([
      {
        path: PATH,
        body: {
          requestingTeamId: "team-home",
          scope: { type: "entire_encounter" },
          proposedWallTime: { year: 2026, month: 10, day: 11, hour: 15, minute: 0, second: 0 },
          reason: "Viaje",
          timeZone: "America/Lima",
          idempotencyKey: expect.any(String),
        },
      },
    ]);
    const item = within(screen.getByRole("list", { name: "Reprogramaciones" })).getByRole(
      "listitem",
    );
    expect(within(item).getByText(/^Inicio propuesto/).textContent).toBe(
      "Inicio propuesto: 11 oct 2026, 15:00",
    );
    expect(within(item).getByText(/^Horario actual/).textContent).toBe(
      "Horario actual: 14 sept 2026, 20:00",
    );
    expect(within(item).getByText("Hora de la competición: America/Lima").textContent).toBe(
      "Hora de la competición: America/Lima",
    );
    expect(resolutionInstant("2026-10-11T15:00", "America/Lima")).toBe("2026-10-11T20:00:00.000Z");
    expect(screen.queryByRole("button", { name: "Solicitar reprogramación" })).toBeNull();
    expect(
      screen.getByText("Ya hay una solicitud activa que incluye este horario.").textContent,
    ).toBe("Ya hay una solicitud activa que incluye este horario.");
  });

  it("focuses the invalid date, then returns focus to the trigger on cancel without sending", async () => {
    const user = userEvent.setup();
    const api = scheduleChangeServer({ requests: [], creation: captainCreation() });
    mountSection();
    const trigger = await screen.findByRole("button", { name: "Solicitar reprogramación" });
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Enviar solicitud" }));
    expect(document.activeElement).toBe(screen.getByLabelText("Nueva fecha y hora"));
    expect(
      screen.getAllByText("Introduce una fecha válida en la zona de la competición.").length,
    ).toBe(1);
    await user.type(screen.getByLabelText("Nueva fecha y hora"), "2026-10-11T15:00");
    await user.click(screen.getByRole("button", { name: "Enviar solicitud" }));
    expect(document.activeElement).toBe(
      screen.getByRole("textbox", { name: "Motivo para el rival" }),
    );
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(document.activeElement).toBe(trigger);
    expect(screen.queryByRole("heading", { name: "Nueva solicitud de reprogramación" })).toBeNull();
    expect(api.sent).toEqual([]);
  });

  it("names the Team an organizer acts for and disables the one that reached its limit", async () => {
    const user = userEvent.setup();
    scheduleChangeServer({
      requests: [],
      creation: captainCreation({
        teams: [
          { teamId: "team-home", blockedReason: "limit_reached" },
          { teamId: "team-away", blockedReason: null },
        ],
        scopes: captainCreation().scopes.map((option, index) =>
          index === 0 ? { ...option, blockedReason: "result_protected" } : option,
        ),
      }),
    });
    mountSection("en");
    await user.click(await screen.findByRole("button", { name: "Request reschedule" }));
    expect(screen.getByText("You request on behalf of Maderas FC").textContent).toBe(
      "You request on behalf of Maderas FC",
    );
    expect(screen.getByRole("radio", { name: "Cuervos FC" }).getAttribute("aria-disabled")).toBe(
      "true",
    );
    expect(screen.getByText("Cuervos FC has used all its reschedules.").textContent).toBe(
      "Cuervos FC has used all its reschedules.",
    );
    expect(
      screen.getByRole("radio", { name: "Entire encounter" }).getAttribute("aria-disabled"),
    ).toBe("true");
    expect(screen.getByRole("radio", { name: "Match 1" }).getAttribute("aria-checked")).toBe(
      "true",
    );
  });

  it("keeps the form open with the notice message on the date; an active request closes it", async () => {
    const user = userEvent.setup();
    const api = scheduleChangeServer({ requests: [], creation: captainCreation() });
    api.on(PATH, () =>
      apiError(409, "scheduling.reschedule_notice_not_met", { anchor: "proposed" }),
    );
    mountSection();
    await user.click(await screen.findByRole("button", { name: "Solicitar reprogramación" }));
    await user.type(screen.getByLabelText("Nueva fecha y hora"), "2026-09-14T21:00");
    await user.type(screen.getByRole("textbox", { name: "Motivo para el rival" }), "Viaje");
    await user.click(screen.getByRole("button", { name: "Enviar solicitud" }));
    expect(
      (
        await screen.findByText(
          "La nueva fecha no respeta la antelación mínima. Elige una fecha más lejana.",
        )
      ).textContent,
    ).toBe("La nueva fecha no respeta la antelación mínima. Elige una fecha más lejana.");
    expect(document.activeElement).toBe(screen.getByLabelText("Nueva fecha y hora"));
    const readsAfterNotice = api.reads();
    expect(readsAfterNotice).toBe(2);

    api.on(PATH, () => apiError(409, "scheduling.active_schedule_change_request_exists"));
    await user.clear(screen.getByLabelText("Nueva fecha y hora"));
    await user.type(screen.getByLabelText("Nueva fecha y hora"), "2026-10-11T15:00");
    await user.click(screen.getByRole("button", { name: "Enviar solicitud" }));
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Ya hay una solicitud activa para este horario. Revísala en la lista.",
    );
    expect(screen.queryByRole("heading", { name: "Nueva solicitud de reprogramación" })).toBeNull();
    expect(api.sent.length).toBe(2);
    const [first, second] = api.sent.map(
      (entry) => createScheduleChangeRequestSchema.parse(entry.body).idempotencyKey,
    );
    expect(second).not.toBe(first);
  });
});
