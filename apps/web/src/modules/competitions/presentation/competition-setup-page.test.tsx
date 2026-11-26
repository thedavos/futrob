// @vitest-environment jsdom

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type { CompetitionDraftDto, UpdateCompetitionDraftRequest } from "@futrob/api-contracts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import {
  ShellActionBarProvider,
  useShellActionBar,
} from "@/shared/presentation/shell/shell-action-bar.tsx";
import { leagueDraft } from "./competition-rules-fixtures.ts";
import { CompetitionSetupPage, type CompetitionSetupStep } from "./competition-setup-page.tsx";
import { CompetitionsClientError } from "./competitions-browser-client.ts";

const { getCompetitionDraft, updateCompetitionDraft } = vi.hoisted(() => ({
  getCompetitionDraft: vi.fn(),
  updateCompetitionDraft:
    vi.fn<
      (
        org: string,
        id: string,
        input: UpdateCompetitionDraftRequest,
      ) => Promise<CompetitionDraftDto>
    >(),
}));

vi.mock("./competitions-browser-client.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./competitions-browser-client.ts")>()),
  getCompetitionDraft: () => getCompetitionDraft(),
  listCompetitionParticipants: async () => ({ participants: [] }),
  listOrganizationTeams: async () => ({ teams: [] }),
  updateCompetitionDraft: (org: string, id: string, input: UpdateCompetitionDraftRequest) =>
    updateCompetitionDraft(org, id, input),
}));

vi.mock("@/modules/billing/presentation/plan-upsell-alert.tsx", () => ({
  PlanUpsellAlert: ({ code }: { readonly code: string }) => <p>upsell {code}</p>,
}));

vi.mock("@/shared/presentation/permissions/index.ts", () => ({
  useCapabilities: (_scope: unknown, capabilities: Record<string, unknown>) =>
    Object.fromEntries(Object.keys(capabilities).map((key) => [key, true])),
}));

vi.mock("@/modules/teams/presentation/competition-team-queries.ts", () => ({
  useCompetitionTeamClubNamesQuery: () => ({ data: {}, isPending: false }),
}));

vi.mock("./entry-invitations/use-competition-entry-invitations.tsx", () => ({
  useCompetitionEntryInvitations: () => ({ invite: null, sentInvitations: null, dialog: null }),
}));

function Setup({ initialStep }: Readonly<{ initialStep: CompetitionSetupStep }>) {
  const [step, setStep] = useState(initialStep);
  const { actions } = useShellActionBar();
  return (
    <>
      <CompetitionSetupPage
        competitionId="competition-1"
        currentStep={step}
        onStepChange={setStep}
        organizationId="org-1"
      />
      {actions.map((action) => (
        <span key={action.id}>{action.node}</span>
      ))}
    </>
  );
}

function renderSetup(initialStep: CompetitionSetupStep) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <I18nProvider initialLocale="es" persistLocale={async () => undefined}>
      <QueryClientProvider client={queryClient}>
        <ShellActionBarProvider>
          <Setup initialStep={initialStep} />
        </ShellActionBarProvider>
      </QueryClientProvider>
    </I18nProvider>,
  );
}

const currentStep = () => document.querySelector('[aria-current="step"]')?.textContent;

async function continueFromStep() {
  fireEvent.click(await screen.findByRole("button", { name: "Continuar" }));
}

function deferredSave() {
  let settle: { resolve: (draft: CompetitionDraftDto) => void; reject: (error: Error) => void } = {
    resolve: () => {},
    reject: () => {},
  };
  updateCompetitionDraft.mockReturnValue(
    new Promise((resolve, reject) => {
      settle = { resolve, reject };
    }),
  );
  return () => settle;
}

