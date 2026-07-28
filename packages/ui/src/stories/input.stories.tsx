import type { Meta, StoryObj } from "@storybook/react-vite";
import { Eye, Lock, Mail, Search } from "lucide-react";

import { Field, FieldDescription, FieldError, FieldLabel } from "../components/field";
import { Input } from "../components/input";
import { InputWithIcon } from "../components/input-with-icon";
import { Label } from "../components/label";

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

export const WithIcons: Story = {
  render: () => (
    <div className="grid w-[min(24rem,calc(100vw-2rem))] gap-5">
      <Field name="search">
        <FieldLabel>Buscar encuentro</FieldLabel>
        <InputWithIcon icon={Search} placeholder="Equipo, jornada o rival" type="search" />
      </Field>
      <Field name="mail">
        <FieldLabel>Correo</FieldLabel>
        <InputWithIcon
          defaultValue="capitan@futrob.app"
          icon={Mail}
          placeholder="tu@correo.com"
          type="email"
        />
      </Field>
      <Field name="password">
        <FieldLabel>Contraseña</FieldLabel>
        <div className="relative">
          <InputWithIcon className="pr-9" defaultValue="••••••••" icon={Lock} type="password" />
          <button
            aria-label="Mostrar contraseña"
            className="absolute top-1/2 right-2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
            type="button"
          >
            <Eye aria-hidden="true" className="size-4" />
          </button>
        </div>
        <FieldDescription>Icono inicial decorativo y acción al final.</FieldDescription>
      </Field>
    </div>
  ),
};
