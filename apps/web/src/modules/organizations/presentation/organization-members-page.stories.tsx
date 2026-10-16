import { useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { expect, userEvent, waitFor, within } from "storybook/test";
import * as stylex from "@stylexjs/stylex";
import { applyStyles } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { Locale } from "@/shared/presentation/i18n/catalogs.ts";
import { OrganizationMembersView } from "./organization-members-page.tsx";
import { configureOrganizationsStory } from "./organizations-story-client.ts";
import {
  MEMBERS_FIXTURE,
  MEMBERS_ACCESS_FIXTURE,
  memberChangesFixture,
} from "./organization-members-page.fixtures.ts";
import type { MembersSectionState } from "./organization-members-model.ts";

type SectionScenario = MembersSectionState<never>["kind"] | "empty" | "refreshError" | "refreshing";

function sectionState<T>(
  scenario: SectionScenario,
  items: readonly T[],
  retry: () => void,
): MembersSectionState<T> {
  switch (scenario) {
    case "loading":
      return { kind: "loading" };
    case "error":
      return { kind: "error", retry };
    case "denied":
      return { kind: "denied" };
    case "unavailable":
      return { kind: "unavailable" };
    case "empty":
      return { kind: "data", items: [], refresh: { kind: "idle" } };
    case "data":
      return { kind: "data", items, refresh: { kind: "idle" } };
    case "refreshError":
      return { kind: "data", items, refresh: { kind: "error", retry } };
    case "refreshing":
      return { kind: "data", items, refresh: { kind: "pending" } };
  }
}

const ORG = "org-story";
const styles = stylex.create({
  frame: { padding: "1.5rem", backgroundColor: colors.background, minWidth: 0 },
  narrow: { maxWidth: "22.5rem" },
});

type StoryArgs = {
  readonly locale: Locale;
  readonly canInvite: boolean;
  readonly accessLoading: boolean;
  readonly creation: "success" | "pending" | "error";
  readonly narrow: boolean;
  readonly restrictedAccess: boolean;
  readonly membersState: SectionScenario;
  readonly changesState: SectionScenario;
};

function MembersStoryShell(args: StoryArgs) {
  const [membersRecovered, setMembersRecovered] = useState(false);
  const [changesRecovered, setChangesRecovered] = useState(false);
  const client = useMemo(() => {
    configureOrganizationsStory({ createInvitation: args.creation });
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: Infinity,
        },
        mutations: { retry: false },
      },
    });
    return queryClient;
  }, [args.accessLoading, args.canInvite, args.creation]);
  return (
    <QueryClientProvider client={client}>
      <I18nProvider initialLocale={args.locale} persistLocale={async () => undefined}>
        <div {...applyStyles(styles.frame, args.narrow && styles.narrow)}>
          <OrganizationMembersView
            changes={sectionState(
              changesRecovered ? "data" : args.changesState,
              memberChangesFixture(args.locale),
              () => setChangesRecovered(true),
            )}
            invite={{
              allowed: args.canInvite && !args.accessLoading,
              loading: args.accessLoading,
              unavailable: false,
            }}
            organizationId={ORG}
            members={sectionState(
              membersRecovered ? "data" : args.membersState,
              args.restrictedAccess ? MEMBERS_ACCESS_FIXTURE : MEMBERS_FIXTURE,
              () => setMembersRecovered(true),
            )}
          />
        </div>
      </I18nProvider>
    </QueryClientProvider>
  );
}

const meta = {
  title: "Product/Organizer/Organizations/Members and roles",
  parameters: { layout: "fullscreen" },
  args: {
    locale: "es",
    canInvite: true,
    accessLoading: false,
    creation: "success",
    narrow: false,
    restrictedAccess: false,
    membersState: "data",
    changesState: "data",
  },
  render: (args) => <MembersStoryShell key={JSON.stringify(args)} {...args} />,
} satisfies Meta<StoryArgs>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Ready: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("heading", { name: "Miembros y roles", level: 1 }),
    ).toBeVisible();
    await expect(
      canvas.getByText("Administra los miembros y sus accesos autorizados"),
    ).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Invitar miembro" })).toBeEnabled();
  },
};

export const English: Story = {
  args: { locale: "en" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("heading", { name: "Members and roles" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Invite member" })).toBeEnabled();
  },
};

export const Narrow: Story = {
  args: { narrow: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const members = canvas.getByRole("region", { name: "Miembros" });
    const detail = canvas.getByRole("region", { name: "Detalle del miembro" });
    await expect(detail.getBoundingClientRect().top).toBeGreaterThan(
      members.getBoundingClientRect().bottom,
    );
    const main = canvas.getByRole("main");
    await expect(main.scrollWidth).toBeLessThanOrEqual(main.clientWidth);
  },
};

export const LoadingAccess: Story = {
  args: { accessLoading: true },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("button", { name: "Invitar miembro" }),
    ).toBeDisabled();
  },
};

