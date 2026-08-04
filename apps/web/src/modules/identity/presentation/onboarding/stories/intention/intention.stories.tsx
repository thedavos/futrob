import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";

import {
  OnboardingStoryRouter,
  createFakeOnboardingGateway,
} from "../../onboarding-story-router.tsx";

const meta = {
  title: "Product/Onboarding/Intention",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <OnboardingStoryRouter
      gateway={createFakeOnboardingGateway()}
      initialPath="/onboarding/intention"
    />
  ),
};

export const InvitationSelected: Story = {
  render: () => (
    <OnboardingStoryRouter
      gateway={createFakeOnboardingGateway()}
      initialPath="/onboarding/intention"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const invitation = await canvas.findByRole("radio", { name: /Unirme/ });
    await userEvent.click(invitation);
    await expect(invitation).toBeChecked();
  },
};
