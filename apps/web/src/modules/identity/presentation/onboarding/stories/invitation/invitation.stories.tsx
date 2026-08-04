import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  OnboardingStoryRouter,
  createFakeOnboardingGateway,
} from "../../onboarding-story-router.tsx";

const meta = {
  title: "Product/Onboarding/Invitation",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
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
