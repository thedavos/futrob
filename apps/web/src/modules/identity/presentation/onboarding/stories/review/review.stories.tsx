import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";

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
    await userEvent.click(canvas.getByRole("button", { name: "Continuar" }));
    await userEvent.type(await canvas.findByRole("textbox", { name: "Nombre del club" }), "Fera");
    await userEvent.click(canvas.getByRole("button", { name: "Buscar club" }));
    await userEvent.click(await canvas.findByRole("radio", { name: /Fera Enjaulada/ }));
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
    await userEvent.click(canvas.getByRole("button", { name: "Continuar" }));
    await userEvent.click(await canvas.findByRole("button", { name: "Omitir por ahora" }));
    await userEvent.click(await canvas.findByRole("button", { name: "Editar cuenta de juego" }));
    await expect(
      await canvas.findByRole("heading", { name: "Configura tus datos de juego" }),
    ).toBeVisible();
  },
};
