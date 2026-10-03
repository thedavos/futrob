import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import type { Locale } from "@/shared/presentation/i18n/catalogs.ts";
import { rosterInvitationLink } from "../roster-invitation-link.ts";
import { captainLinks } from "./captain-links.tsx";
import {
  CaptainInvitationsPageView,
  type CaptainInvitationsPageViewProps,
} from "./captain-invitations-page-view.tsx";
import {
  CaptainStoryFrame,
  captainDetailFixture,
  captainStoryAccess,
} from "./captain-story-frame.tsx";

type StoryArgs = CaptainInvitationsPageViewProps & { readonly locale: Locale };

const INVITATION_URL = rosterInvitationLink("story-token");

function CaptainInvitationsStory({ locale, ...props }: StoryArgs) {
  return (
    <CaptainStoryFrame locale={locale}>
      <CaptainInvitationsPageView {...props} />
    </CaptainStoryFrame>
  );
}

const meta = {
  title: "Product/Competition/Captain invitations",
  component: CaptainInvitationsStory,
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
    detail: captainDetailFixture(),
    error: null,
    invitationUrl: null,
    links: captainLinks("org-1", "competition-1"),
    onRetry: fn(),
    onRetryDetail: fn(),
    onCreateInvitation: fn(async () => undefined),
  },
  argTypes: { locale: { control: "inline-radio", options: ["es", "en"] } },
} satisfies Meta<typeof CaptainInvitationsStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("heading", { level: 1, name: "Invitaciones del equipo" }),
    ).toBeVisible();
    await expect(canvas.getByText("Crea un enlace de invitación")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Invitar" }));
    const dialog = within(await within(canvasElement.ownerDocument.body).findByRole("dialog"));
    await userEvent.click(dialog.getByRole("button", { name: "Crear invitación" }));
    await expect(args.onCreateInvitation).toHaveBeenCalledWith({
      role: "player",
      redeemPolicy: "single",
      inviteeIdentifier: null,
      message: null,
    });
  },
};

export const ViceCaptain: Story = {
  name: "Vice-captain (players only)",
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
    await userEvent.click(await canvas.findByRole("button", { name: "Invitar" }));
    const dialog = within(await within(canvasElement.ownerDocument.body).findByRole("dialog"));
    // Dialogs animate in; wait for them to settle before asserting visibility.
    await waitFor(() =>
      expect(dialog.getByText("Solo el capitán puede invitar con otro rol.")).toBeVisible(),
    );
    await expect(dialog.getByRole("combobox", { name: "Rol inicial" })).toBeDisabled();
  },
};

export const LinkCreated: Story = {
  args: { invitationUrl: INVITATION_URL },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(INVITATION_URL)).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Copiar enlace" })).toBeVisible();
  },
};

export const ClosedRoster: Story = {
  args: {
    detail: captainDetailFixture({ state: "closed", lockedAt: "2026-08-11T12:00:00.000Z" }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("La plantilla está cerrada")).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Ir a la plantilla" })).toBeVisible();
  },
};

export const FullRoster: Story = {
  args: { detail: captainDetailFixture({ memberCount: 11, maxSize: 11 }) },
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByText("La plantilla está llena")).toBeVisible();
  },
};

export const EntryRejected: Story = {
  args: { detail: captainDetailFixture({}, "rejected") },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("La inscripción no admite cambios")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Invitar" })).toBeDisabled();
  },
};

export const LoadingAccess: Story = {
  args: { access: captainStoryAccess.loading, detail: null },
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByRole("status")).toBeVisible();
  },
};

export const NoTeam: Story = {
  args: { access: captainStoryAccess.noTeam, detail: null },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByText("No tienes equipo en esta competición"),
    ).toBeVisible();
  },
};

export const Forbidden: Story = {
  args: { access: captainStoryAccess.forbidden, detail: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText("Solo el capitán y el subcapitán pueden invitar jugadores."),
    ).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Invitar" })).toBeNull();
  },
};

export const RecoverableError: Story = {
  args: { error: { message: "La invitación ya expiró. Crea un enlace nuevo." } },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText("La invitación ya expiró. Crea un enlace nuevo."),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Reintentar" }));
    await expect(args.onRetryDetail).toHaveBeenCalled();
  },
};

export const English: Story = {
  args: { locale: "en", invitationUrl: INVITATION_URL },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("heading", { level: 1, name: "Team invitations" }),
    ).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Copy link" })).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Invite" }));
    const dialog = within(await within(canvasElement.ownerDocument.body).findByRole("dialog"));
    await waitFor(() =>
      expect(dialog.getByRole("button", { name: "Create invitation" })).toBeVisible(),
    );
    await expect(dialog.getByRole("button", { name: "Cancel" })).toBeVisible();
    await expect(dialog.queryByText("Cancelar")).toBeNull();
  },
};

export const Mobile: Story = {
  args: { invitationUrl: INVITATION_URL },
  parameters: { viewport: { defaultViewport: "mobile1" } },
};
