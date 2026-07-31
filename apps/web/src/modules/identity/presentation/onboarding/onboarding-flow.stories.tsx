import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";

import { OnboardingStoryRouter, createFakeOnboardingGateway } from "./onboarding-story-router.tsx";

const meta = {
  title: "Product/Onboarding/Flow",
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

export const OrganizationPath: Story = {
  render: () => (
    <OnboardingStoryRouter
      gateway={createFakeOnboardingGateway()}
      initialPath="/onboarding/intention"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("radio", { name: /Organizar competiciones/ }));
    await userEvent.click(canvas.getByRole("button", { name: "Continuar" }));
    await expect(await canvas.findByRole("heading", { name: "Configura tu juego" })).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Omitir por ahora" }));
    await expect(
      await canvas.findByRole("heading", { name: "Confirma tu configuración" }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Volver" }));
    await expect(await canvas.findByRole("heading", { name: "Configura tu juego" })).toBeVisible();
  },
};

export const InvitationPath: Story = {
  render: () => (
    <OnboardingStoryRouter
      gateway={createFakeOnboardingGateway()}
      initialPath="/onboarding/intention"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("radio", { name: /Tengo una invitación/ }));
    await userEvent.click(canvas.getByRole("button", { name: "Continuar" }));
    await expect(
      await canvas.findByRole("heading", { name: "Prepara tu invitación" }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Omitir por ahora" }));
    await expect(
      await canvas.findByRole("heading", { name: "Confirma tu configuración" }),
    ).toBeVisible();
  },
};

export const PlayerPath: Story = {
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
    await expect(await canvas.findByRole("heading", { name: "Configura tu juego" })).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Omitir por ahora" }));
    await expect(
      await canvas.findByRole("heading", { name: "Vincula tu cuenta de juego" }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Omitir por ahora" }));
    await expect(
      await canvas.findByRole("heading", { name: "Confirma tu configuración" }),
    ).toBeVisible();
  },
};

export const ResumeGame: Story = {
  render: () => (
    <OnboardingStoryRouter
      gateway={createFakeOnboardingGateway({
        path: "organization",
        currentStep: "game",
      })}
      initialPath="/onboarding/intention"
    />
  ),
};

export const ResumeInvitation: Story = {
  render: () => (
    <OnboardingStoryRouter
      gateway={createFakeOnboardingGateway({
        path: "invitation",
        currentStep: "invitation",
      })}
      initialPath="/onboarding/intention"
    />
  ),
};

export const ResumeGameAccount: Story = {
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
    await expect(
      await canvas.findByRole("heading", { name: "Vincula tu cuenta de juego" }),
    ).toBeVisible();
    await expect(canvas.getByRole("textbox", { name: "Identificador de jugador" })).toHaveValue("");
  },
};

export const ResumeReview: Story = {
  render: () => (
    <OnboardingStoryRouter
      gateway={createFakeOnboardingGateway({
        path: "player",
        currentStep: "review",
      })}
      initialPath="/onboarding/intention"
    />
  ),
};

export const InvalidProgressFallsBack: Story = {
  render: () => (
    <OnboardingStoryRouter
      gateway={createFakeOnboardingGateway({
        path: "organization",
        currentStep: "game-account",
      })}
      initialPath="/onboarding/game-account"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("heading", { name: "¿Qué quieres hacer primero?" }),
    ).toBeVisible();
  },
};

export const SaveError: Story = {
  render: () => (
    <OnboardingStoryRouter
      gateway={createFakeOnboardingGateway({ failSave: true })}
      initialPath="/onboarding/intention"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("radio", { name: /Organizar competiciones/ }));
    await userEvent.click(canvas.getByRole("button", { name: "Continuar" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "No pudimos guardar tu progreso",
    );
  },
};

export const CompleteError: Story = {
  render: () => (
    <OnboardingStoryRouter
      gateway={createFakeOnboardingGateway({
        path: "player",
        currentStep: "review",
        failComplete: true,
      })}
      initialPath="/onboarding/review"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Finalizar" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "No pudimos finalizar tu configuración",
    );
  },
};
