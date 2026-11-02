import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, userEvent, within } from "storybook/test";

import { IdentityOnboardingClientError } from "@/modules/identity/presentation/identity-browser-client.ts";
import {
  OnboardingStoryRouter,
  createFakeOnboardingGateway,
} from "../../onboarding-story-router.tsx";

const meta = {
  title: "Product/Onboarding/Review",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const PendingData: Story = {
  render: () => (
    <OnboardingStoryRouter
      gateway={createFakeOnboardingGateway({ path: "player", currentStep: "review" })}
      initialPath="/onboarding/review"
    />
  ),
};

export const Complete: Story = {
  render: () => (
    <OnboardingStoryRouter
      gateway={createFakeOnboardingGateway()}
      initialPath="/onboarding/intention"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("radio", { name: /Empezar como jugador/ }));
    await userEvent.click(canvas.getByRole("button", { name: "Continuar" }));
    await userEvent.type(
      await canvas.findByRole("textbox", { name: "Identificador de EA" }),
      "gamer23",
    );
    await userEvent.click(await canvas.findByRole("radio", { name: "FC 26" }));
    await userEvent.click(canvas.getByRole("radio", { name: "Nintendo Switch 2" }));
    await userEvent.click(canvas.getByRole("button", { name: "Guardar y continuar" }));
    await userEvent.type(await canvas.findByRole("textbox", { name: "Nombre del club" }), "Fera");
    await userEvent.click(canvas.getByRole("button", { name: "Buscar club" }));
    await userEvent.click(await canvas.findByRole("button", { name: /Fera Enjaulada/ }));
    await userEvent.click(canvas.getByRole("button", { name: "Revisar club" }));
    await expect(
      await canvas.findByRole("heading", { name: "Confirma tu configuración" }),
    ).toBeVisible();
    await expect(canvas.getByText(/gamer23 · Nintendo Switch 2 · FC 26/)).toBeVisible();
    await expect(canvas.getByText(/Fera Enjaulada/)).toBeVisible();
  },
};

export const EditNavigation: Story = {
  render: () => (
    <OnboardingStoryRouter
      gateway={createFakeOnboardingGateway()}
      initialPath="/onboarding/intention"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("radio", { name: /Empezar como jugador/ }));
    await userEvent.click(canvas.getByRole("button", { name: "Continuar" }));
    await userEvent.type(
      await canvas.findByRole("textbox", { name: "Identificador de EA" }),
      "gamer23",
    );
    await userEvent.click(await canvas.findByRole("radio", { name: "FC 26" }));
    await userEvent.click(canvas.getByRole("radio", { name: "Nintendo Switch 2" }));
    await userEvent.click(canvas.getByRole("button", { name: "Guardar y continuar" }));
    await userEvent.click(await canvas.findByRole("button", { name: "Omitir por ahora" }));
    await userEvent.click(await canvas.findByRole("button", { name: "Editar cuenta de juego" }));
    await expect(
      await canvas.findByRole("heading", { name: "Configura tus datos de juego" }),
    ).toBeVisible();
  },
};

async function pickOption(canvas: ReturnType<typeof within>, combobox: string, option: string) {
  await userEvent.click(canvas.getByRole("combobox", { name: combobox }));
  await userEvent.click(await screen.findByRole("option", { name: option }));
}

/**
 * The plan catalog could not be read, so every format was offered; the API refuses the
 * Pro format with 402 and the review explains it instead of the generic failure.
 */
export const FormatNotInPlanError: Story = {
  render: () => (
    <OnboardingStoryRouter
      gateway={createFakeOnboardingGateway({
        plans: null,
        completeError: new IdentityOnboardingClientError(
          402,
          "competitions.format_not_in_plan",
          "2170e2f6-a47e-4338-83c3-27c054630800",
        ),
      })}
      initialPath="/onboarding/intention"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("radio", { name: /Organizar/ }));
    await userEvent.click(canvas.getByRole("button", { name: "Continuar" }));
    await userEvent.type(
      await canvas.findByRole("textbox", { name: "Nombre de la organización" }),
      "Liga Norte",
    );
    await userEvent.click(canvas.getByRole("button", { name: "Continuar a competición" }));
    await userEvent.type(
      await canvas.findByRole("textbox", { name: "Nombre de la competición" }),
      "Copa Grupos",
    );
    await userEvent.click(canvas.getByRole("radio", { name: "FC 26" }));
    await userEvent.click(canvas.getByRole("radio", { name: "PlayStation" }));
    await pickOption(canvas, "Región deportiva", "Sudamérica");
    await pickOption(canvas, "Zona horaria", "Lima · UTC-5");
    await pickOption(canvas, "Formato inicial", "Grupos + eliminación");
    await userEvent.click(canvas.getByRole("button", { name: "Configurar cuenta" }));
    await userEvent.click(await canvas.findByRole("button", { name: "Omitir por ahora" }));
    await expect(
      await canvas.findByRole("heading", { name: "Confirma tu configuración" }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Crear organización y competición" }));
    await expect(
      await canvas.findByText(
        /Tu organización empieza en el plan Gratis, que no incluye ese formato/,
      ),
    ).toBeVisible();
  },
};
