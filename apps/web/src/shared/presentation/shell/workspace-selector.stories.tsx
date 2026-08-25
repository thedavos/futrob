import type { Meta, StoryObj } from "@storybook/react-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import * as stylex from "@stylexjs/stylex";
import { applyHost, typography } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { WORKSPACE_SELECTION_KIND, type WorkspaceSelection } from "./workspace-selection.ts";
import { WorkspaceSelector } from "./workspace-selector.tsx";
import {
  buildWorkspaceSelectorModel,
  type WorkspaceSelectorModel,
} from "./workspace-selector-model.ts";

const styles = stylex.create({
  host: {
    width: "min(18rem, calc(100vw - 2rem))",
  },
  shell: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  row: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  muted: { color: colors.mutedForeground },
  states: {
    display: "flex",
    width: "min(18rem, calc(100vw - 2rem))",
    flexDirection: "column",
    gap: "1rem",
  },
});

type StoryArgs = {
  readonly selectionKind: "personal" | "organization" | "competition";
};

function selectionFor(
  kind: StoryArgs["selectionKind"],
  model: WorkspaceSelectorModel,
): WorkspaceSelection {
  switch (kind) {
    case "organization":
      return {
        kind: WORKSPACE_SELECTION_KIND.organization,
        organizationId: model.organizations[0]?.organizationId ?? "org-1",
        label: model.organizations[0]?.name,
      };
    case "competition":
      return {
        kind: WORKSPACE_SELECTION_KIND.competition,
        competitionId: model.competitions[0]?.competitionId ?? "cmp-1",
        organizationId: model.competitions[0]?.organizationId ?? "org-1",
        label: model.competitions[0]?.name,
      };
    case "personal": {
      const clubId = model.clubs[0]?.externalClubId;
      return clubId
        ? { kind: WORKSPACE_SELECTION_KIND.personal, externalClubId: clubId }
        : { kind: WORKSPACE_SELECTION_KIND.personal };
    }
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function SelectorHost({
  model,
  selectionKind,
}: {
  readonly model: WorkspaceSelectorModel;
  readonly selectionKind: StoryArgs["selectionKind"];
}) {
  const [selection, setSelection] = useState(() => selectionFor(selectionKind, model));
  return (
    <div {...applyHost(undefined, undefined, styles.host)}>
      <WorkspaceSelector
        model={model}
        onRequestAddClub={() => undefined}
        onSelect={setSelection}
        selection={selection}
      />
    </div>
  );
}

function WorkspaceSelectorStoryShell({
  model,
  selectionKind,
}: {
  readonly model: WorkspaceSelectorModel;
  readonly selectionKind: StoryArgs["selectionKind"];
}) {
  const client = useMemo(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      }),
    [],
  );

  const router = useMemo(() => {
    const rootRoute = createRootRoute({
      component: () => (
        <div {...applyHost(undefined, undefined, styles.shell)}>
          <SelectorHost model={model} selectionKind={selectionKind} />
          <Outlet />
        </div>
      ),
    });
    const playerRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/player",
      component: () => null,
    });
    const eaClubsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/player/ea-clubs",
      component: () => null,
    });
    const orgsNewRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/new",
      component: () => null,
    });
    const competitionNewRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId/competitions/new",
      component: () => null,
    });
    return createRouter({
      routeTree: rootRoute.addChildren([
        playerRoute,
        eaClubsRoute,
        orgsNewRoute,
        competitionNewRoute,
      ]),
      history: createMemoryHistory({ initialEntries: ["/player"] }),
    });
  }, [model, selectionKind]);

  return (
    <QueryClientProvider client={client}>
      <I18nProvider initialLocale="es" persistLocale={async () => undefined}>
        <RouterProvider router={router} />
      </I18nProvider>
    </QueryClientProvider>
  );
}

function TriggerStateRow({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}) {
  return (
    <div {...applyHost(undefined, undefined, styles.row)}>
      <p {...applyHost(undefined, undefined, typography.caption, styles.muted)}>{label}</p>
      {children}
    </div>
  );
}

const emptyModel = buildWorkspaceSelectorModel({
  memberships: [],
  competitions: [],
  associatedClubs: [],
});

const singleOfEachModel = buildWorkspaceSelectorModel({
  memberships: [{ organizationId: "org-1", name: "Acme Liga", role: "organizer" }],
  competitions: [
    {
      competitionId: "cmp-1",
      organizationId: "org-1",
      name: "La Copa del Barrio",
      accessRole: "player",
    },
  ],
  associatedClubs: [
    {
      name: "Night Owls",
      imageUrl: null,
      externalClubId: "club-1",
    },
  ],
  clubRosterRoles: [{ externalClubId: "club-1", role: "player" }],
});

