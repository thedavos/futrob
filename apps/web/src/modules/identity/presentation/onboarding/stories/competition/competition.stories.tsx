import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";

import {
  OnboardingStoryRouter,
  createFakeOnboardingGateway,
} from "../../onboarding-story-router.tsx";

const meta = {
  title: "Product/Onboarding/Competition",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <OnboardingStoryRouter
      gateway={createFakeOnboardingGateway({ path: "organization", currentStep: "competition" })}
      initialPath="/onboarding/competition"
    />
  ),
};

export const ValidationError: Story = {
  render: () => (
    <OnboardingStoryRouter
      gateway={createFakeOnboardingGateway({ path: "organization", currentStep: "competition" })}
      initialPath="/onboarding/competition"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Configurar cuenta" }));
    const name = canvas.getByRole("textbox", { name: "Nombre de la competición" });
    const error = canvas.getByText("Escribe el nombre de la competición.");
    await expect(error).toBeVisible();
    await expect(name).toHaveAttribute("aria-describedby", error.parentElement?.id);
    await expect(name).toHaveFocus();
  },
};
