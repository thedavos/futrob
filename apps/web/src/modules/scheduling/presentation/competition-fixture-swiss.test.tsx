// @vitest-environment jsdom

import type { ReactNode } from "react";
import { FutrobApiError } from "@futrob/sdk";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { CompetitionFixturePageView } from "./competition-fixture-page.tsx";
import { noFixture, swissFixture } from "./competition-fixture.fixtures.ts";
import { competitionFixturePageState } from "./competition-fixture-state.ts";
import type { SwissFixtureCommands } from "./swiss-fixture-commands.ts";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    params: _params,
    to: _to,
    ...props
  }: {
    children?: ReactNode;
    params?: unknown;
    to?: string;
  }) => (
    <a href="#encounter" {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/modules/billing/presentation/plan-upsell-alert.tsx", () => ({
  PlanUpsellAlert: ({ code }: { readonly code: string }) => <p>upsell {code}</p>,
}));

const retry = () => undefined;
const apiError = (status: number, code: string) =>
  new FutrobApiError({ status, body: { code, messageKey: `errors.${code}` } });

function fakeCommands() {
  return {
    generate: vi.fn<SwissFixtureCommands["generate"]>(async () => undefined),
    withdraw: vi.fn<SwissFixtureCommands["withdraw"]>(async () => undefined),
    closeRound: vi.fn<SwissFixtureCommands["closeRound"]>(async () => undefined),
  };
}

function renderSwiss(options: {
  readonly commands?: SwissFixtureCommands;
  readonly canManageSwiss?: boolean;
  readonly locale?: "es" | "en";
}) {
  const state = competitionFixturePageState({
    data: swissFixture,
    failed: false,
    refused: false,
    retry,
    canManageSwiss: options.canManageSwiss ?? false,
  });
  render(
    <I18nProvider initialLocale={options.locale ?? "es"} persistLocale={async () => undefined}>
      <CompetitionFixturePageView
        {...(options.commands ? { commands: options.commands } : {})}
        competitionId="competition-1"
        organizationId="org-1"
        state={state}
      />
    </I18nProvider>,
  );
}

function renderGenerate(commands: SwissFixtureCommands, teamCount = 8) {
  const state = competitionFixturePageState({
    data: noFixture,
    failed: false,
    refused: false,
    retry,
    generate: { timeZone: "America/Lima", teamCount },
  });
  render(
    <I18nProvider initialLocale="es" persistLocale={async () => undefined}>
      <CompetitionFixturePageView
        commands={commands}
        competitionId="competition-1"
        organizationId="org-1"
        state={state}
      />
    </I18nProvider>,
  );
}

afterEach(cleanup);

describe("Swiss fixture rows", () => {
  it("shows an unpaired round with what it waits for and its expected date", () => {
    renderSwiss({});

    expect(screen.getByText("Se empareja cuando se oficialice la ronda 2")).toBeTruthy();
    expect(screen.getByText("Se empareja cuando se oficialice la ronda 3")).toBeTruthy();
    expect(screen.getAllByText(/^Fecha prevista: /)).toHaveLength(2);
  });

  it("does not link a bye or a closed encounter, which have no Encounter page", () => {
    renderSwiss({});

    expect(screen.getByText("Sur United descansa").closest("a")).toBeNull();
    expect(screen.getByText("Maderas FC descansa").closest("a")).toBeNull();
    const closed = screen.getByText("No disputado");
    expect(closed.closest("a")).toBeNull();
    expect(screen.queryByRole("link", { name: /Maderas FC vs/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Sur United vs Descansa/ })).toBeNull();
  });

  it("links a real match and names a withdrawn Team in it", () => {
    renderSwiss({});

    expect(screen.getByRole("link", { name: "Abrir Cuervos FC vs Sur United" })).toBeTruthy();
    const withWithdrawn = screen.getByRole("link", {
      name: "Abrir Cuervos FC vs Norte Athletic (Retirado)",
    });
    expect(within(withWithdrawn).getByText("Retirado")).toBeTruthy();
  });

  it("summarizes progress and withdrawals from the plan", () => {
    renderSwiss({});

    expect(screen.getByText("Rondas emparejadas: 2 de 4")).toBeTruthy();
    expect(screen.getByText("Retirados: Norte Athletic")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Fase suiza" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Ronda 3" })).toBeTruthy();
  });

  it("reads the same rows in English", () => {
    renderSwiss({ locale: "en" });

    expect(screen.getByRole("heading", { name: "Swiss stage" })).toBeTruthy();
    expect(screen.getByText("Paired once round 2 is official")).toBeTruthy();
    expect(screen.getByText("Sur United has a bye")).toBeTruthy();
    expect(screen.getByText("Not played")).toBeTruthy();
  });
});