const multipleClubsModel = buildWorkspaceSelectorModel({
  memberships: [],
  competitions: [],
  associatedClubs: [
    {
      name: "Night Owls",
      imageUrl: null,
      externalClubId: "club-1",
    },
    {
      name: "Fera Enjaulada",
      imageUrl: null,
      externalClubId: "club-2",
    },
  ],
  clubRosterRoles: [
    { externalClubId: "club-1", role: "player" },
    { externalClubId: "club-2", role: "captain" },
  ],
});

const filledPortfolioModel = buildWorkspaceSelectorModel({
  memberships: [
    { organizationId: "org-1", name: "Acme Liga", role: "organizer" },
    { organizationId: "org-2", name: "Beta FC", role: "staff" },
    { organizationId: "org-3", name: "Gamma", role: "member" },
  ],
  competitions: [
    {
      competitionId: "cmp-1",
      organizationId: "org-1",
      name: "La Copa del Barrio",
      accessRole: "player",
    },
    {
      competitionId: "cmp-2",
      organizationId: "org-2",
      name: "Liga Norte",
      accessRole: "captain",
    },
  ],
  associatedClubs: [
    {
      name: "Night Owls",
      imageUrl: null,
      externalClubId: "club-1",
    },
    {
      name: "Fera Enjaulada",
      imageUrl: null,
      externalClubId: "club-2",
    },
  ],
  clubRosterRoles: [
    { externalClubId: "club-1", role: "vice_captain" },
    { externalClubId: "club-2", role: "captain" },
  ],
});

const meta = {
  title: "Product/Shell/WorkspaceSelector",
  parameters: { layout: "centered" },
  args: {
    selectionKind: "competition" satisfies StoryArgs["selectionKind"],
  },
  argTypes: {
    selectionKind: {
      control: "select",
      options: ["personal", "organization", "competition"],
    },
  },
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

export const Playground: Story = {
  render: (args) => (
    <WorkspaceSelectorStoryShell model={filledPortfolioModel} selectionKind={args.selectionKind} />
  ),
};

export const Empty: Story = {
  name: "Empty",
  args: { selectionKind: "personal" },
  render: (args) => (
    <WorkspaceSelectorStoryShell model={emptyModel} selectionKind={args.selectionKind} />
  ),
};

export const SingleOfEach: Story = {
  name: "One of each section",
  args: { selectionKind: "competition" },
  render: (args) => (
    <WorkspaceSelectorStoryShell model={singleOfEachModel} selectionKind={args.selectionKind} />
  ),
};

export const MultipleClubs: Story = {
  name: "Multiple clubs",
  args: { selectionKind: "personal" },
  render: (args) => (
    <WorkspaceSelectorStoryShell model={multipleClubsModel} selectionKind={args.selectionKind} />
  ),
};

export const FilledPortfolio: Story = {
  name: "Full menu",
  args: { selectionKind: "competition" },
  render: (args) => (
    <WorkspaceSelectorStoryShell model={filledPortfolioModel} selectionKind={args.selectionKind} />
  ),
};

export const TriggerStates: Story = {
  name: "Trigger states",
  render: () => (
    <div {...applyHost(undefined, undefined, styles.states)}>
      <TriggerStateRow label="Personal sin club">
        <WorkspaceSelectorStoryShell model={emptyModel} selectionKind="personal" />
      </TriggerStateRow>
      <TriggerStateRow label="Personal con un club">
        <WorkspaceSelectorStoryShell model={singleOfEachModel} selectionKind="personal" />
      </TriggerStateRow>
      <TriggerStateRow label="Personal con varios clubes">
        <WorkspaceSelectorStoryShell model={multipleClubsModel} selectionKind="personal" />
      </TriggerStateRow>
      <TriggerStateRow label="Organización activa">
        <WorkspaceSelectorStoryShell model={filledPortfolioModel} selectionKind="organization" />
      </TriggerStateRow>
      <TriggerStateRow label="Competición activa">
        <WorkspaceSelectorStoryShell model={filledPortfolioModel} selectionKind="competition" />
      </TriggerStateRow>
    </div>
  ),
};

export const HeaderActions: Story = {
  name: "Header actions",
  args: { selectionKind: "personal" },
  render: (args) => (
    <WorkspaceSelectorStoryShell model={emptyModel} selectionKind={args.selectionKind} />
  ),
};