beforeEach(() => {
  getCompetitionDraft.mockReset();
  getCompetitionDraft.mockResolvedValue(leagueDraft);
  updateCompetitionDraft.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("loading the competition setup", () => {
  it("mirrors the wizard layout with a skeleton instead of a plain loading line", async () => {
    getCompetitionDraft.mockReturnValue(new Promise(() => undefined));
    renderSetup("information");

    const status = await screen.findByRole("status", { name: "Cargando competición…" });
    const main = screen.getByRole("main");
    expect(main.getAttribute("aria-busy")).toBe("true");
    expect(main.contains(status)).toBe(false);
    expect(screen.queryByRole("heading", { name: "Configurar competición" })).toBeNull();
    expect(screen.queryByLabelText("Nombre de la competición")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    expect(main.querySelector("[data-slot='skeleton']")).not.toBeNull();
    expect(
      main.querySelectorAll("a, button, input, select, textarea, [tabindex]:not([tabindex='-1'])"),
    ).toHaveLength(0);
  });

  it("announces loading outside the busy region and clears it when the draft arrives", async () => {
    let resolveDraft: (draft: CompetitionDraftDto) => void = () => {};
    getCompetitionDraft.mockReturnValue(
      new Promise((resolve) => {
        resolveDraft = resolve;
      }),
    );
    renderSetup("information");

    const status = await screen.findByRole("status", { name: "Cargando competición…" });
    expect(screen.getByRole("main").contains(status)).toBe(false);

    resolveDraft(leagueDraft);

    await waitFor(() =>
      expect(screen.queryByRole("status", { name: "Cargando competición…" })).toBeNull(),
    );
    expect(await screen.findByRole("heading", { name: "Configurar competición" })).toBeTruthy();
  });

  it("shows a load error instead of the skeleton", async () => {
    getCompetitionDraft.mockRejectedValue(
      new CompetitionsClientError(404, "competitions.not_found"),
    );
    renderSetup("information");

    expect(
      await screen.findByText("No se pudo cargar el borrador de la competición."),
    ).toBeTruthy();
    expect(screen.queryByRole("status", { name: "Cargando competición…" })).toBeNull();
  });
});

describe("continuing through the competition setup", () => {
  it("shows the plan upsell, not a generic failure, when the plan leaves out the format", async () => {
    updateCompetitionDraft.mockRejectedValue(
      new CompetitionsClientError(402, "competitions.format_not_in_plan"),
    );
    renderSetup("format");

    await continueFromStep();

    expect(await screen.findByText("upsell competitions.format_not_in_plan")).toBeTruthy();
    expect(screen.queryByText(/No se pudo completar la operación/)).toBeNull();
  });

  it("moves from information to format while the draft is still saving", async () => {
    deferredSave();
    renderSetup("information");

    await continueFromStep();

    expect(currentStep()).toContain("Formato");
    expect(screen.getByRole("button", { name: "Continuar" }).hasAttribute("disabled")).toBe(false);
    expect(updateCompetitionDraft).toHaveBeenCalledWith(
      "org-1",
      "competition-1",
      expect.objectContaining({ name: leagueDraft.competition.name, format: "league" }),
    );
  });

  it("stays on rules until the server accepts them", async () => {
    const settle = deferredSave();
    renderSetup("rules");

    await continueFromStep();
    await waitFor(() => expect(updateCompetitionDraft).toHaveBeenCalled());
    expect(currentStep()).toContain("Reglas");
    const waiting = await screen.findByRole("button", { name: "Guardando…" });
    expect(waiting.hasAttribute("disabled")).toBe(true);

    settle().resolve(leagueDraft);

    await waitFor(() => expect(currentStep()).toContain("Participantes"));
  });

  it("lands on participants even if back or save is tried while rules are saving", async () => {
    const settle = deferredSave();
    renderSetup("rules");

    await continueFromStep();
    await screen.findByRole("button", { name: "Guardando…" });
    fireEvent.click(screen.getByRole("button", { name: "Anterior" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar borrador" }));
    expect(currentStep()).toContain("Reglas");
    settle().resolve(leagueDraft);

    await waitFor(() => expect(currentStep()).toContain("Participantes"));
    expect(updateCompetitionDraft).toHaveBeenCalledTimes(1);
  });

  it("keeps the organizer on rules with an error when the server rejects them", async () => {
    const settle = deferredSave();
    renderSetup("rules");

    await continueFromStep();
    await waitFor(() => expect(updateCompetitionDraft).toHaveBeenCalled());
    settle().reject(new Error("competitions.invalid_rules"));

    expect(
      await screen.findByText(
        "No se pudo completar la operación. Revisa los datos e inténtalo de nuevo.",
      ),
    ).toBeTruthy();
    expect(currentStep()).toContain("Reglas");
  });
});
