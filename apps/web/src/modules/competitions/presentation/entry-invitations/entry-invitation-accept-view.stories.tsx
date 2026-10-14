import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import type { EntryInvitationPreviewDto } from "@futrob/api-contracts";
import { competitionPlatformLabel } from "../competition-draft-meta.ts";
import { CompetitionsClientError } from "../competitions-browser-client.ts";
import {
  EntryInvitationAcceptView,
  type EntryInvitationPreviewState,
} from "./entry-invitation-accept-view.tsx";

function preview(overrides: Partial<EntryInvitationPreviewDto> = {}): EntryInvitationPreviewDto {
  return {
    invitation: {
      id: "inv-1",
      channel: "directed",
      status: "pending",
      message: "¡Hola! Nos gustaría contar con Cóndor FC en nuestra próxima liga.",
      expiresAt: "2026-10-27T12:00:00.000Z",
    },
    competition: {
      id: "cmp-1",
      organizationId: "org-1",
      organizationName: "Liga Andina",
      name: "Liga Interclubes",
      platform: "nintendo-switch-2",
      gameEdition: "FC 26",
      status: "draft",
    },
    suggestedTeamName: "Cóndor FC",
    existing: null,
    ...overrides,
  };
}

function coded(code: string): CompetitionsClientError {
  return new CompetitionsClientError(409, code);
}

const meta = {
  title: "Product/Competitions/Entry invitation",
  component: EntryInvitationAcceptView,
  parameters: { layout: "padded" },
  args: {
    state: { kind: "ready", preview: preview() } satisfies EntryInvitationPreviewState,
    platformLabel: competitionPlatformLabel,
    onAccept: fn(async () => {}),
    onDecline: fn(async () => {}),
    onOpenCompetition: fn(),
  },
  argTypes: {
    state: { control: false },
    platformLabel: { control: false },
  },
} satisfies Meta<typeof EntryInvitationAcceptView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const AcceptDirected: Story = {
  name: "Aceptar invitación directa",
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/Nos gustaría contar con Cóndor FC/)).toBeVisible();
    const name = canvas.getByRole("textbox", { name: "Nombre de tu equipo" });
    await expect(name).toHaveValue("Cóndor FC");
    await userEvent.clear(name);
    await userEvent.click(canvas.getByRole("button", { name: "Aceptar e inscribir equipo" }));
    await expect(canvas.getByText("Escribe el nombre de tu equipo.")).toBeVisible();
    await expect(args.onAccept).not.toHaveBeenCalled();
    await userEvent.type(name, "  Los Cóndores  ");
    await userEvent.click(canvas.getByRole("button", { name: "Aceptar e inscribir equipo" }));
    await waitFor(() => expect(args.onAccept).toHaveBeenCalledWith("Los Cóndores"));
  },
};

export const Decline: Story = {
  name: "Rechazar",
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Rechazar" }));
    await waitFor(() => expect(args.onDecline).toHaveBeenCalledTimes(1));
    await expect(await canvas.findByText(/Rechazaste la invitación/)).toBeVisible();
    await expect(canvas.queryByRole("textbox", { name: "Nombre de tu equipo" })).toBeNull();
  },
};

export const SharedLink: Story = {
  name: "Por enlace",
  args: {
    state: {
      kind: "ready",
      preview: preview({
        invitation: {
          id: "link-1",
          channel: "link",
          status: "pending",
          message: null,
          expiresAt: null,
        },
        suggestedTeamName: null,
      }),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("textbox", { name: "Nombre de tu equipo" })).toHaveValue("");
    await expect(canvas.queryByRole("button", { name: "Rechazar" })).toBeNull();
    await expect(canvas.getByText("Organiza Liga Andina")).toBeVisible();
  },
};

export const CapacityReached: Story = {
  name: "Cupo lleno",
  args: {
    onAccept: fn(async () => {
      throw coded("competitions.capacity_reached");
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Aceptar e inscribir equipo" }));
    await expect(
      await canvas.findByText("La competición ya alcanzó su cupo de equipos."),
    ).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Aceptar e inscribir equipo" })).toBeEnabled();
  },
};

export const AlreadyEntered: Story = {
  name: "Ya inscrito",
  args: {
    state: {
      kind: "ready",
      preview: preview({
        existing: {
          entryId: "entry-1",
          status: "approved",
          teamId: "team-1",
          teamName: "Cóndor FC",
          createdAt: "2026-10-13T12:00:00.000Z",
        },
      }),
    },
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Ya inscribiste a Cóndor FC en esta competición.")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Ir a la competición" }));
    await expect(args.onOpenCompetition).toHaveBeenCalledWith("cmp-1");
  },
};

export const Revoked: Story = {
  name: "Enlace revocado",
  args: { state: { kind: "error", error: coded("competitions.entry_invitation_revoked") } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("No puedes usar esta invitación")).toBeVisible();
    await expect(canvas.getByText("El organizador desactivó esta invitación.")).toBeVisible();
  },
};

export const Loading: Story = {
  name: "Cargando",
  args: { state: { kind: "loading" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText("Cargando invitación")).toHaveAttribute("aria-busy", "true");
  },
};
