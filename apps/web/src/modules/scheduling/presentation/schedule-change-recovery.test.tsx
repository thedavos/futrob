// @vitest-environment jsdom
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import {
  acceptScheduleChangeProposalRequestSchema,
  type ScheduleChangeRequestDto,
} from "@futrob/api-contracts";
import { captainCreation, noCreation, openScheduleChange } from "./schedule-changes.fixtures.ts";
import {
  apiError,
  command,
  mountSection,
  PATH,
  scheduleChangeServer,
} from "./schedule-changes.test-server.tsx";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const accepted = (version: number) =>
  openScheduleChange({
    status: "accepted",
    version,
    allowedActions: [],
    respondAs: null,
    blockedActions: (["accept", "reject", "counter"] as const).map((action) => ({
      action,
      reason: "request_closed" as const,
    })),
  });
const reply = (request: ScheduleChangeRequestDto) => Response.json({ request, replayed: false });
const keyOf = (body: unknown) => acceptScheduleChangeProposalRequestSchema.parse(body).commandKey;

async function confirmAccept(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: "Aceptar" }));
  await user.click(screen.getByRole("button", { name: "Confirmar aceptación" }));
}

describe("reschedule command recovery", () => {
  it("rereads after a version conflict, shows the current proposal, and accepts it once with a new key", async () => {
    const user = userEvent.setup();
    const api = scheduleChangeServer({ requests: [openScheduleChange()], creation: noCreation });
    api.on(command("accept"), () => {
      api.state.requests = [openScheduleChange({ version: 2 })];
      api.on(command("accept"), () => {
        api.state.requests = [accepted(3)];
        return reply(accepted(3));
      });
      return apiError(409, "scheduling.schedule_change_version_conflict");
    });
    mountSection();
    await confirmAccept(user);

    expect((await screen.findByRole("alert")).textContent).toBe(
      "La propuesta cambió. Revisa la propuesta actual antes de responder.",
    );
    expect(api.reads()).toBe(2);
    expect(screen.getByRole("status").textContent).toBe("");
    expect(screen.queryByRole("heading", { name: "Aceptar la propuesta" })).toBeNull();
    expect(screen.getByText(/^Inicio propuesto/).textContent).toBe(
      "Inicio propuesto: 11 oct 2026, 15:00",
    );

    await confirmAccept(user);
    expect((await screen.findByText("Horario aplicado por consentimiento")).textContent).toBe(
      "Horario aplicado por consentimiento",
    );
    expect(
      api.sent.map(
        (entry) => acceptScheduleChangeProposalRequestSchema.parse(entry.body).expectedVersion,
      ),
    ).toEqual([1, 2]);
    expect(keyOf(api.sent[1]!.body)).not.toBe(keyOf(api.sent[0]!.body));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("keeps the confirm step after a network failure and retries with the same command key", async () => {
    const user = userEvent.setup();
    const api = scheduleChangeServer({ requests: [openScheduleChange()], creation: noCreation });
    api.on(command("accept"), () => {
      api.on(command("accept"), () => {
        api.state.requests = [accepted(2)];
        return reply(accepted(2));
      });
      throw new TypeError("Network interrupted");
    });
    mountSection();
    await confirmAccept(user);
    expect((await screen.findByRole("alert")).textContent).toBe(
      "No pudimos enviar la acción. Vuelve a intentarlo; no se aplicará dos veces.",
    );
    await waitFor(() => expect(api.reads()).toBe(2));
    await user.click(screen.getByRole("button", { name: "Confirmar aceptación" }));

    await screen.findByText("Horario aplicado por consentimiento");
    expect(api.sent.length).toBe(2);
    expect(api.sent[1]!.body).toEqual(api.sent[0]!.body);
  });

  it.each([
    {
      form: "counter",
      path: command("counter"),
      open: "Contraproponer",
      reason: "Motivo de la contrapropuesta",
      submit: "Enviar contrapropuesta",
    },
    {
      form: "create",
      path: PATH,
      open: "Solicitar reprogramación",
      reason: "Motivo para el rival",
      submit: "Enviar solicitud",
    },
  ])(
    "keeps the $form draft and its key when the command and the reread both fail",
    async ({ path, open, reason, submit }) => {
      const user = userEvent.setup();
      const api = scheduleChangeServer({
        requests: [openScheduleChange()],
        creation: captainCreation(),
      });
      api.on(path, () => {
        api.setOffline(true);
        throw new TypeError("Network interrupted");
      });
      mountSection();
      await user.click(await screen.findByRole("button", { name: open }));
      await user.type(screen.getByLabelText("Nueva fecha y hora"), "2026-10-11T15:00");
      await user.type(screen.getByRole("textbox", { name: reason }), "Viaje");
      await user.click(screen.getByRole("button", { name: submit }));

      expect((await screen.findByRole("alert")).textContent).toBe(
        "No pudimos enviar la acción. Vuelve a intentarlo; no se aplicará dos veces.",
      );
      // The list query retries a dropped read twice (1 s, then 2 s) before it reports the failure.
      await screen.findByText(
        "Actualiza las reprogramaciones para enviar. Tu borrador se conserva.",
        {},
        { timeout: 6000 },
      );
      expect(screen.getByRole("button", { name: submit }).hasAttribute("disabled")).toBe(true);
      expect((screen.getByLabelText("Nueva fecha y hora") as HTMLInputElement).value).toBe(
        "2026-10-11T15:00",
      );
      expect((screen.getByRole("textbox", { name: reason }) as HTMLTextAreaElement).value).toBe(
        "Viaje",
      );

      api.setOffline(false);
      api.on(path, () => apiError(409, "scheduling.schedule_change_request_closed"));
      await user.click(screen.getByRole("button", { name: "Actualizar reprogramaciones" }));
      await waitFor(() =>
        expect(screen.getByRole("button", { name: submit }).hasAttribute("disabled")).toBe(false),
      );
      await user.click(screen.getByRole("button", { name: submit }));

      await waitFor(() => expect(api.sent.length).toBe(2));
      expect(api.sent[1]!.body).toEqual(api.sent[0]!.body);
    },
    15_000,
  );

  it.each([
    [
      "scheduling.reschedule_notice_not_met",
      "La fecha propuesta ya no respeta la antelación mínima. Contrapropón otra fecha o rechaza la propuesta.",
    ],
    [
      "scheduling.invalid_schedule_change_date",
      "La fecha propuesta ya pasó. Contrapropón otra fecha o rechaza la propuesta.",
    ],
    [
      "scheduling.schedule_change_response_window_closed",
      "Tu respuesta llegó después del plazo y no se registró. El organizador decide la solicitud.",
    ],
  ])("explains a refused accept (%s) and rereads the request", async (code, message) => {
    const user = userEvent.setup();
    const api = scheduleChangeServer({ requests: [openScheduleChange()], creation: noCreation });
    api.on(command("accept"), () => apiError(409, code, { anchor: "proposed" }));
    mountSection();
    await confirmAccept(user);
    expect((await screen.findByRole("alert")).textContent).toBe(message);
    expect(api.reads()).toBe(2);
    expect(screen.queryByRole("heading", { name: "Aceptar la propuesta" })).toBeNull();
    expect(screen.getByRole("button", { name: "Contraproponer" }).hasAttribute("disabled")).toBe(
      false,
    );
  });

  it("keeps the counter form open with the notice message on its date", async () => {
    const user = userEvent.setup();
    const api = scheduleChangeServer({ requests: [openScheduleChange()], creation: noCreation });
    api.on(command("counter"), () =>
      apiError(409, "scheduling.reschedule_notice_not_met", { anchor: "proposed" }),
    );
    mountSection();
    await user.click(await screen.findByRole("button", { name: "Contraproponer" }));
    await user.type(screen.getByLabelText("Nueva fecha y hora"), "2026-09-14T21:00");
    await user.type(screen.getByRole("textbox", { name: "Motivo de la contrapropuesta" }), "Antes");
    await user.click(screen.getByRole("button", { name: "Enviar contrapropuesta" }));

    expect(
      (
        await screen.findByText(
          "La nueva fecha no respeta la antelación mínima. Elige una fecha más lejana.",
        )
      ).textContent,
    ).toBe("La nueva fecha no respeta la antelación mínima. Elige una fecha más lejana.");
    expect(document.activeElement).toBe(screen.getByLabelText("Nueva fecha y hora"));
    expect(screen.getByRole("textbox", { name: "Motivo de la contrapropuesta" })).toHaveProperty(
      "value",
      "Antes",
    );
    expect(api.reads()).toBe(2);
  });

  it("marks an open draft stale when a reread brings a new version, until it is reopened", async () => {
    const user = userEvent.setup();
    const api = scheduleChangeServer({ requests: [openScheduleChange()], creation: noCreation });
    const client = mountSection();
    await user.click(await screen.findByRole("button", { name: "Aceptar" }));
    api.state.requests = [openScheduleChange({ version: 2 })];
    await client.invalidateQueries({ queryKey: ["encounters"] });

    expect(
      (
        await screen.findByText(
          "La propuesta cambió mientras respondías. Cancela y revisa la propuesta actual.",
        )
      ).textContent,
    ).toBe("La propuesta cambió mientras respondías. Cancela y revisa la propuesta actual.");
    expect(
      screen.getByRole("button", { name: "Confirmar aceptación" }).hasAttribute("disabled"),
    ).toBe(true);
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    await user.click(screen.getByRole("button", { name: "Aceptar" }));
    expect(
      screen.getByRole("button", { name: "Confirmar aceptación" }).hasAttribute("disabled"),
    ).toBe(false);
    expect(api.sent).toEqual([]);
  });
});
