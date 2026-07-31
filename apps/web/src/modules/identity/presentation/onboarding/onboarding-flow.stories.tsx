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
    await userEvent.click(await canvas.findByRole("radio", { name: /Organizar/ }));
    await userEvent.click(canvas.getByRole("button", { name: "Continuar" }));
    await expect(
      await canvas.findByRole("heading", { name: "Crea tu organización" }),
    ).toBeVisible();
    await userEvent.type(
      canvas.getByRole("textbox", { name: "Nombre de la organización" }),
      "Liga Norte",
    );
    await userEvent.click(canvas.getByRole("button", { name: "Revisar organización" }));
    await expect(
      await canvas.findByRole("heading", { name: "Configura tu primera competición" }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Volver" }));
    await expect(
      await canvas.findByRole("heading", { name: "Crea tu organización" }),
    ).toBeVisible();
  },
};

export const OrganizationNameUnavailable: Story = {
  render: () => (
    <OnboardingStoryRouter
      gateway={createFakeOnboardingGateway({
        path: "organization",
        currentStep: "organization",
        organizationNameAvailable: false,
      })}
      initialPath="/onboarding/organization"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(
      await canvas.findByRole("textbox", { name: "Nombre de la organización" }),
      "Liga Norte",
    );
    await userEvent.click(canvas.getByRole("button", { name: "Revisar organización" }));
    await expect(await canvas.findByText("Ese nombre ya está en uso. Elige otro.")).toBeVisible();
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
    await userEvent.click(await canvas.findByRole("radio", { name: /Unirme/ }));
    await userEvent.click(canvas.getByRole("button", { name: "Continuar" }));
    await expect(
      await canvas.findByRole("heading", { name: "Únete a una competición" }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Continuar como jugador" }));
    await expect(
      await canvas.findByRole("heading", { name: "Configura tus datos de juego" }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Omitir por ahora" }));
    await expect(
      await canvas.findByRole("heading", { name: "Confirma tu configuración" }),
    ).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Entrar a mi espacio" })).toBeEnabled();
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
    await userEvent.click(await canvas.findByRole("radio", { name: /Empezar como jugador/ }));
    await userEvent.click(canvas.getByRole("button", { name: "Continuar" }));
    await expect(
      await canvas.findByRole("heading", { name: "Configura tus datos de juego" }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Omitir por ahora" }));
    await expect(
      await canvas.findByRole("heading", { name: "Confirma tu configuración" }),
    ).toBeVisible();
  },
};

export const ResumeLegacyGame: Story = {
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
      await canvas.findByRole("heading", { name: "Configura tus datos de juego" }),
    ).toBeVisible();
    await expect(canvas.getByRole("textbox", { name: "Identificador de EA" })).toHaveValue("");
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
        path: "invitation",
        currentStep: "competition",
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
    await userEvent.click(await canvas.findByRole("radio", { name: /Organizar/ }));
    await userEvent.click(canvas.getByRole("button", { name: "Continuar" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "No pudimos guardar tu progreso",
    );
  },
};

export const SavingProgress: Story = {
  render: () => (
    <OnboardingStoryRouter
      gateway={createFakeOnboardingGateway({ pendingSave: true })}
      initialPath="/onboarding/intention"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("radio", { name: /Organizar/ }));
    await userEvent.click(canvas.getByRole("button", { name: "Continuar" }));
    const action = canvas.getByRole("button", { name: "Continuar" });
    await expect(action).toHaveAttribute("aria-busy", "true");
    await expect(action).toBeDisabled();
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
    await userEvent.click(await canvas.findByRole("button", { name: "Entrar a mi espacio" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "No pudimos finalizar tu configuración",
    );
  },
};
