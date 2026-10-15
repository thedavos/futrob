import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import type { PublicEntryInvitationLinkDto } from "@futrob/api-contracts";
import { competitionPlatformLabel } from "../competition-draft-meta.ts";
import { CompetitionsClientError } from "../competitions-browser-client.ts";
import {
  EntryInvitationPublicView,
  type PublicEntryInvitationState,
} from "./entry-invitation-public-view.tsx";
import { withEntryInvitationRouter } from "./entry-invitation-story-router.tsx";

const REDIRECT_TO = "/entry-invitations/link/liga-8K2Mabcd";

const open: PublicEntryInvitationLinkDto = {
  state: "open",
  competition: {
    name: "Liga Interclubes",
    organizationName: "Liga Andina",
    platform: "nintendo-switch-2",
    gameEdition: "FC 26",
  },
};

const meta = {
  title: "Product/Competitions/Entry invitation/Sin cuenta",
  component: EntryInvitationPublicView,
  decorators: [withEntryInvitationRouter],
  parameters: { layout: "padded" },
  args: {
    state: { kind: "ready", link: open } satisfies PublicEntryInvitationState,
    redirectTo: REDIRECT_TO,
    platformLabel: competitionPlatformLabel,
    onRetry: fn(),
  },
  argTypes: {
    state: { control: false },
    platformLabel: { control: false },
  },
} satisfies Meta<typeof EntryInvitationPublicView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Open: Story = {
  name: "Invitación abierta",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("heading", { name: "Liga Interclubes" })).toBeVisible();
    await expect(canvas.getByText("Organiza Liga Andina")).toBeVisible();
    await expect(canvas.getByText("FC 26 · Nintendo Switch 2")).toBeVisible();
    const back = encodeURIComponent(REDIRECT_TO);
    await expect(canvas.getByRole("link", { name: "Crear cuenta y aceptar" })).toHaveAttribute(
      "href",
      `/signup?redirectTo=${back}`,
    );
    await expect(canvas.getByRole("link", { name: "Ya tengo cuenta" })).toHaveAttribute(
      "href",
      `/login?redirectTo=${back}`,
    );
  },
};

export const LongNames: Story = {
  name: "Nombres largos en ancho estrecho",
  args: {
    state: {
      kind: "ready",
      link: {
        state: "open",
        competition: {
          ...open.competition,
          name: "Copa Relámpago Interclubes de la Liga Sudamericana Clausura 2026",
          organizationName: "Asociación Andina de Clubes Virtuales y Esports",
        },
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "20rem" }}>
        <Story />
      </div>
    ),
  ],
};

export const Loading: Story = {
  name: "Cargando",
  args: { state: { kind: "loading" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByLabelText("Cargando invitación")).toHaveAttribute(
      "aria-busy",
      "true",
    );
    await expect(canvas.queryByRole("link", { name: "Crear cuenta y aceptar" })).toBeNull();
  },
};

export const Invalid: Story = {
  name: "Enlace no válido",
  args: { state: { kind: "ready", link: { state: "unavailable", reason: "invalid" } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("heading", { name: "Esta invitación ya no funciona" }),
    ).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Conocer Futrob" })).toHaveAttribute("href", "/");
    await expect(canvas.queryByRole("link", { name: "Crear cuenta y aceptar" })).toBeNull();
  },
};

export const Closed: Story = {
  name: "Inscripciones cerradas",
  args: { state: { kind: "ready", link: { state: "unavailable", reason: "closed" } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("heading", { name: "Las inscripciones están cerradas" }),
    ).toBeVisible();
    await expect(canvas.queryByRole("link", { name: "Crear cuenta y aceptar" })).toBeNull();
  },
};

export const RateLimited: Story = {
  name: "Error: demasiados intentos",
  args: { state: { kind: "error", error: new CompetitionsClientError(429, "api.rate_limited") } },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("heading", { name: "No pudimos cargar la invitación" }),
    ).toBeVisible();
    await expect(
      canvas.getByText("Demasiados intentos. Espera un momento y vuelve a intentarlo."),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Reintentar" }));
    await expect(args.onRetry).toHaveBeenCalledTimes(1);
  },
};

export const Unreachable: Story = {
  name: "Error: sin conexión",
  args: { state: { kind: "error", error: null } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText("Revisa tu conexión y vuelve a intentarlo."),
    ).toBeVisible();
  },
};
