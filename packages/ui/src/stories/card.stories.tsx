import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/card";
import { Button } from "../components/button";

const meta = {
  title: "Primitives/Card",
  component: Card,
  parameters: { layout: "centered" },
  args: {
    className: "w-[min(28rem,calc(100vw-2rem))]",
    variant: "flat",
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["flat", "elevated"],
      description: "flat = border only (default). elevated = smooth-shadow-ring-md (no border).",
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
        <p className="typo-body">FC 26 · PlayStation</p>
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
        <p className="typo-caption text-muted-foreground">
          El código se solicitará nuevamente si cierras esta página.
        </p>
      </CardContent>
      <CardFooter className="justify-end">
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
        <p className="typo-caption text-muted-foreground">
          Usa esta variante solo para entidades autónomas sobre fondo plano.
        </p>
      </CardContent>
      <CardFooter className="justify-end">
        <Button variant="outline">Volver</Button>
        <Button>Continuar</Button>
      </CardFooter>
    </Card>
  ),
};

export const Compare: Story = {
  parameters: { layout: "padded" },
  render: () => (
    <div className="grid w-[min(56rem,calc(100vw-2rem))] gap-8 sm:grid-cols-2">
      <Card variant="flat">
        <CardHeader>
          <CardTitle>flat</CardTitle>
          <CardDescription>Borde estructural · sin sombra.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="typo-body">Default del sistema. Listas, forms y paneles densos.</p>
        </CardContent>
      </Card>
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>elevated</CardTitle>
          <CardDescription>smooth-shadow-ring-sm · sin border.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="typo-body">Entidades autónomas sobre fondo plano (onboarding, resumen).</p>
        </CardContent>
      </Card>
    </div>
  ),
};
