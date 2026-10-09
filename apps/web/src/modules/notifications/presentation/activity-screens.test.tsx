// @vitest-environment jsdom

import type { ComponentType, ReactNode } from "react";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { ActivityEntryDto, ListActivitiesResponse } from "@futrob/api-contracts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import {
  createTestQueryClient,
  QueryTestProvider,
} from "@/shared/presentation/query/query-test-utils.tsx";
import type { ActivityListQuery } from "./activity-browser-client.ts";
import { OrganizationActivityPage } from "./organization-activity-page.tsx";
import { OrganizationRecentActivity } from "./organization-recent-activity.tsx";
import { ShellPendingQueue } from "./shell-pending-queue.tsx";

const listForOrganization =
  vi.fn<(organizationId: string, query?: ActivityListQuery) => Promise<ListActivitiesResponse>>();
const listMine = vi.fn<(query?: ActivityListQuery) => Promise<ListActivitiesResponse>>();

vi.mock("@/modules/notifications/presentation/activity-browser-client.ts", async (original) => ({
  ...(await original<typeof import("./activity-browser-client.ts")>()),
  activityBrowserClient: {
    listForOrganization: (organizationId: string, query?: ActivityListQuery) =>
      listForOrganization(organizationId, query),
    listMine: (query?: ActivityListQuery) => listMine(query),
  },
}));

function href(to: string, params?: Readonly<Record<string, string>>): string {
  return Object.entries(params ?? {}).reduce(
    (path, [key, value]) => path.replace(`$${key}`, value),
    to,
  );
}

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    children,
    ...props
  }: {
    to: string;
    params?: Readonly<Record<string, string>>;
    children?: ReactNode;
  }) => (
    <a href={href(to, params)} {...props}>
      {children}
    </a>
  ),
  createLink:
    (Component: ComponentType<{ href: string }>) =>
    ({ to, params, ...props }: { to: string; params?: Readonly<Record<string, string>> }) => (
      <Component href={href(to, params)} {...props} />
    ),
}));

const ORG = "org-a";

function entry(
  overrides: Partial<ActivityEntryDto> & Pick<ActivityEntryDto, "id">,
): ActivityEntryDto {
  return {
    organizationId: ORG,
    competitionId: "cmp-a",
    audience: "organization",
    kind: "match_dispute",
    status: "open",
    requiresAction: true,
    resourceType: "encounter",
    resourceId: "enc-1",
    subject: { competitionName: "Liga A", encounterLabel: "Cuervos vs Halcones", teamName: null },
    openedAt: "2026-10-07T10:00:00.000Z",
    closedAt: null,
    expiresAt: null,
    lastEventAt: "2026-10-07T10:00:00.000Z",
    ...overrides,
  };
}

const dispute = entry({ id: "dispute" });
const resolvedDispute = entry({
  id: "dispute",
  status: "closed",
  closedAt: "2026-10-07T12:00:00.000Z",
  lastEventAt: "2026-10-07T12:00:00.000Z",
});
const publication = entry({
  id: "publication",
  kind: "competition_published",
  status: "closed",
  requiresAction: false,
  resourceType: "competition",
  resourceId: "cmp-a",
  subject: { competitionName: "Liga A", encounterLabel: null, teamName: null },
  openedAt: "2026-10-07T11:00:00.000Z",
  closedAt: "2026-10-07T11:00:00.000Z",
  lastEventAt: "2026-10-07T11:00:00.000Z",
});

function page(activities: readonly ActivityEntryDto[], nextCursor: string | null = null) {
  return { activities: [...activities], nextCursor };
}

function many(count: number, prefix: string): ActivityEntryDto[] {
  return Array.from({ length: count }, (_, index) =>
    entry({
      id: `${prefix}-${index}`,
      subject: { ...dispute.subject, encounterLabel: `Match ${prefix}-${index}` },
    }),
  );
}

function renderWith(ui: ReactNode, client = createTestQueryClient()) {
  return {
    client,
    ...render(
      <I18nProvider initialLocale="es">
        <QueryTestProvider client={client}>{ui}</QueryTestProvider>
      </I18nProvider>,
    ),
  };
}

function operatorQueue() {
  return (
    <>
      <nav aria-label="Pendientes">
        <ShellPendingQueue
          allowedPermissions={new Set(["encounters.results.approve"])}
          selection={{ kind: "organization", organizationId: ORG }}
        />
      </nav>
      <OrganizationRecentActivity organizationId={ORG} />
    </>
  );
}

