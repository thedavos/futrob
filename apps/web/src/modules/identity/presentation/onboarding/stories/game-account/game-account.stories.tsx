import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";

import {
  OnboardingStoryRouter,
  createFakeOnboardingGateway,
} from "../../onboarding-story-router.tsx";

const meta = {
  title: "Product/Onboarding/GameAccount",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <OnboardingStoryRouter
      gateway={createFakeOnboardingGateway({
        path: "player",
        currentStep: "game-account",
      })}
      initialPath="/onboarding/game-account"
    />
  ),
  play: async ({ canvasElement }) => {
    for (const platform of [
      "playstation",
      "xbox",
      "pc",
      "nintendo-switch-1",
      "nintendo-switch-2",
    ]) {
      await expect(
        canvasElement.querySelector(`[data-platform-logo="${platform}"]`),
      ).not.toBeNull();
    }
  },
};

export const ValidationError: Story = {
  render: () => (
    <OnboardingStoryRouter
      gateway={createFakeOnboardingGateway({
        path: "player",
        currentStep: "game-account",
      })}
      initialPath="/onboarding/game-account"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Vincular y continuar" }));
    const identifier = canvas.getByRole("textbox", { name: "Identificador de EA" });
    const error = canvas.getByText("Escribe tu identificador de EA.");
    await expect(error).toBeVisible();
    await expect(identifier).toHaveAttribute("aria-describedby", error.parentElement?.id);
    await expect(identifier).toHaveFocus();
  },
};
