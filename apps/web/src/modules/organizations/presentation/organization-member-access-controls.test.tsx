// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type {
  ChangeOrganizationRoleRequest,
  ListAccessGrantsResponse,
  OrganizationRoleAssignmentDto,
} from "@futrob/api-contracts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { QueryTestProvider } from "@/shared/presentation/query/query-test-utils.tsx";
import { OrganizationsClientError } from "./organizations-browser-client.ts";
import { OrganizationMembersSections } from "./organization-members-sections.tsx";
import { MEMBERS_FIXTURE } from "./organization-members-page.fixtures.ts";
import type { MemberAccessManagement } from "./organization-members-model.ts";

const mocks = vi.hoisted(() => ({
  changeMemberRole:
    vi.fn<
      (
        organizationId: string,
        actorId: string,
        input: ChangeOrganizationRoleRequest,
      ) => Promise<OrganizationRoleAssignmentDto>
    >(),
  listMemberGrants:
    vi.fn<(organizationId: string, actorId: string) => Promise<ListAccessGrantsResponse>>(),
}));

vi.mock("./organizations-browser-client.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./organizations-browser-client.ts")>();
  return {
    ...actual,
    organizationsBrowserClient: {
      ...actual.organizationsBrowserClient,
      changeMemberRole: (
        organizationId: string,
        actorId: string,
        input: ChangeOrganizationRoleRequest,
      ) => mocks.changeMemberRole(organizationId, actorId, input),
      listMemberGrants: (organizationId: string, actorId: string) =>
        mocks.listMemberGrants(organizationId, actorId),
    },
  };
});

afterEach(() => {
  cleanup();
  for (const mock of Object.values(mocks)) mock.mockReset();
});

const ready = { kind: "data" as const, items: MEMBERS_FIXTURE, refresh: { kind: "idle" as const } };

function renderSections(manage: MemberAccessManagement) {
  render(
    <I18nProvider initialLocale="es" persistLocale={async () => undefined}>
      <QueryTestProvider>
        <OrganizationMembersSections
          changes={{ kind: "unavailable" }}
          manage={manage}
          members={ready}
        />
      </QueryTestProvider>
    </I18nProvider>,
  );
}

async function selectLucia(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("row", { name: /Lucía Pérez/ }));
  return within(screen.getByRole("region", { name: "Detalle del miembro" }));
}

describe("member role management", () => {
  it("keeps the detail read-only without role or grant capabilities", async () => {
    const user = userEvent.setup();
    renderSections({ organizationId: "org-1", roles: false, grants: false });
    const detail = await selectLucia(user);

    expect(detail.queryByRole("combobox", { name: "Cambiar rol" })).toBeNull();
    expect(detail.queryByText("Permisos específicos")).toBeNull();
    expect(mocks.listMemberGrants).not.toHaveBeenCalled();
  });

  it("changes the selected member's role through the product API", async () => {
    const user = userEvent.setup();
    mocks.changeMemberRole.mockResolvedValue({
      organizationId: "org-1",
      actorId: "member-lucia",
      role: "staff",
      createdAt: "2026-09-18T12:00:00.000Z",
    });
    renderSections({ organizationId: "org-1", roles: true, grants: false });
    const detail = await selectLucia(user);
    const save = detail.getByRole("button", { name: "Guardar rol" });
    expect(save).toBeDisabled();

    await user.click(detail.getByRole("combobox", { name: "Cambiar rol" }));
    await user.click(await screen.findByRole("option", { name: "Staff" }));
    await user.click(save);

    expect(await detail.findByText("Rol actualizado")).toBeVisible();
    expect(mocks.changeMemberRole).toHaveBeenCalledWith("org-1", "member-lucia", {
      role: "staff",
    });
  });

  it("explains the last-organizer protection", async () => {
    const user = userEvent.setup();
    mocks.changeMemberRole.mockRejectedValue(
      new OrganizationsClientError({
        status: 409,
        code: "authorization.last_organizer",
        message: "authorization.last_organizer",
      }),
    );
    renderSections({ organizationId: "org-1", roles: true, grants: false });
    await user.click(screen.getByRole("row", { name: /Ana Torres/ }));
    const detail = within(screen.getByRole("region", { name: "Detalle del miembro" }));

    await user.click(detail.getByRole("combobox", { name: "Cambiar rol" }));
    await user.click(await screen.findByRole("option", { name: "Miembro" }));
    await user.click(detail.getByRole("button", { name: "Guardar rol" }));

    expect(
      await detail.findByText(/La organización necesita al menos un organizador/),
    ).toBeVisible();
  });

  it("explains when the role sits outside the actor's authority", async () => {
    const user = userEvent.setup();
    mocks.changeMemberRole.mockRejectedValue(
      new OrganizationsClientError({
        status: 403,
        code: "authorization.forbidden",
        message: "authorization.forbidden",
      }),
    );
    renderSections({ organizationId: "org-1", roles: true, grants: false });
    const detail = await selectLucia(user);

    await user.click(detail.getByRole("combobox", { name: "Cambiar rol" }));
    await user.click(await screen.findByRole("option", { name: "Organizador" }));
    await user.click(detail.getByRole("button", { name: "Guardar rol" }));

    expect(
      await detail.findByText("No tienes autoridad para asignar o retirar este rol."),
    ).toBeVisible();
    expect(detail.getByRole("button", { name: "Guardar rol" })).toBeEnabled();
  });

  it("lists the member's organization-scoped grants", async () => {
    const user = userEvent.setup();
    mocks.listMemberGrants.mockResolvedValue({
      grants: [
        {
          id: "grant-1",
          organizationId: "org-1",
          actorId: "member-lucia",
          permission: "organizations.update",
          effect: "allow",
          scopeType: "organization",
          scopeId: "org-1",
          grantedByActorId: "member-ana",
          reason: "Cubre la edición del perfil",
          createdAt: "2026-09-18T12:00:00.000Z",
          updatedAt: "2026-09-18T12:00:00.000Z",
        },
      ],
    });
    renderSections({ organizationId: "org-1", roles: false, grants: true });
    const detail = await selectLucia(user);

    expect(await detail.findByText("organizations.update")).toBeVisible();
    expect(detail.getByText("Permitido")).toBeVisible();
    expect(detail.getByText("Cubre la edición del perfil")).toBeVisible();
    expect(mocks.listMemberGrants).toHaveBeenCalledWith("org-1", "member-lucia");
  });
});
