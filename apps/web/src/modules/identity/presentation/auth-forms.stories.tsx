import type { Meta, StoryObj } from "@storybook/react-vite";

import { AuthRouterDecorator } from "./auth-story-router.tsx";

const meta = {
  title: "Product/Auth",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Login: Story = {
  render: () => <AuthRouterDecorator initialPath="/login" />,
};

export const Signup: Story = {
  render: () => <AuthRouterDecorator initialPath="/signup" />,
};
