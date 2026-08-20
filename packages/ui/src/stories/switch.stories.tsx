import type { Meta, StoryObj } from "@storybook/react-vite";

import { Field, FieldDescription, FieldError, FieldLabel } from "../components/field";
import { Form } from "../components/form";
import { Label } from "../components/label";
import { Switch } from "../components/switch";

const meta = {
  title: "Primitives/Switch",
  component: Switch,
  parameters: { layout: "centered" },
  args: {
    defaultChecked: false,
    disabled: false,
  },
  argTypes: {
    defaultChecked: { control: "boolean" },
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <label
      htmlFor="switch-playground"
      className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3"
    >
      <Switch id="switch-playground" {...args} />
      <span className="typo-label text-foreground">Publicar portal</span>
    </label>
  ),
};

export const States: Story = {
  render: () => (
    <div className="grid w-[min(22rem,calc(100vw-2rem))] gap-4 rounded-xl border border-border bg-surface p-6">
      <label className="flex items-center justify-between gap-3" htmlFor="switch-off">
        <span className="typo-label text-foreground">Desactivado</span>
        <Switch id="switch-off" />
      </label>
      <label className="flex items-center justify-between gap-3" htmlFor="switch-on">
        <span className="typo-label text-foreground">Activado</span>
        <Switch defaultChecked id="switch-on" />
      </label>
      <label className="flex items-center justify-between gap-3" htmlFor="switch-disabled">
        <span className="typo-label text-muted-foreground">Deshabilitado</span>
        <Switch disabled id="switch-disabled" />
      </label>
      <label className="flex items-center justify-between gap-3" htmlFor="switch-on-disabled">
        <span className="typo-label text-muted-foreground">Activado · deshabilitado</span>
        <Switch defaultChecked disabled id="switch-on-disabled" />
      </label>
      <label className="flex items-center justify-between gap-3" htmlFor="switch-invalid">
        <span className="typo-label text-foreground">Inválido</span>
        <Switch aria-invalid id="switch-invalid" />
      </label>
    </div>
  ),
};

export const WithLabel: Story = {
  render: () => (
    <div className="grid w-[min(22rem,calc(100vw-2rem))] gap-4 rounded-xl border border-border bg-surface p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="grid gap-1">
          <Label htmlFor="notify-captains">Avisar a capitanes</Label>
          <p className="typo-caption text-muted-foreground">
            Envía un aviso cuando se proponga un resultado.
          </p>
        </div>
        <Switch defaultChecked id="notify-captains" />
      </div>
    </div>
  ),
};

export const InForm: Story = {
  render: () => (
    <Form className="w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-border bg-surface p-6">
      <Field name="publishPortal">
        <div className="flex items-start justify-between gap-4">
          <div className="grid gap-1">
            <FieldLabel>Publicar portal</FieldLabel>
            <FieldDescription>
              El portal público solo muestra resultados oficiales aprobados.
            </FieldDescription>
          </div>
          <Switch name="publishPortal" />
        </div>
        <FieldError />
      </Field>
    </Form>
  ),
};
