import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, Card, CardContent } from "@futrob/ui";

import { OnboardingShell } from "./onboarding-shell.tsx";

const steps = [
  { id: "intention", label: "Intención" },
  { id: "game", label: "Juego" },
  { id: "review", label: "Confirmar" },
] as const;

const meta = {
  title: "Product/Onboarding/Shell",
  component: OnboardingShell,
  parameters: { layout: "fullscreen" },
  args: {
    steps,
    currentStepId: "game",
    title: "Configura tu juego",
    description: "Selecciona la edición y la plataforma donde competirás.",
    children: (
      <Card>
        <CardContent className="p-6">Contenido del paso</CardContent>
      </Card>
    ),
  },
} satisfies Meta<typeof OnboardingShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Desktop: Story = {
  args: {
    children: (
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-8">Opción uno</CardContent>
        </Card>
        <Card>
          <CardContent className="p-8">Opción dos</CardContent>
        </Card>
      </div>
    ),
  },
};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
};

export const LongContent: Story = {
  args: {
    children: (
      <div className="space-y-6">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              Sección {index + 1} con contenido suficiente para validar el crecimiento vertical.
            </CardContent>
          </Card>
        ))}
        <Button className="w-full">Continuar</Button>
      </div>
    ),
  },
};
