// @vitest-environment jsdom

import { describe, expect, it, vi } from "vite-plus/test";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach } from "vite-plus/test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { WorkspaceSelector } from "./workspace-selector.tsx";
import { WORKSPACE_SELECTION_KIND } from "./workspace-selection.ts";
import { buildWorkspaceSelectorModel } from "./workspace-selector-model.ts";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn<() => void>(),
}));

afterEach(() => {
  cleanup();
});

function renderSelector() {
  const model = buildWorkspaceSelectorModel({
    memberships: [
      { organizationId: "org-1", name: "Acme", role: "organizer" },
      { organizationId: "org-2", name: "Beta", role: "staff" },
    ],
    competitions: [
      {
        competitionId: "cmp-1",
        organizationId: "org-1",
        name: "Liga Norte",
        accessRole: "player",
      },
    ],
    associatedClub: null,
  });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <I18nProvider initialLocale="es" persistLocale={async () => undefined}>
        <WorkspaceSelector
          model={model}
          onRequestAddClub={vi.fn<() => void>()}
          onSelect={vi.fn<() => void>()}
          selection={{ kind: WORKSPACE_SELECTION_KIND.personal }}
        />
      </I18nProvider>
    </QueryClientProvider>,
  );
}

describe("WorkspaceSelector", () => {
  it("shows create competition and add club actions with role-aware option names", async () => {
    renderSelector();

    const trigger = screen.getByRole("button");
    trigger.click();

    expect(await screen.findByRole("menuitem", { name: "Crear competición" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Añadir club" })).toBeTruthy();
    expect(screen.getByLabelText("Liga Norte, Organizador")).toBeTruthy();
    expect(screen.getByLabelText("Acme, Organizador")).toBeTruthy();
    expect(screen.getByLabelText("Beta, Staff")).toBeTruthy();
  });

  it("keeps add club visible when a club is already associated", async () => {
    const model = buildWorkspaceSelectorModel({
      memberships: [],
      competitions: [],
      associatedClub: {
        name: "Fera",
        imageUrl: null,
        externalClubId: "club-1",
      },
    });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    render(
      <QueryClientProvider client={client}>
        <I18nProvider initialLocale="es" persistLocale={async () => undefined}>
          <WorkspaceSelector
            model={model}
            onRequestAddClub={vi.fn<() => void>()}
            onSelect={vi.fn<() => void>()}
            selection={{ kind: WORKSPACE_SELECTION_KIND.personal }}
          />
        </I18nProvider>
      </QueryClientProvider>,
    );

    screen.getByRole("button").click();
    expect(await screen.findByLabelText("Fera, Jugador")).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Añadir club" })).toBeTruthy();
  });
});
