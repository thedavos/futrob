import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import type { Locale } from "@/shared/presentation/i18n/catalogs.ts";
import { captainLinks } from "./captain-links.tsx";
import {
  CaptainRosterPageView,
  type CaptainRosterPageViewProps,
} from "./captain-roster-page-view.tsx";
import {
  CaptainStoryFrame,
  captainDetailFixture,
  captainStoryAccess,
} from "./captain-story-frame.tsx";

type StoryArgs = CaptainRosterPageViewProps & { readonly locale: Locale };

const detail = captainDetailFixture();

function CaptainRosterStory({ locale, ...props }: StoryArgs) {
  return (
    <CaptainStoryFrame locale={locale}>
      <CaptainRosterPageView {...props} />
    </CaptainStoryFrame>
  );
}

const meta = {
  title: "Product/Competition/Captain roster",
  component: CaptainRosterStory,
  parameters: { layout: "fullscreen" },
  args: {
    locale: "es",
    access: captainStoryAccess.ready,
    capabilities: {
      manageRoster: true,
      manageRoles: true,
      manageInvitations: true,
      manageExternalClub: true,
    },
    detail,
    error: null,
    links: captainLinks("org-1", "competition-1"),
    onRetry: fn(),
    onRetryDetail: fn(),
    onChangeRole: fn(async () => undefined),
    onSetRosterOpen: fn(async () => undefined),
    onSearchClubs: fn(async () => []),
    onConnectClub: fn(async () => undefined),
  },
  argTypes: { locale: { control: "inline-radio", options: ["es", "en"] } },
} satisfies Meta<typeof CaptainRosterStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("heading", { level: 1, name: "Plantilla" })).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Invitar jugador" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Asociar club" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Cerrar plantilla" })).toBeVisible();
    await expect(canvas.getByLabelText("Rol de Vale Nueve")).toBeVisible();
    // The platform column comes from the declared account, not from a verified link.
    await expect(canvas.getByText("PlayStation · FC 26")).toBeVisible();
    await expect(canvas.getByText("Sin identificador")).toBeVisible();
  },
};

export const OnlyCaptain: Story = {
  args: {
    detail: {
      ...detail,
      roster: { ...detail.roster, memberCount: 1 },
      members: [detail.members[0]!],
    },
  },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByText("Solo estás tú en la plantilla"),
    ).toBeVisible();
  },
};

export const ClosedRoster: Story = {
  args: {
    detail: captainDetailFixture({ state: "closed", lockedAt: "2026-08-11T12:00:00.000Z" }),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Abrir plantilla" }));
    const dialog = within(await within(canvasElement.ownerDocument.body).findByRole("alertdialog"));
    await userEvent.click(dialog.getByRole("button", { name: "Abrir plantilla" }));
    await expect(args.onSetRosterOpen).toHaveBeenCalledWith(true);
  },
};

export const ViceCaptain: Story = {
  name: "Vice-captain (no role changes)",
  args: {
    capabilities: {
      manageRoster: true,
      manageRoles: false,
      manageInvitations: true,
      manageExternalClub: true,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Vale Nueve")).toBeVisible();
    await expect(canvas.queryByLabelText("Rol de Vale Nueve")).toBeNull();
    await expect(canvas.getByRole("button", { name: "Cerrar plantilla" })).toBeVisible();
  },
};

export const EntryRejected: Story = {
  args: { detail: captainDetailFixture({}, "rejected") },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("La inscripción no admite cambios")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Cerrar plantilla" })).toBeDisabled();
    await expect(canvas.queryByRole("link", { name: "Invitar jugador" })).toBeNull();
    await expect(canvas.queryByRole("button", { name: "Asociar club" })).toBeNull();
  },
};

export const NoClub: Story = {
  name: "No EA club",
  args: { detail: { ...detail, externalClub: null } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Sin club EA")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Asociar club" })).toBeVisible();
  },
};

export const LoadingAccess: Story = {
  args: { access: captainStoryAccess.loading, detail: null },
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByRole("status")).toBeVisible();
  },
};

export const LoadingDetail: Story = {
  args: { detail: null },
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByRole("status")).toBeVisible();
  },
};

export const NoTeam: Story = {
  args: { access: captainStoryAccess.noTeam, detail: null },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByRole("link", { name: "Revisar mis invitaciones" }),
    ).toBeVisible();
  },
};

export const Forbidden: Story = {
  args: { access: captainStoryAccess.forbidden, detail: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("No tienes acceso a esta página")).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Ir a Mi equipo" })).toBeVisible();
    await expect(canvas.queryByRole("table")).toBeNull();
  },
};

export const AccessUnavailable: Story = {
  args: { access: captainStoryAccess.unavailable, detail: null },
  play: async ({ args, canvasElement }) => {
    await userEvent.click(await within(canvasElement).findByRole("button", { name: "Reintentar" }));
    await expect(args.onRetry).toHaveBeenCalled();
  },
};

export const RecoverableError: Story = {
  args: {
    detail: null,
    error: {
      message:
        "No pudimos conectar con Futrob. Conservamos tu contexto para que puedas reintentar.",
      requestId: "req_01J8XAMPLE",
    },
  },
  play: async ({ args, canvasElement }) => {
    await userEvent.click(await within(canvasElement).findByRole("button", { name: "Reintentar" }));
    await expect(args.onRetryDetail).toHaveBeenCalled();
  },
};

export const English: Story = {
  args: { locale: "en" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("heading", { level: 1, name: "Roster" })).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Invite player" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Close roster" })).toBeVisible();
    await expect(canvas.getByLabelText("Role of Vale Nueve")).toBeVisible();
    // Shared components are translated too: no Spanish leaks into the English page.
    await expect(canvas.queryByText("Capitán")).toBeNull();
    await expect(canvas.queryByText("Plantilla")).toBeNull();
  },
};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
};
