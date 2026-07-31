import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";

import { OnboardingStoryRouter, createFakeOnboardingGateway } from "./onboarding-story-router.tsx";

const meta = {
  title: "Product/Onboarding/Steps",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: () => (
    <OnboardingStoryRouter
      gateway={createFakeOnboardingGateway()}
      initialPath="/onboarding/intention"
    />
  ),
};

export const Game: Story = {
  render: () => (
    <OnboardingStoryRouter
      gateway={createFakeOnboardingGateway({ path: "organization", currentStep: "game" })}
      initialPath="/onboarding/game"
    />
  ),
};

export const Invitation: Story = {
  render: () => (
    <OnboardingStoryRouter
      gateway={createFakeOnboardingGateway({
        path: "invitation",
        currentStep: "invitation",
      })}
      initialPath="/onboarding/invitation"
    />
  ),
};

export const GameAccount: Story = {
  render: () => (
    <OnboardingStoryRouter
      gateway={createFakeOnboardingGateway({
        path: "player",
        currentStep: "game-account",
      })}
      initialPath="/onboarding/game-account"
    />
  ),
};

export const ReviewWithPendingData: Story = {
  render: () => (
    <OnboardingStoryRouter
      gateway={createFakeOnboardingGateway({ path: "player", currentStep: "review" })}
      initialPath="/onboarding/review"
    />
  ),
};

export const ReviewComplete: Story = {
  render: () => (
    <OnboardingStoryRouter
      gateway={createFakeOnboardingGateway()}
      initialPath="/onboarding/intention"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("radio", { name: /Continuar como jugador/ }));
    await userEvent.click(canvas.getByRole("button", { name: "Continuar" }));
    await userEvent.click(await canvas.findByRole("radio", { name: "FC 25" }));
    await userEvent.click(canvas.getByRole("radio", { name: "PlayStation" }));
    await userEvent.click(canvas.getByRole("button", { name: "Continuar" }));
    await userEvent.type(
      await canvas.findByRole("textbox", { name: "Identificador de jugador" }),
      "gamer23",
    );
    await userEvent.click(canvas.getByRole("button", { name: "Continuar" }));
    await expect(
      await canvas.findByRole("heading", { name: "Confirma tu configuración" }),
    ).toBeVisible();
    await expect(canvas.getByText("gamer23")).toBeVisible();
  },
};
