import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";

import {
  OnboardingStoryRouter,
  createFakeOnboardingGateway,
  storyExternalClubs,
} from "../../onboarding-story-router.tsx";

const meta = {
  title: "Product/Onboarding/Club",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

async function searchClubs(canvas: ReturnType<typeof within>, query = "Fera") {
  await userEvent.type(await canvas.findByRole("textbox", { name: "Nombre del club" }), query);
  await userEvent.click(canvas.getByRole("button", { name: "Buscar club" }));
}

export const Default: Story = {
  render: () => (
    <OnboardingStoryRouter
      gateway={createFakeOnboardingGateway({ path: "player", currentStep: "club" })}
      initialPath="/onboarding/club"
    />
  ),
};

export const OneClubFound: Story = {
  render: () => (
    <OnboardingStoryRouter
      gateway={createFakeOnboardingGateway({
        path: "player",
        currentStep: "club",
        clubs: storyExternalClubs(1),
      })}
      initialPath="/onboarding/club"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await searchClubs(canvas);
    const clubs = await canvas.findAllByRole("radio", { name: /Fera/ });
    await expect(clubs).toHaveLength(1);
    await expect(await canvas.findByText("1 club encontrado.")).toBeVisible();
  },
};

export const TwoClubsFound: Story = {
  render: () => (
    <OnboardingStoryRouter
      gateway={createFakeOnboardingGateway({
        path: "player",
        currentStep: "club",
        clubs: storyExternalClubs(2),
      })}
      initialPath="/onboarding/club"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await searchClubs(canvas);
    const clubs = await canvas.findAllByRole("radio", { name: /Fera/ });
    await expect(clubs).toHaveLength(2);
    await expect(await canvas.findByText("2 clubs encontrados.")).toBeVisible();
  },
};

export const ThreeClubsFound: Story = {
  render: () => (
    <OnboardingStoryRouter
      gateway={createFakeOnboardingGateway({
        path: "player",
        currentStep: "club",
        clubs: storyExternalClubs(3),
      })}
      initialPath="/onboarding/club"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await searchClubs(canvas);
    const clubs = await canvas.findAllByRole("radio", { name: /Fera/ });
    await expect(clubs).toHaveLength(3);
    await expect(await canvas.findByText("3 clubs encontrados.")).toBeVisible();
  },
};

export const SelectClub: Story = {
  render: () => (
    <OnboardingStoryRouter
      gateway={createFakeOnboardingGateway({
        path: "player",
        currentStep: "club",
        clubs: storyExternalClubs(3),
      })}
      initialPath="/onboarding/club"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await searchClubs(canvas);
    const club = await canvas.findByRole("radio", { name: /Fera Enjaulada/ });
    await userEvent.click(club);
    await expect(club).toHaveAttribute("aria-checked", "true");
  },
};

export const Empty: Story = {
  render: () => (
    <OnboardingStoryRouter
      gateway={createFakeOnboardingGateway({
        path: "player",
        currentStep: "club",
        clubs: [],
      })}
      initialPath="/onboarding/club"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await searchClubs(canvas, "zzz");
    await expect(await canvas.findByText(/No encontramos clubs/)).toBeVisible();
  },
};

export const SearchError: Story = {
  render: () => (
    <OnboardingStoryRouter
      gateway={createFakeOnboardingGateway({
        path: "player",
        currentStep: "club",
        searchError: true,
      })}
      initialPath="/onboarding/club"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await searchClubs(canvas);
    await expect(
      await canvas.findByText("No pudimos buscar clubs. Inténtalo nuevamente."),
    ).toBeVisible();
  },
};