export const WithoutInvitationPermission: Story = {
  args: { canInvite: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("heading", { name: "Miembros y roles" })).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Invitar miembro" })).toBeNull();
  },
};

async function openInvitation(canvasElement: HTMLElement) {
  await userEvent.click(
    await within(canvasElement).findByRole("button", { name: "Invitar miembro" }),
  );
  const dialog = await within(canvasElement.ownerDocument.body).findByRole("dialog");
  await waitFor(() => expect(dialog).toBeVisible());
  return within(dialog);
}

export const CreateInvitation: Story = {
  play: async ({ canvasElement }) => {
    const dialog = await openInvitation(canvasElement);
    await waitFor(() =>
      expect(dialog.getByRole("combobox", { name: "Rol en la organización" })).toBeVisible(),
    );
    await userEvent.click(dialog.getByRole("button", { name: "Generar enlace" }));
    await expect(await dialog.findByText("Invitación creada")).toBeVisible();
    await expect(dialog.getByRole("textbox", { name: "Enlace de invitación" })).toHaveValue(
      `${window.location.origin}/invitations/accept/organization-story-token`,
    );
    await expect(dialog.getByRole("button", { name: "Copiar enlace" })).toBeEnabled();
    await userEvent.click(dialog.getByRole("button", { name: "Listo" }));
    await waitFor(() =>
      expect(within(canvasElement).getByRole("button", { name: "Invitar miembro" })).toHaveFocus(),
    );
  },
};

export const CreatingInvitation: Story = {
  args: { creation: "pending" },
  play: async ({ canvasElement }) => {
    const dialog = await openInvitation(canvasElement);
    await userEvent.click(dialog.getByRole("button", { name: "Generar enlace" }));
    await expect(await dialog.findByRole("button", { name: "Generando enlace…" })).toBeDisabled();
  },
};

export const InvitationFailed: Story = {
  args: { creation: "error" },
  play: async ({ canvasElement }) => {
    const dialog = await openInvitation(canvasElement);
    await userEvent.click(dialog.getByRole("button", { name: "Generar enlace" }));
    await expect(
      await dialog.findByText("No pudimos crear la invitación. Inténtalo nuevamente."),
    ).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Generar enlace" })).toBeEnabled();
  },
};

export const SelectMember: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const detail = within(canvas.getByRole("region", { name: "Detalle del miembro" }));
    await expect(detail.getByRole("heading", { name: "Selecciona un miembro" })).toBeVisible();
    const member = within(canvas.getByRole("region", { name: "Miembros" })).getByRole("row", {
      name: /Lucía Pérez/,
    });
    await userEvent.click(member);
    await expect(member).toHaveAttribute("aria-selected", "true");
    await expect(detail.getByRole("heading", { name: "Lucía Pérez" })).toBeVisible();
    await expect(detail.getByText("lucia@example.com")).toBeVisible();
    await expect(detail.getByText("Liga Apertura")).toBeVisible();
    await expect(detail.getByText("Capitán")).toBeVisible();
    await expect(detail.getByText("Copa Futrob")).toBeVisible();
    await expect(detail.getByText("Jugador")).toBeVisible();
    const history = within(canvas.getByRole("region", { name: "Cambios recientes" }));
    await expect(history.queryByRole("button")).toBeNull();
  },
};

export const SelectWithKeyboard: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const members = within(canvas.getByRole("region", { name: "Miembros" }));
    const row = members.getByRole("row", { name: /Lucía Pérez/ });
    row.focus();
    await userEvent.keyboard("{Enter}");
    await expect(row).toHaveAttribute("aria-selected", "true");
    const detail = within(canvas.getByRole("region", { name: "Detalle del miembro" }));
    await expect(detail.getByRole("heading", { name: "Lucía Pérez" })).toBeVisible();
  },
};

export const SearchAndClear: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const members = within(canvas.getByRole("region", { name: "Miembros" }));
    const search = members.getByRole("textbox", { name: "Buscar miembros" });
    await userEvent.type(search, "lucia");
    await expect(members.getByRole("row", { name: /Lucía Pérez/ })).toBeVisible();
    await expect(members.queryByRole("row", { name: /Ana Torres/ })).toBeNull();
    await userEvent.clear(search);
    await userEvent.type(search, "Sin coincidencias");
    await expect(members.getByRole("heading", { name: "No hay coincidencias" })).toBeVisible();
    await expect(members.getByRole("combobox", { name: "Rol" })).toBeVisible();
    await userEvent.click(members.getByRole("button", { name: "Limpiar filtros" }));
    await expect(search).toHaveValue("");
    await expect(members.getByRole("row", { name: /Ana Torres/ })).toBeVisible();
    await expect(members.getAllByRole("row")).toHaveLength(5);
  },
};

