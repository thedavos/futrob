import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";

import { OnboardingStoryRouter, createFakeOnboardingGateway } from "./onboarding-story-router.tsx";

const meta = {
  title: "Product/Onboarding/Steps",
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

export const IntentSelected: Story = {
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

export const Organization: Story = {
  render: () => (
    <OnboardingStoryRouter
      gateway={createFakeOnboardingGateway({ path: "organization", currentStep: "organization" })}
      initialPath="/onboarding/organization"
    />
  ),
};

export const OrganizationCompleted: Story = {
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

export const Invitation: Story = {
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

export const Competition: Story = {
  render: () => (
    <OnboardingStoryRouter
      gateway={createFakeOnboardingGateway({ path: "organization", currentStep: "competition" })}
      initialPath="/onboarding/competition"
    />
  ),
};

export const CompetitionValidationError: Story = {
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

export const GameAccount: Story = {
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

export const GameAccountValidationError: Story = {
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

export const TeamClubSearch: Story = {
  render: () => (
    <OnboardingStoryRouter
      gateway={createFakeOnboardingGateway({ path: "player", currentStep: "team" })}
      initialPath="/onboarding/team"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(await canvas.findByRole("textbox", { name: "Nombre del club" }), "Fera");
    await userEvent.click(canvas.getByRole("button", { name: "Buscar club" }));
    const club = await canvas.findByRole("radio", { name: /Fera Enjaulada/ });
    await userEvent.click(club);
    await expect(canvas.getByText("Seleccionado")).toBeVisible();
  },
};

export const TeamClubEmpty: Story = {
  render: () => (
    <OnboardingStoryRouter
      gateway={createFakeOnboardingGateway({
        path: "player",
        currentStep: "team",
        clubs: [],
      })}
      initialPath="/onboarding/team"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(await canvas.findByRole("textbox", { name: "Nombre del club" }), "zzz");
    await userEvent.click(canvas.getByRole("button", { name: "Buscar club" }));
    await expect(await canvas.findByText(/No encontramos clubs/)).toBeVisible();
  },
};

export const TeamClubSearchError: Story = {
  render: () => (
    <OnboardingStoryRouter
      gateway={createFakeOnboardingGateway({
        path: "player",
        currentStep: "team",
        searchError: true,
      })}
      initialPath="/onboarding/team"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(await canvas.findByRole("textbox", { name: "Nombre del club" }), "Fera");
    await userEvent.click(canvas.getByRole("button", { name: "Buscar club" }));
    await expect(
      await canvas.findByText("No pudimos buscar clubs. Inténtalo nuevamente."),
    ).toBeVisible();
  },
};

export const ReviewWithPendingData: Story = {
  render: () => (
    <OnboardingStoryRouter
      gateway={createFakeOnboardingGateway({ path: "player", currentStep: "review" })}
      initialPath="/onboarding/review"
    />
  ),
};

export const ReviewComplete: Story = {
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
    await userEvent.type(
      await canvas.findByRole("textbox", { name: "Identificador de EA" }),
      "gamer23",
    );
    await userEvent.click(await canvas.findByRole("radio", { name: "FC 26" }));
    await userEvent.click(canvas.getByRole("radio", { name: "Nintendo Switch 2" }));
    await userEvent.click(canvas.getByRole("button", { name: "Continuar" }));
    await userEvent.type(await canvas.findByRole("textbox", { name: "Nombre del club" }), "Fera");
    await userEvent.click(canvas.getByRole("button", { name: "Buscar club" }));
    await userEvent.click(await canvas.findByRole("radio", { name: /Fera Enjaulada/ }));
    await userEvent.click(canvas.getByRole("button", { name: "Revisar club" }));
    await expect(
      await canvas.findByRole("heading", { name: "Confirma tu configuración" }),
    ).toBeVisible();
    await expect(canvas.getByText(/gamer23 · Nintendo Switch 2 · FC 26/)).toBeVisible();
    await expect(canvas.getByText(/Fera Enjaulada/)).toBeVisible();
  },
};

export const ReviewEditNavigation: Story = {
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
    await userEvent.type(
      await canvas.findByRole("textbox", { name: "Identificador de EA" }),
      "gamer23",
    );
    await userEvent.click(await canvas.findByRole("radio", { name: "FC 27" }));
    await userEvent.click(canvas.getByRole("radio", { name: "Nintendo Switch 1" }));
    await userEvent.click(canvas.getByRole("button", { name: "Revisar cuenta" }));
    await userEvent.click(await canvas.findByRole("button", { name: "Editar cuenta de juego" }));
    await expect(
      await canvas.findByRole("heading", { name: "Configura tus datos de juego" }),
    ).toBeVisible();
  },
};
