import type { Meta, StoryObj } from "@storybook/react-vite";

import { Field, FieldDescription, FieldError, FieldLabel } from "../components/field.js";
import { Input } from "../components/input.js";
import { Label } from "../components/label.js";

const meta = {
  title: "Primitives/Input",
  component: Input,
  parameters: {
    layout: "centered",
  },
  args: {
    dense: false,
    disabled: false,
    placeholder: "Liga Metropolitana",
    type: "text",
  },
  argTypes: {
    dense: { control: "boolean" },
    disabled: { control: "boolean" },
    placeholder: { control: "text" },
    type: {
      control: "select",
      options: ["text", "email", "password", "search", "number", "url", "tel"],
    },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <div className="w-[min(24rem,calc(100vw-2rem))]">
      <Input {...args} />
    </div>
  ),
};

export const WithLabel: Story = {
  render: () => (
    <div className="grid w-[min(24rem,calc(100vw-2rem))] gap-2">
      <Label htmlFor="competition-name">Nombre de la competición</Label>
      <Input id="competition-name" placeholder="Liga Metropolitana" />
    </div>
  ),
};

export const Density: Story = {
  render: () => (
    <div className="grid w-[min(24rem,calc(100vw-2rem))] gap-5">
      <div className="grid gap-2">
        <p className="typo-label text-muted-foreground">Universal · 44 px</p>
        <Input placeholder="Buscar encuentro" />
      </div>
      <div className="grid gap-2">
        <p className="typo-label text-muted-foreground">Dense · 40 px en desktop</p>
        <Input dense placeholder="Filtrar filas" />
      </div>
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="grid w-[min(24rem,calc(100vw-2rem))] gap-5">
      <Field name="email">
        <FieldLabel>Correo</FieldLabel>
        <Input defaultValue="capitan@futrob.app" type="email" />
        <FieldDescription>Usaremos este correo para notificaciones.</FieldDescription>
      </Field>
      <Field name="disabled">
        <FieldLabel>Club vinculado</FieldLabel>
        <Input disabled defaultValue="FC Atlas Pro" />
      </Field>
      <Field invalid name="code">
        <FieldLabel>Código del equipo</FieldLabel>
        <Input aria-invalid="true" defaultValue="@@@" />
        <FieldError match>Usa entre 3 y 12 letras o números.</FieldError>
      </Field>
    </div>
  ),
};