describe("activity screens", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("puts the open dispute in Pendientes and both facts in Actividad reciente, newest first", async () => {
    listForOrganization.mockImplementation(async (_organizationId, query) =>
      query?.requiresAction ? page([dispute]) : page([publication, dispute]),
    );
    const { client } = renderWith(operatorQueue());

    const pending = screen.getByRole("navigation", { name: "Pendientes" });
    expect(await within(pending).findByText("Resolver disputa")).toBeTruthy();
    expect(within(pending).queryByText("Competición publicada")).toBeNull();
    expect(listForOrganization).toHaveBeenCalledWith(ORG, {
      status: "open",
      requiresAction: true,
      limit: 50,
    });
    expect(listForOrganization).toHaveBeenCalledWith(ORG, { limit: 10 });

    const recent = await screen.findByRole("list", { name: "Actividad reciente" });
    const titles = within(recent)
      .getAllByRole("listitem")
      .map((item) => item.querySelector("span span")?.textContent);
    expect(titles).toEqual(["Competición publicada", "Resolver disputa"]);
    expect(within(recent).getByText("Resolver disputa").closest("a")?.getAttribute("href")).toBe(
      "/orgs/org-a/competitions/cmp-a/disputes",
    );

    listForOrganization.mockImplementation(async (_organizationId, query) =>
      query?.requiresAction ? page([]) : page([resolvedDispute, publication]),
    );
    await client.invalidateQueries();
    expect(await within(pending).findByText("Nada por ahora")).toBeTruthy();
    expect(await within(recent).findByText("Disputa resuelta")).toBeTruthy();
  });

  it("shows at most ten rows with a link to the full feed, and no link when empty", async () => {
    listForOrganization.mockResolvedValue(page(many(12, "row"), "cursor"));
    renderWith(<OrganizationRecentActivity organizationId={ORG} />);
    const recent = await screen.findByRole("list", { name: "Actividad reciente" });
    expect(within(recent).getAllByRole("listitem")).toHaveLength(10);
    expect(screen.getByRole("link", { name: "Ver toda la actividad" }).getAttribute("href")).toBe(
      "/orgs/org-a/activity",
    );

    cleanup();
    listForOrganization.mockResolvedValue(page([]));
    renderWith(<OrganizationRecentActivity organizationId={ORG} />);
    expect(await screen.findByText(/Todavía no hay actividad/)).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Ver toda la actividad" })).toBeNull();
  });

  it("pages the full feed with «Cargar más» until the last page", async () => {
    const first = many(25, "first");
    const second = many(5, "second");
    listForOrganization.mockImplementation(async (_organizationId, query) =>
      query?.cursor === "next" ? page(second) : page(first, "next"),
    );
    renderWith(<OrganizationActivityPage organizationId={ORG} />);

    const feed = await screen.findByRole("list", { name: "Actividad" });
    expect(within(feed).getAllByRole("listitem")).toHaveLength(25);
    await userEvent.click(screen.getByRole("button", { name: "Cargar más" }));
    await waitFor(() => expect(within(feed).getAllByRole("listitem")).toHaveLength(30));
    expect(screen.queryByRole("button", { name: "Cargar más" })).toBeNull();
    expect(listForOrganization).toHaveBeenLastCalledWith(ORG, { limit: 25, cursor: "next" });
  });

  it("tells a member without access that the feed is not theirs", async () => {
    const { ActivityClientError } = await import("./activity-browser-client.ts");
    listForOrganization.mockRejectedValue(new ActivityClientError(403, "authorization.forbidden"));
    renderWith(<OrganizationActivityPage organizationId={ORG} />);
    expect(await screen.findByText("No puedes ver esta actividad")).toBeTruthy();
  });

  it("asks the server for the active space so the limit never hides its rows", async () => {
    listForOrganization.mockResolvedValue(page([dispute]));
    listMine.mockResolvedValue(page([]));
    renderWith(
      <>
        <ShellPendingQueue
          allowedPermissions={new Set(["encounters.results.approve"])}
          selection={{ kind: "competition", competitionId: "cmp-a", organizationId: ORG }}
        />
        <ShellPendingQueue
          allowedPermissions={new Set()}
          selection={{ kind: "organization", organizationId: "org-b" }}
        />
      </>,
    );
    expect(await screen.findByText("Resolver disputa")).toBeTruthy();
    expect(listForOrganization).toHaveBeenCalledWith(ORG, {
      status: "open",
      requiresAction: true,
      limit: 50,
      competitionId: "cmp-a",
    });
    expect(listMine).toHaveBeenCalledWith({
      status: "open",
      requiresAction: true,
      limit: 50,
      competitionId: undefined,
      organizationId: "org-b",
    });
  });

  it("lists the invitee's own invitation in the personal space", async () => {
    listMine.mockResolvedValue(
      page([
        entry({
          id: "invitation",
          audience: "actor",
          kind: "roster_invitation",
          resourceType: "roster_invitation",
          resourceId: "inv-1",
          subject: { competitionName: "Liga A", encounterLabel: null, teamName: "Cuervos" },
        }),
      ]),
    );
    renderWith(
      <ShellPendingQueue allowedPermissions={new Set()} selection={{ kind: "personal" }} />,
    );
    const link = (await screen.findByText("Responder invitación")).closest("a");
    expect(link?.getAttribute("href")).toBe("/invitations");
    expect(screen.getByText("Cuervos · Liga A")).toBeTruthy();
    expect(listForOrganization).not.toHaveBeenCalled();
  });
});
