import type { Meta, StoryObj } from "@storybook/react-vite";
import * as stylex from "@stylexjs/stylex";
import { applyProps, Button, Card, CardContent } from "@futrob/ui";

import { OnboardingShell } from "../../onboarding-shell.tsx";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";

const styles = stylex.create({
  padMd: { padding: "1.5rem" },
  padLg: { padding: "2rem" },
  twoCol: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "1rem",
  },
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  full: { width: "100%" },
});

const steps = [
  { id: "intention", label: "Inicio" },
  { id: "game", label: "Juego" },
  { id: "review", label: "Confirmar" },
] as const;

const meta = {
  title: "Product/Onboarding/Shell",
  component: OnboardingShell,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <I18nProvider initialLocale="es" persistLocale={async () => undefined}>
        <Story />
      </I18nProvider>
    ),
  ],
  args: {
    steps,
    currentStepId: "game",
    title: "Configura tu juego",
    description: "Selecciona la edición y la plataforma donde competirás.",
    children: (
      <Card>
        <CardContent {...applyProps(undefined, undefined, styles.padMd)}>
          Contenido del paso
        </CardContent>
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
      <div {...applyProps(undefined, undefined, styles.twoCol)}>
        <Card>
          <CardContent {...applyProps(undefined, undefined, styles.padLg)}>Opción uno</CardContent>
        </Card>
        <Card>
          <CardContent {...applyProps(undefined, undefined, styles.padLg)}>Opción dos</CardContent>
        </Card>
      </div>
    ),
  },
};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
};

export const English: Story = {
  render: () => (
    <I18nProvider initialLocale="en" persistLocale={async () => undefined}>
      <OnboardingShell
        currentStepId="game"
        description="Choose the edition and platform where you compete."
        steps={[
          { id: "intention", label: "Start" },
          { id: "game", label: "Game" },
          { id: "review", label: "Confirm" },
        ]}
        title="Set up your game"
      >
        <Card>
          <CardContent {...applyProps(undefined, undefined, styles.padMd)}>
            Step content
          </CardContent>
        </Card>
      </OnboardingShell>
    </I18nProvider>
  ),
};

export const LongContent: Story = {
  args: {
    children: (
      <div {...applyProps(undefined, undefined, styles.stack)}>
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index}>
            <CardContent {...applyProps(undefined, undefined, styles.padMd)}>
              Sección {index + 1} con contenido suficiente para validar el crecimiento vertical.
            </CardContent>
          </Card>
        ))}
        <Button {...applyProps(undefined, undefined, styles.full)}>Continuar</Button>
      </div>
    ),
  },
};
