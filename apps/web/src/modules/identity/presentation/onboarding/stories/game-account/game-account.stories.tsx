import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import {
  OnboardingStoryRouter,
  createFakeOnboardingGateway,
} from "../../onboarding-story-router.tsx";

const meta = {
  title: "Product/Onboarding/Game account",
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
    await userEvent.click(await canvas.findByRole("radio", { name: "PlayStation" }));
    await userEvent.click(canvas.getByRole("button", { name: "Guardar y continuar" }));
    const identifier = canvas.getByRole("textbox", { name: "Identificador de EA" });
    const error = await waitFor(() => {
      const message = canvas.getByText("Escribe tu identificador de EA.");
      expect(message).toBeVisible();
      return message;
    });
    await expect(identifier).toHaveAttribute("aria-describedby", error.parentElement?.id);
    await expect(identifier).toHaveFocus();
  },
};

/** Nothing typed: saving is disabled and «Omitir por ahora» is the way forward. */
export const EmptyCta: Story = {
  render: () => (
    <OnboardingStoryRouter
      gateway={createFakeOnboardingGateway({ path: "organization", currentStep: "game-account" })}
      initialPath="/onboarding/game-account"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("button", { name: "Guardar y revisar" })).toBeDisabled();
    await expect(canvas.getByRole("button", { name: "Omitir por ahora" })).toBeEnabled();
  },
};

/** Declared identity typed: the primary action saves it; nothing is verified (DEC-073). */
export const FilledCta: Story = {
  render: () => (
    <OnboardingStoryRouter
      gateway={createFakeOnboardingGateway({ path: "organization", currentStep: "game-account" })}
      initialPath="/onboarding/game-account"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(
      await canvas.findByRole("textbox", { name: "Identificador de EA" }),
      "Gamer23",
    );
    await userEvent.click(canvas.getByRole("radio", { name: "PlayStation" }));
    await userEvent.click(canvas.getByRole("radio", { name: "FC 26" }));
    await expect(canvas.getByRole("button", { name: "Guardar y revisar" })).toBeEnabled();
  },
};
