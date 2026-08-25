import type { Meta, StoryObj } from "@storybook/react-vite";
import * as stylex from "@stylexjs/stylex";
import { applyProps, applyStyles, typography } from "@futrob/ui";
import { colors } from "#styles/tokens.stylex";
import { media } from "#styles/media.stylex";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/card";
import { Button } from "../components/button";

const styles = stylex.create({
  playground: {
    width: "min(28rem, calc(100vw - 2rem))",
  },
  footerEnd: {
    justifyContent: "flex-end",
  },
  compare: {
    display: "grid",
    width: "min(56rem, calc(100vw - 2rem))",
    gap: "2rem",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "repeat(2, minmax(0, 1fr))",
    },
  },
  muted: { color: colors.mutedForeground },
});

const playground = applyStyles(styles.playground);

const meta = {
  title: "Primitives/Card",
  component: Card,
  parameters: { layout: "centered" },
  args: {
    className: playground.className,
    style: playground.style,
    variant: "flat",
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["flat", "elevated"],
      description: "flat = border only (default). elevated = StyleX elevation.md (no border).",
    },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <Card {...args}>
      <CardHeader>
        <CardTitle>Configuración de juego</CardTitle>
        <CardDescription>Preferencias que podrás modificar más adelante.</CardDescription>
      </CardHeader>
      <CardContent>
        <p {...applyProps(undefined, undefined, typography.body)}>FC 26 · PlayStation</p>
      </CardContent>
    </Card>
  ),
};

export const Flat: Story = {
  args: { variant: "flat" },
  render: (args) => (
    <Card {...args}>
      <CardHeader>
        <CardTitle>Invitación preparada</CardTitle>
        <CardDescription>Revisa los datos antes de continuar.</CardDescription>
      </CardHeader>
      <CardContent>
        <p {...applyProps(undefined, undefined, typography.caption, styles.muted)}>
          El código se solicitará nuevamente si cierras esta página.
        </p>
      </CardContent>
      <CardFooter {...applyProps(undefined, undefined, styles.footerEnd)}>
        <Button variant="outline">Volver</Button>
        <Button>Continuar</Button>
      </CardFooter>
    </Card>
  ),
};

export const Elevated: Story = {
  args: { variant: "elevated" },
  render: (args) => (
    <Card {...args}>
      <CardHeader>
        <CardTitle>Invitación preparada</CardTitle>
        <CardDescription>Elevación suave con ring embebido (sin border).</CardDescription>
      </CardHeader>
      <CardContent>
        <p {...applyProps(undefined, undefined, typography.caption, styles.muted)}>
          Usa esta variante solo para entidades autónomas sobre fondo plano.
        </p>
      </CardContent>
      <CardFooter {...applyProps(undefined, undefined, styles.footerEnd)}>
        <Button variant="outline">Volver</Button>
        <Button>Continuar</Button>
      </CardFooter>
    </Card>
  ),
};

export const Compare: Story = {
  parameters: { layout: "padded" },
  render: () => (
    <div {...applyProps(undefined, undefined, styles.compare)}>
      <Card variant="flat">
        <CardHeader>
          <CardTitle>flat</CardTitle>
          <CardDescription>Borde estructural · sin sombra.</CardDescription>
        </CardHeader>
        <CardContent>
          <p {...applyProps(undefined, undefined, typography.body)}>
            Default del sistema. Listas, forms y paneles densos.
          </p>
        </CardContent>
      </Card>
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>elevated</CardTitle>
          <CardDescription>elevation.sm · sin border.</CardDescription>
        </CardHeader>
        <CardContent>
          <p {...applyProps(undefined, undefined, typography.body)}>
            Entidades autónomas sobre fondo plano (onboarding, resumen).
          </p>
        </CardContent>
      </Card>
    </div>
  ),
};
