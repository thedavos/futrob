// @vitest-environment jsdom

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { CompetitionDraftDto, UpdateCompetitionDraftRequest } from "@futrob/api-contracts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import {
  ShellActionBarProvider,
  useShellActionBar,
} from "@/shared/presentation/shell/shell-action-bar.tsx";
import { leagueDraft } from "./competition-rules-fixtures.ts";
import { CompetitionSetupPage, type CompetitionSetupStep } from "./competition-setup-page.tsx";

const updateCompetitionDraft =
  vi.fn<
    (org: string, id: string, input: UpdateCompetitionDraftRequest) => Promise<CompetitionDraftDto>
  >();

vi.mock("./competitions-browser-client.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./competitions-browser-client.ts")>()),
  getCompetitionDraft: async () => leagueDraft,
  listCompetitionParticipants: async () => ({ participants: [] }),
  listOrganizationTeams: async () => ({ teams: [] }),
  updateCompetitionDraft: (org: string, id: string, input: UpdateCompetitionDraftRequest) =>
    updateCompetitionDraft(org, id, input),
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

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("continuing through the competition setup", () => {
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