describe("Swiss organizer actions", () => {
  const openClose = () =>
    fireEvent.click(screen.getByRole("button", { name: "Cerrar ronda sin resultado" }));
  const openWithdraw = () =>
    fireEvent.click(screen.getByRole("button", { name: "Retirar equipo" }));
  const reason = (value: string) =>
    fireEvent.change(screen.getByLabelText("Motivo"), { target: { value } });
  const confirmClose = () =>
    fireEvent.click(screen.getByRole("button", { name: "Confirmar cierre" }));

  it("offers nothing to an actor who cannot manage the schedule", () => {
    renderSwiss({ commands: fakeCommands(), canManageSwiss: false });

    expect(screen.queryByRole("button", { name: "Cerrar ronda sin resultado" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Retirar equipo" })).toBeNull();
  });

  it("offers the actions once, on the round being played", () => {
    renderSwiss({ commands: fakeCommands(), canManageSwiss: true });

    const round2 = screen.getByRole("region", { name: "Ronda 2" });
    expect(within(round2).getByRole("button", { name: "Retirar equipo" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Retirar equipo" })).toHaveLength(1);
  });

  it("spells out the consequences before closing and requires a reason", async () => {
    const commands = fakeCommands();
    renderSwiss({ commands, canManageSwiss: true });

    openClose();
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/se cancela su selección abierta/)).toBeTruthy();
    expect(within(dialog).getByText(/nadie suma puntos/)).toBeTruthy();

    confirmClose();
    expect(await screen.findByText("Escribe el motivo.")).toBeTruthy();
    expect(commands.closeRound).not.toHaveBeenCalled();
  });

  it("closes the current round with the reason and reports it", async () => {
    const commands = fakeCommands();
    renderSwiss({ commands, canManageSwiss: true });

    openClose();
    await screen.findByRole("alertdialog");
    reason("  Venció el plazo ");
    confirmClose();

    await waitFor(() => expect(commands.closeRound).toHaveBeenCalledTimes(1));
    const [plan, round, body] = commands.closeRound.mock.calls[0]!;
    expect([plan, round, body.reason]).toEqual(["fixture-1", 2, "Venció el plazo"]);
    expect(body.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(await screen.findByText("Ronda 2 cerrada sin resultado.")).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("replays the same request id on a retry and a new one on a new open", async () => {
    const commands = fakeCommands();
    commands.closeRound.mockRejectedValueOnce(new TypeError("Network interrupted"));
    renderSwiss({ commands, canManageSwiss: true });

    openClose();
    await screen.findByRole("alertdialog");
    reason("Plazo");
    confirmClose();
    expect(await screen.findByText(/No sabemos si se aplicó/)).toBeTruthy();

    confirmClose();
    await waitFor(() => expect(commands.closeRound).toHaveBeenCalledTimes(2));
    const first = commands.closeRound.mock.calls[0]![2].requestId;
    expect(commands.closeRound.mock.calls[1]![2].requestId).toBe(first);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());

    openClose();
    await screen.findByRole("alertdialog");
    reason("Plazo");
    confirmClose();
    await waitFor(() => expect(commands.closeRound).toHaveBeenCalledTimes(3));
    expect(commands.closeRound.mock.calls[2]![2].requestId).not.toBe(first);
  });

  it("drops the dialog and explains when the round stopped being current", async () => {
    const commands = fakeCommands();
    commands.closeRound.mockRejectedValue(apiError(409, "scheduling.swiss_round_not_current"));
    renderSwiss({ commands, canManageSwiss: true });

    openClose();
    await screen.findByRole("alertdialog");
    reason("Plazo");
    confirmClose();

    expect(await screen.findByText(/Esa ronda ya no es la que se está jugando/)).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("requires a Team and a reason to withdraw, spelling out what the rival gets", async () => {
    const commands = fakeCommands();
    renderSwiss({ commands, canManageSwiss: true });

    openWithdraw();
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/el rival recibe un descanso/)).toBeTruthy();
    expect(within(dialog).getByText(/se cancela la selección abierta/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Confirmar retirada" }));
    expect(await screen.findByText("Selecciona el equipo.")).toBeTruthy();
    expect(screen.getByText("Escribe el motivo.")).toBeTruthy();
    expect(commands.withdraw).not.toHaveBeenCalled();
  });
});

describe("Swiss fixture generation", () => {
  const submit = () => fireEvent.click(screen.getByRole("button", { name: "Generar calendario" }));
  const start = (value: string) =>
    fireEvent.change(screen.getByLabelText("Inicio de la ronda 1"), { target: { value } });

  it("defaults to seven days and ⌈log₂ n⌉ rounds, with the range in the hint", () => {
    renderGenerate(fakeCommands());

    expect(screen.getByLabelText<HTMLInputElement>("Días entre rondas").value).toBe("7");
    expect(screen.getByLabelText<HTMLInputElement>("Número de rondas").value).toBe("3");
    expect(screen.getByText("Recomendadas: 3. Máximo: 4.")).toBeTruthy();
    expect(screen.getByText("Horarios en America/Lima")).toBeTruthy();
  });

  it("explains invalid values beside their field without calling the API", async () => {
    const commands = fakeCommands();
    renderGenerate(commands);

    fireEvent.change(screen.getByLabelText("Número de rondas"), { target: { value: "9" } });
    submit();

    expect(await screen.findByText("Indica una fecha y hora futuras.")).toBeTruthy();
    expect(screen.getByText("Indica entre 1 y 4 rondas.")).toBeTruthy();
    expect(commands.generate).not.toHaveBeenCalled();
  });

  it("generates once per click with a fixed first version", async () => {
    const commands = fakeCommands();
    renderGenerate(commands);

    start("2030-01-15T20:00");
    submit();

    await waitFor(() => expect(commands.generate).toHaveBeenCalledTimes(1));
    expect(commands.generate.mock.calls[0]![0]).toEqual({
      generationVersion: 1,
      startsAt: "2030-01-16T01:00:00.000Z",
      roundIntervalDays: 7,
      homeAndAway: false,
      swiss: { rounds: 3 },
    });
    expect(await screen.findByText("Calendario generado.")).toBeTruthy();
  });

  it("names a generation conflict instead of a generic failure", async () => {
    const commands = fakeCommands();
    commands.generate.mockRejectedValue(apiError(409, "scheduling.fixture_generation_conflict"));
    renderGenerate(commands);

    start("2030-01-15T20:00");
    submit();

    expect(
      await screen.findByText(/Ya existe un calendario generado con otros datos/),
    ).toBeTruthy();
  });

  it("shows the plan upsell for a plan refusal", async () => {
    const commands = fakeCommands();
    commands.generate.mockRejectedValue(apiError(402, "competitions.format_not_in_plan"));
    renderGenerate(commands);

    start("2030-01-15T20:00");
    submit();

    expect(await screen.findByText("upsell competitions.format_not_in_plan")).toBeTruthy();
  });

  it("explains that it needs two approved Teams instead of offering the form", () => {
    renderGenerate(fakeCommands(), 1);

    expect(screen.queryByRole("button", { name: "Generar calendario" })).toBeNull();
    expect(screen.getByText(/al menos 2 equipos aprobados/)).toBeTruthy();
  });
});
