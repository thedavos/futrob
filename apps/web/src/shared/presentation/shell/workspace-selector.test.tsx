// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { WorkspaceSelector } from "./workspace-selector.tsx";
import { WORKSPACE_SELECTION_KIND, type WorkspaceSelection } from "./workspace-selection.ts";
import { buildWorkspaceSelectorModel } from "./workspace-selector-model.ts";

const routerMocks = vi.hoisted(() => ({
  navigate: vi.fn<() => void>(),
  pathname: "/player/matches",
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => routerMocks.navigate,
  useRouterState: ({ select }: { select: (state: { location: { pathname: string } }) => string }) =>
    select({ location: { pathname: routerMocks.pathname } }),
}));

afterEach(() => {
  cleanup();
  routerMocks.navigate.mockClear();
  routerMocks.pathname = "/player/matches";
});

function renderSelector(
  model = buildWorkspaceSelectorModel({
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
    associatedClubs: [],
  }),
  options: {
    readonly onSelect?: (selection: WorkspaceSelection) => void;
    readonly selection?: WorkspaceSelection;
  } = {},
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <I18nProvider initialLocale="es" persistLocale={async () => undefined}>
        <WorkspaceSelector
          model={model}
          onRequestAddClub={vi.fn<() => void>()}
          onSelect={options.onSelect ?? vi.fn<() => void>()}
          selection={options.selection ?? { kind: WORKSPACE_SELECTION_KIND.personal }}
        />
      </I18nProvider>
    </QueryClientProvider>,
  );
}

describe("WorkspaceSelector", () => {
  it("shows create actions and role-aware option names", async () => {
    renderSelector();

    const trigger = screen.getByRole("button");
    trigger.click();

    expect(await screen.findByRole("menuitem", { name: "Crear competición" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Añadir club" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Crear organización" })).toBeTruthy();
    expect(screen.getByLabelText("Liga Norte, Organizador")).toBeTruthy();
    expect(screen.getByLabelText("Acme, Organizador")).toBeTruthy();
    expect(screen.getByLabelText("Beta, Staff")).toBeTruthy();
  });

  it("lists associated clubs in the EA Clubs section", async () => {
    const model = buildWorkspaceSelectorModel({
      memberships: [],
      competitions: [],
      associatedClubs: [
        {
          name: "Fera",
          imageUrl: null,
          externalClubId: "club-1",
        },
        {
          name: "Night Owls",
          imageUrl: null,
          externalClubId: "club-2",
        },
      ],
    });

    renderSelector(model);

    screen.getByRole("button").click();
    expect(await screen.findByLabelText("Fera, Jugador")).toBeTruthy();
    expect(screen.getByLabelText("Night Owls, Jugador")).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Añadir club" })).toBeTruthy();
  });

  it("keeps the player on the current route when selecting a club", async () => {
    const onSelect = vi.fn<(selection: WorkspaceSelection) => void>();
    const model = buildWorkspaceSelectorModel({
      memberships: [],
      competitions: [],
      associatedClubs: [
        {
          name: "Fera",
          imageUrl: null,
          externalClubId: "club-1",
        },
        {
          name: "Night Owls",
          imageUrl: null,
          externalClubId: "club-2",
        },
      ],
    });

    renderSelector(model, {
      onSelect,
      selection: { kind: WORKSPACE_SELECTION_KIND.personal, externalClubId: "club-1" },
    });

    screen.getByRole("button").click();
    const selected = await screen.findByLabelText("Fera, Jugador");
    expect(selected.getAttribute("aria-current")).toBe("true");

    screen.getByLabelText("Night Owls, Jugador").click();
    expect(onSelect).toHaveBeenCalledWith({
      kind: WORKSPACE_SELECTION_KIND.personal,
      externalClubId: "club-2",
    });
    expect(routerMocks.navigate).not.toHaveBeenCalled();
  });

  it("shows empty copy in each section when lists are empty", async () => {
    const model = buildWorkspaceSelectorModel({
      memberships: [],
      competitions: [],
      associatedClubs: [],
    });

    renderSelector(model);

    screen.getByRole("button").click();
    expect(await screen.findByText("Sin competiciones todavía")).toBeTruthy();
    expect(screen.getByText("Sin clubes todavía")).toBeTruthy();
    expect(screen.getByText("Sin organizaciones todavía")).toBeTruthy();
  });
});
