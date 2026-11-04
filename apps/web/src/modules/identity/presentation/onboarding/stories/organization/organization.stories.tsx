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

export const MainFlow: Story = {
  render: Default.render,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(
      await canvas.findByRole("textbox", { name: "Nombre de la organización" }),
      "Liga Lima",
    );
    await expect(canvas.getAllByRole("listitem")).toHaveLength(3);
    await userEvent.click(canvas.getByRole("button", { name: "Continuar" }));
    await expect(
      await canvas.findByRole("heading", { name: "Confirma tu configuración" }),
    ).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Editar cuenta de juego" })).toBeNull();
    await userEvent.click(canvas.getByRole("button", { name: "Crear organización" }));
    await expect(await canvas.findByText("Organización", { selector: "main" })).toBeVisible();
  },
};

export const OptionalAccount: Story = {
  render: Default.render,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(
      await canvas.findByRole("textbox", { name: "Nombre de la organización" }),
      "Liga Lima",
    );
    await userEvent.click(canvas.getByRole("button", { name: "Crea tu cuenta" }));
    await expect(
      await canvas.findByRole("heading", { name: "Configura tus datos de juego" }),
    ).toBeVisible();
    await expect(canvas.getAllByRole("listitem")).toHaveLength(4);
    await expect(canvas.getByRole("listitem", { current: "step" })).toHaveTextContent("Cuenta");
    await userEvent.type(canvas.getByRole("textbox", { name: "Identificador de EA" }), "Gamer23");
    await userEvent.click(canvas.getByRole("radio", { name: "PlayStation" }));
    await userEvent.click(canvas.getByRole("radio", { name: "FC 26" }));
    await userEvent.click(canvas.getByRole("button", { name: "Guardar y revisar" }));
    await expect(await canvas.findByText("Gamer23 · PlayStation · FC 26")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Editar cuenta de juego" }));
    await expect(await canvas.findByRole("textbox", { name: "Identificador de EA" })).toHaveValue(
      "Gamer23",
    );
    await userEvent.click(canvas.getByRole("button", { name: "Volver" }));
    await expect(
      await canvas.findByRole("textbox", { name: "Nombre de la organización" }),
    ).toHaveValue("Liga Lima");
    await userEvent.click(canvas.getByRole("button", { name: "Continuar" }));
    await expect(
      await canvas.findByRole("heading", { name: "Confirma tu configuración" }),
    ).toBeVisible();
    await expect(canvas.getAllByRole("listitem")).toHaveLength(3);
  },
};
