import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { IdentityOnboardingClientError } from "@/modules/identity/presentation/identity-browser-client.ts";

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

export const Loading: Story = {
  render: () => (
    <OnboardingStoryRouter
      gateway={createFakeOnboardingGateway({
        path: "invitation",
        currentStep: "invitation",
        inspectInvitation: () => new Promise(() => undefined),
      })}
      initialPath="/onboarding/invitation"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(await canvas.findByLabelText("Código de invitación"), "invite-token");
    await userEvent.click(canvas.getByRole("button", { name: "Revisar invitación" }));
    await expect(canvas.getByRole("button", { name: "Revisar invitación" })).toBeDisabled();
    await expect(canvas.getByRole("button", { name: "Revisar invitación" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
  },
};

export const ExpiredError: Story = {
  render: () => (
    <OnboardingStoryRouter
      gateway={createFakeOnboardingGateway({
        path: "invitation",
        currentStep: "invitation",
        inspectError: new IdentityOnboardingClientError(
          400,
          "organizations.invitation_expired",
          "2170e2f6-a47e-4338-83c3-27c054630810",
        ),
      })}
      initialPath="/onboarding/invitation"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(await canvas.findByLabelText("Código de invitación"), "expired-token");
    await userEvent.click(canvas.getByRole("button", { name: "Revisar invitación" }));
    await expect(
      await canvas.findByText("La invitación ha caducado. Solicita una nueva al organizador."),
    ).toBeVisible();
    await expect(canvas.getByText("2170e2f6-a47e-4338-83c3-27c054630810")).toBeVisible();
  },
};

export const RateLimitedRetry: Story = {
  render: () => (
    <OnboardingStoryRouter
      gateway={createFakeOnboardingGateway({
        path: "invitation",
        currentStep: "invitation",
        inspectError: new IdentityOnboardingClientError(
          429,
          "api.rate_limited",
          "2170e2f6-a47e-4338-83c3-27c054630811",
          30,
        ),
      })}
      initialPath="/onboarding/invitation"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(await canvas.findByLabelText("Código de invitación"), "rate-token");
    await userEvent.click(canvas.getByRole("button", { name: "Revisar invitación" }));
    await expect(await canvas.findByText("Podrás reintentar en 30 s.")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Reintentar en 30 s" })).toBeDisabled();
  },
};

export const ValidPreview: Story = {
  render: () => (
    <OnboardingStoryRouter
      gateway={createFakeOnboardingGateway({ path: "invitation", currentStep: "invitation" })}
      initialPath="/onboarding/invitation"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(await canvas.findByLabelText("Código de invitación"), "valid-token");
    await userEvent.click(canvas.getByRole("button", { name: "Revisar invitación" }));
    await expect(
      await canvas.findByRole("heading", { name: "Configura tus datos de juego" }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Omitir por ahora" }));
    await expect(
      await canvas.findByRole("heading", { name: "Confirma tu configuración" }),
    ).toBeVisible();
    await expect(canvas.getByText("Liga invitante")).toBeVisible();
    await expect(canvas.getByText("Copa Invitación")).toBeVisible();
    await expect(canvas.getByText("Jugador")).toBeVisible();
  },
};
