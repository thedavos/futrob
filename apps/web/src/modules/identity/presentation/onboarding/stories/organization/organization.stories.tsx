import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";

import {
  OnboardingStoryRouter,
  createFakeOnboardingGateway,
} from "../../onboarding-story-router.tsx";

const meta = {
  title: "Product/Onboarding/Organization",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <OnboardingStoryRouter
      gateway={createFakeOnboardingGateway({ path: "organization", currentStep: "organization" })}
      initialPath="/onboarding/organization"
    />
  ),
};

export const Completed: Story = {
  render: () => (
    <OnboardingStoryRouter
      gateway={createFakeOnboardingGateway({ path: "organization", currentStep: "organization" })}
      initialPath="/onboarding/organization"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const name = await canvas.findByRole("textbox", { name: "Nombre de la organización" });
    await userEvent.type(name, "Liga Barranco");
    await expect(name).toHaveValue("Liga Barranco");
  },
};
