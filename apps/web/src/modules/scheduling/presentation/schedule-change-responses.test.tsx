// @vitest-environment jsdom
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { ScheduleChangeRequestDto } from "@futrob/api-contracts";
import { noCreation, openScheduleChange } from "./schedule-changes.fixtures.ts";
import { command, mountSection, scheduleChangeServer } from "./schedule-changes.test-server.tsx";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const closed = {
  allowedActions: [],
  respondAs: null,
  blockedActions: [
    { action: "accept", reason: "request_closed" },
    { action: "reject", reason: "request_closed" },
    { action: "counter", reason: "request_closed" },
  ],
} satisfies Partial<ScheduleChangeRequestDto>;
const ownProposal = {
  allowedActions: [],
  respondAs: null,
  blockedActions: [
    { action: "accept", reason: "own_proposal" },
    { action: "reject", reason: "own_proposal" },
    { action: "counter", reason: "own_proposal" },
  ],
} satisfies Partial<ScheduleChangeRequestDto>;
const item = () =>
  within(within(screen.getByRole("list", { name: "Reprogramaciones" })).getByRole("listitem"));
const commandReply = (request: ScheduleChangeRequestDto) =>
  Response.json({ request, replayed: false });

describe("rival response to a reschedule proposal", () => {
  it("confirms an accept with the move it makes, and cancel returns focus to Accept", async () => {
    const user = userEvent.setup();
    const api = scheduleChangeServer({ requests: [openScheduleChange()], creation: noCreation });
    api.on(command("accept"), () => {
      api.state.requests = [openScheduleChange({ status: "accepted", version: 2, ...closed })];
      return commandReply(api.state.requests[0]!);
    });
    mountSection();
    expect((await screen.findByText("Respondes como Maderas FC")).textContent).toBe(
      "Respondes como Maderas FC",
    );
    const accept = screen.getByRole("button", { name: "Aceptar" });
    await user.click(accept);
    expect(document.activeElement).toBe(
      screen.getByRole("heading", { name: "Aceptar la propuesta" }),
    );
    expect(screen.getByText(/pasa de/).textContent).toBe(
      "Todo el enfrentamiento pasa de 14 sept 2026, 20:00 a 11 oct 2026, 15:00.",
    );
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(document.activeElement).toBe(accept);

    await user.click(accept);
    await user.click(screen.getByRole("button", { name: "Confirmar aceptación" }));
    expect((await item().findByText("Horario aplicado por consentimiento")).textContent).toBe(
      "Horario aplicado por consentimiento",
    );
    expect(api.sent).toEqual([
      {
        path: command("accept"),
        body: {
          expectedVersion: 1,
          responder: { authority: "rival_team", teamId: "team-away" },
          commandKey: expect.any(String),
        },
      },
    ]);
    expect(screen.queryByRole("button", { name: "Aceptar" })).toBeNull();
  });

  it("rejects with the responder, version and key; the current kickoff stays as it was", async () => {
    const user = userEvent.setup();
    const api = scheduleChangeServer({ requests: [openScheduleChange()], creation: noCreation });
    api.on(command("reject"), () => {
      api.state.requests = [openScheduleChange({ status: "rejected", version: 2, ...closed })];
      return commandReply(api.state.requests[0]!);
    });
    mountSection();
    await user.click(await screen.findByRole("button", { name: "Rechazar" }));
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Motivo (opcional)" }));
    expect(screen.getByText(/^Se mantiene el horario actual: /).textContent).toBe(
      "Se mantiene el horario actual: 14 sept 2026, 20:00.",
    );
    await user.type(screen.getByRole("textbox", { name: "Motivo (opcional)" }), "No podemos");
    await user.click(screen.getByRole("button", { name: "Confirmar rechazo" }));

    expect((await item().findByText("Rechazada")).textContent).toBe("Rechazada");
    expect(api.sent).toEqual([
      {
        path: command("reject"),
        body: {
          expectedVersion: 1,
          responder: { authority: "rival_team", teamId: "team-away" },
          reason: "No podemos",
          commandKey: expect.any(String),
        },
      },
    ]);
    expect(item().getByText(/^Horario actual/).textContent).toBe(
      "Horario actual: 14 sept 2026, 20:00",
    );
    expect(screen.getByRole("status").textContent).toBe(
      "Propuesta rechazada. Se mantiene el horario actual.",
    );
  });

  it("counters with a new date and reason; the author waits while the requester may accept", async () => {
    const user = userEvent.setup();
    const api = scheduleChangeServer({ requests: [openScheduleChange()], creation: noCreation });
    const countered = (reader: Partial<ScheduleChangeRequestDto>) =>
      openScheduleChange({
        version: 2,
        currentProposalId: "proposal-2",
        proposals: [
          openScheduleChange().proposals[0]!,
          {
            id: "proposal-2",
            proposedStartAt: "2026-10-12T23:00:00.000Z",
            proposedByActorId: "captain-away",
            proposedByTeamId: "team-away",
            reason: "Preferimos el lunes",
            createdAt: "2026-09-02T15:00:00.000Z",
            responseDeadline: "2026-09-04T15:00:00.000Z",
          },
        ],
        ...reader,
      });
    api.on(command("counter"), () => {
      api.state.requests = [countered(ownProposal)];
      return commandReply(api.state.requests[0]!);
    });
    const client = mountSection();
    await user.click(await screen.findByRole("button", { name: "Contraproponer" }));
    expect(document.activeElement).toBe(screen.getByLabelText("Nueva fecha y hora"));
    expect(screen.getByText("Contrapropones como Maderas FC").textContent).toBe(
      "Contrapropones como Maderas FC",
    );
    expect(
      screen.getByText("Cuervos FC tendrá que dar su consentimiento de nuevo.").textContent,
    ).toBe("Cuervos FC tendrá que dar su consentimiento de nuevo.");
    await user.type(screen.getByLabelText("Nueva fecha y hora"), "2026-10-12T18:00");
    await user.type(
      screen.getByRole("textbox", { name: "Motivo de la contrapropuesta" }),
      "Preferimos el lunes",
    );
    await user.click(screen.getByRole("button", { name: "Enviar contrapropuesta" }));

    expect(
      (await screen.findByText("Tu equipo hizo esta propuesta. Espera la respuesta del rival."))
        .textContent,
    ).toBe("Tu equipo hizo esta propuesta. Espera la respuesta del rival.");
    expect(api.sent).toEqual([
      {
        path: command("counter"),
        body: {
          expectedVersion: 1,
          teamId: "team-away",
          proposedWallTime: { year: 2026, month: 10, day: 12, hour: 18, minute: 0, second: 0 },
          reason: "Preferimos el lunes",
          timeZone: "America/Lima",
          commandKey: expect.any(String),
        },
      },
    ]);
    expect(screen.queryByRole("button", { name: "Aceptar" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Historial de propuestas y decisiones" }));
    expect(
      ["Dos titulares viajan el día del partido.", "Preferimos el lunes"].map(
        (reason) => item().getAllByText(reason).length,
      ),
    ).toEqual([1, 2]);

    api.state.requests = [
      countered({ respondAs: { authority: "rival_team", teamId: "team-home" } }),
    ];
    await client.invalidateQueries({ queryKey: ["encounters"] });
    expect((await screen.findByText("Respondes como Cuervos FC")).textContent).toBe(
      "Respondes como Cuervos FC",
    );
    expect(screen.getByRole("button", { name: "Aceptar" }).hasAttribute("disabled")).toBe(false);
  });

  it("explains a result-protected proposal once and offers only reject", async () => {
    scheduleChangeServer({
      requests: [
        openScheduleChange({
          allowedActions: ["reject"],
          blockedActions: [
            { action: "accept", reason: "result_protected" },
            { action: "counter", reason: "result_protected" },
          ],
        }),
      ],
      creation: noCreation,
    });
    mountSection("en");
    expect(
      (
        await screen.findAllByText(
          "This kickoff has an approved result, so you cannot accept or counter.",
        )
      ).length,
    ).toBe(1);
    expect(screen.queryByRole("button", { name: "Accept" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Counter" })).toBeNull();
    expect(screen.getByRole("button", { name: "Reject" }).hasAttribute("disabled")).toBe(false);
  });
});
