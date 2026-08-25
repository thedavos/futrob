import type { Meta, StoryObj } from "@storybook/react-vite";
import * as stylex from "@stylexjs/stylex";
import { applyHost, typography } from "@futrob/ui";
import { colors } from "#styles/tokens.stylex";

import { Field, FieldDescription, FieldError, FieldLabel } from "../components/field";
import { Input } from "../components/input";
import { Label } from "../components/label";

const styles = stylex.create({
  field: {
    width: "min(24rem, calc(100vw - 2rem))",
  },
  labeled: {
    display: "grid",
    width: "min(24rem, calc(100vw - 2rem))",
    gap: "0.5rem",
  },
  stack: {
    display: "grid",
    width: "min(24rem, calc(100vw - 2rem))",
    gap: "1.25rem",
  },
  group: {
    display: "grid",
    gap: "0.5rem",
  },
  muted: { color: colors.mutedForeground },
});

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
    <div {...applyHost(undefined, undefined, styles.field)}>
      <Input {...args} />
    </div>
  ),
};

export const WithLabel: Story = {
  render: () => (
    <div {...applyHost(undefined, undefined, styles.labeled)}>
      <Label htmlFor="competition-name">Nombre de la competición</Label>
      <Input id="competition-name" placeholder="Liga Metropolitana" />
    </div>
  ),
};

export const Density: Story = {
  render: () => (
    <div {...applyHost(undefined, undefined, styles.stack)}>
      <div {...applyHost(undefined, undefined, styles.group)}>
        <p {...applyHost(undefined, undefined, typography.label, styles.muted)}>
          Universal · 44 px
        </p>
        <Input placeholder="Buscar encuentro" />
      </div>
      <div {...applyHost(undefined, undefined, styles.group)}>
        <p {...applyHost(undefined, undefined, typography.label, styles.muted)}>
          Dense · 36 px en desktop
        </p>
        <Input dense placeholder="Filtrar filas" />
      </div>
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div {...applyHost(undefined, undefined, styles.stack)}>
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
