import type { Meta, StoryObj } from "@storybook/react-vite";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "../components/alert";

const meta = {
  title: "Primitives/Alert",
  component: Alert,
  parameters: { layout: "centered" },
  args: {
    className: "w-[min(28rem,calc(100vw-2rem))]",
    elevation: "flat",
    variant: "default",
  },
  argTypes: {
    elevation: {
      control: "select",
      options: ["flat", "elevated"],
    },
    variant: {
      control: "select",
      options: ["default", "info", "success", "warning", "destructive"],
    },
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <Alert {...args}>
      <Info />
      <AlertTitle>Sincronización pendiente</AlertTitle>
      <AlertDescription>
        Los partidos de EA todavía no se han sincronizado para esta jornada.
      </AlertDescription>
    </Alert>
  ),
};

export const ClosedVariants: Story = {
  render: () => (
    <div className="grid w-[min(28rem,calc(100vw-2rem))] gap-4">
      <Alert variant="default">
        <Info />
        <AlertTitle>Aviso</AlertTitle>
        <AlertDescription>Revisa la configuración antes de publicar.</AlertDescription>
      </Alert>
      <Alert variant="info">
        <Info />
        <AlertTitle>Sincronización</AlertTitle>
        <AlertDescription>La cola de sync está activa.</AlertDescription>
      </Alert>
      <Alert variant="success">
        <CircleCheck />
        <AlertTitle>Resultado aprobado</AlertTitle>
        <AlertDescription>El marcador ya alimenta estadísticas oficiales.</AlertDescription>
      </Alert>
      <Alert variant="warning">
        <TriangleAlert />
        <AlertTitle>Datos incompletos</AlertTitle>
        <AlertDescription>Dos jugadores todavía no vincularon su cuenta.</AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <CircleAlert />
        <AlertTitle>Disputa abierta</AlertTitle>
        <AlertDescription>
          El staff debe resolver el conflicto antes de oficializar.
        </AlertDescription>
      </Alert>
    </div>
  ),
};

export const Elevation: Story = {
  render: () => (
    <div className="grid w-[min(40rem,calc(100vw-2rem))] gap-6 sm:grid-cols-2">
      <Alert elevation="flat" variant="warning">
        <TriangleAlert />
        <AlertTitle>flat</AlertTitle>
        <AlertDescription>Borde semántico · alerts inline en forms.</AlertDescription>
      </Alert>
      <Alert elevation="elevated" variant="warning">
        <TriangleAlert />
        <AlertTitle>elevated</AlertTitle>
        <AlertDescription>smooth-shadow-ring-md · panel aislado.</AlertDescription>
      </Alert>
    </div>
  ),
};