export const FilterRoles: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const members = within(canvas.getByRole("region", { name: "Miembros" }));
    await userEvent.click(members.getByRole("combobox", { name: "Rol" }));
    await userEvent.click(
      await within(canvasElement.ownerDocument.body).findByRole("option", {
        name: "Staff",
      }),
    );
    await expect(members.getByRole("row", { name: /Marcos Díaz/ })).toBeVisible();
    await expect(members.queryByRole("row", { name: /Ana Torres/ })).toBeNull();
    await expect(members.getAllByRole("row")).toHaveLength(2);
  },
};

export const ViewDetailsFromMenu: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Acciones de Diego Rojas" }));
    await userEvent.click(
      await within(canvasElement.ownerDocument.body).findByRole("menuitem", {
        name: "Ver detalle",
      }),
    );
    const detail = within(canvas.getByRole("region", { name: "Detalle del miembro" }));
    await expect(detail.getByRole("heading", { name: "Diego Rojas" })).toBeVisible();
    await expect(detail.getByText("Sin accesos asignados")).toBeVisible();
    await expect(detail.getByText("Correo no disponible")).toBeVisible();
    await expect(detail.getByText("Fecha no disponible")).toBeVisible();
  },
};

export const LoadingSections: Story = {
  args: { membersState: "loading", changesState: "loading" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Cargando miembros…")).toBeVisible();
    await expect(canvas.getByText("Cargando cambios recientes…")).toBeVisible();
    await expect(canvas.queryByText("No hay miembros para mostrar")).toBeNull();
  },
};

export const EmptySections: Story = { args: { membersState: "empty", changesState: "empty" } };
export const AccessDenied: Story = {
  args: { canInvite: false, membersState: "denied", changesState: "denied" },
};
export const DataUnavailable: Story = {
  args: { membersState: "unavailable", changesState: "unavailable" },
};

export const MembersError: Story = {
  args: { membersState: "error" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const members = within(canvas.getByRole("region", { name: "Miembros" }));
    await expect(members.getByText("No se pudo cargar el listado de miembros.")).toBeVisible();
    await expect(canvas.getByText("Lucía Pérez recibió acceso a Liga Apertura.")).toBeVisible();
    await userEvent.click(members.getByRole("button", { name: "Reintentar" }));
    await expect(members.getByRole("row", { name: /Ana Torres/ })).toBeVisible();
  },
};

export const ChangesError: Story = {
  args: { changesState: "error" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const history = within(canvas.getByRole("region", { name: "Cambios recientes" }));
    await expect(
      within(canvas.getByRole("region", { name: "Miembros" })).getByRole("row", {
        name: /Ana Torres/,
      }),
    ).toBeVisible();
    await userEvent.click(history.getByRole("button", { name: "Reintentar" }));
    await expect(history.getByText("Lucía Pérez recibió acceso a Liga Apertura.")).toBeVisible();
  },
};

export const RefreshErrorWithData: Story = {
  args: { membersState: "refreshError" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const members = within(canvas.getByRole("region", { name: "Miembros" }));
    await expect(members.getByRole("row", { name: /Lucía Pérez/ })).toBeVisible();
    await userEvent.click(members.getByRole("button", { name: "Reintentar" }));
    await expect(
      members.queryByText(
        "No se pudo actualizar esta sección. Se muestran los últimos datos disponibles.",
      ),
    ).toBeNull();
    await expect(members.getByRole("row", { name: /Lucía Pérez/ })).toBeVisible();
  },
};

export const RefreshingWithData: Story = { args: { membersState: "refreshing" } };

export const RestrictedAccess: Story = {
  args: { restrictedAccess: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("row", { name: /Marcos Díaz/ }));
    const detail = within(canvas.getByRole("region", { name: "Detalle del miembro" }));
    await expect(detail.getByText("Acceso heredado con restricciones")).toBeVisible();
    await expect(detail.getByText("Sin permiso de lectura")).toBeVisible();
    await expect(detail.getByText("Acceso autorizado")).toBeVisible();
    await expect(detail.getByText("Subcapitán")).toBeVisible();
    await expect(detail.queryByText("Todas las competiciones")).toBeNull();
  },
};
