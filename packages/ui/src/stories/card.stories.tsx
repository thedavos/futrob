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

export const Sections: Story = {
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
