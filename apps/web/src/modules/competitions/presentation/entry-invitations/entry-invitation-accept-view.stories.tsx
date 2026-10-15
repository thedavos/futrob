import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import type { EntryInvitationPreviewDto } from "@futrob/api-contracts";
import { competitionPlatformLabel } from "../competition-draft-meta.ts";
import { CompetitionsClientError } from "../competitions-browser-client.ts";
import {
  EntryInvitationAcceptView,
  type EntryInvitationPreviewState,
} from "./entry-invitation-accept-view.tsx";
import { withEntryInvitationRouter } from "./entry-invitation-story-router.tsx";

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
    suggestedTeamNames: ["Cóndor FC"],
    existing: null,
    ...overrides,
  };
}

function coded(code: string): CompetitionsClientError {
  return new CompetitionsClientError(409, code);
}

const meta = {
  title: "Product/Competitions/Entry invitation/Con sesión",
  component: EntryInvitationAcceptView,
  decorators: [withEntryInvitationRouter],
  parameters: { layout: "padded" },
  args: {
    state: { kind: "ready", preview: preview() } satisfies EntryInvitationPreviewState,
    platformLabel: competitionPlatformLabel,
    onAccept: fn(async () => {}),
    onDecline: fn(async () => {}),
    onOpenCompetition: fn(),
    onRetry: fn(),
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

export const SeveralClubs: Story = {
  name: "Elegir entre varios clubes EA",
  args: {
    state: {
      kind: "ready",
      preview: preview({ suggestedTeamNames: ["Cóndor FC", "Fera Enjaulada", "Los Andes"] }),
    },
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const accept = canvas.getByRole("button", { name: "Aceptar e inscribir equipo" });
    for (const club of ["Cóndor FC", "Fera Enjaulada", "Los Andes", "Otro nombre"]) {
      await expect(canvas.getByRole("radio", { name: club })).not.toBeChecked();
    }
    await expect(canvas.queryByRole("textbox", { name: "Otro nombre" })).toBeNull();

    await userEvent.click(accept);
    await expect(canvas.getByText("Elige uno de tus clubes o escribe otro nombre.")).toBeVisible();
    await expect(args.onAccept).not.toHaveBeenCalled();

    await userEvent.click(canvas.getByRole("radio", { name: "Otro nombre" }));
    await userEvent.type(canvas.getByRole("textbox", { name: "Otro nombre" }), "Cóndores B");
    await userEvent.click(canvas.getByRole("radio", { name: "Fera Enjaulada" }));
    await expect(canvas.queryByRole("textbox", { name: "Otro nombre" })).toBeNull();
    await userEvent.click(accept);
    await waitFor(() => expect(args.onAccept).toHaveBeenCalledWith("Fera Enjaulada"));
  },
};

export const SeveralClubsOtherName: Story = {
  name: "Varios clubes: otro nombre",
  args: SeveralClubs.args,
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("radio", { name: "Otro nombre" }));
    await userEvent.type(canvas.getByRole("textbox", { name: "Otro nombre" }), "  Cóndores B ");
    await userEvent.click(canvas.getByRole("button", { name: "Aceptar e inscribir equipo" }));
    await waitFor(() => expect(args.onAccept).toHaveBeenCalledWith("Cóndores B"));
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
        suggestedTeamNames: [],
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
    await expect(
      canvas.getByRole("heading", { name: "Esta invitación ya no funciona" }),
    ).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Ir a mi espacio" })).toHaveAttribute(
      "href",
      "/player",
    );
    await expect(canvas.queryByRole("textbox", { name: "Nombre de tu equipo" })).toBeNull();
  },
};

export const Expired: Story = {
  name: "Invitación caducada",
  args: { state: { kind: "error", error: coded("competitions.entry_invitation_expired") } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: "Esta invitación caducó" })).toBeVisible();
  },
};

export const ForAnotherPlayer: Story = {
  name: "Invitación de otro jugador",
  args: { state: { kind: "error", error: coded("competitions.entry_invitation_forbidden") } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: "Esta invitación es para otro jugador" }),
    ).toBeVisible();
  },
};

export const RegistrationClosed: Story = {
  name: "Inscripciones cerradas",
  args: { state: { kind: "error", error: coded("competitions.not_editable") } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: "Las inscripciones están cerradas" }),
    ).toBeVisible();
  },
};

export const AlreadyAnswered: Story = {
  name: "Invitación ya respondida",
  args: {
    state: { kind: "error", error: coded("competitions.entry_invitation_already_decided") },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: "Ya respondiste esta invitación" }),
    ).toBeVisible();
  },
};

export const LoadFailed: Story = {
  name: "Error al cargar",
  args: { state: { kind: "error", error: coded("api.rate_limited") } },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: "No pudimos cargar la invitación" }),
    ).toBeVisible();
    await expect(
      canvas.getByText("Demasiados intentos. Espera un momento y vuelve a intentarlo."),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Reintentar" }));
    await expect(args.onRetry).toHaveBeenCalledTimes(1);
  },
};

export const LoadFailedOffline: Story = {
  name: "Error al cargar: sin conexión",
  args: { state: { kind: "error", error: null } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Revisa tu conexión y vuelve a intentarlo.")).toBeVisible();
    await expect(canvas.queryByText("No puedes usar esta invitación")).toBeNull();
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
